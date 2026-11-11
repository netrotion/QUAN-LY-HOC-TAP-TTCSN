package vn.haui.advisor.ai.rag.search;

import org.apache.lucene.analysis.Analyzer;
import org.apache.lucene.analysis.TokenStream;
import org.apache.lucene.analysis.core.LowerCaseFilter;
import org.apache.lucene.analysis.miscellaneous.ASCIIFoldingFilter;
import org.apache.lucene.analysis.standard.StandardTokenizer;
import org.apache.lucene.document.Document;
import org.apache.lucene.document.Field;
import org.apache.lucene.document.StringField;
import org.apache.lucene.document.TextField;
import org.apache.lucene.index.DirectoryReader;
import org.apache.lucene.index.IndexWriter;
import org.apache.lucene.index.IndexWriterConfig;
import org.apache.lucene.queryparser.classic.MultiFieldQueryParser;
import org.apache.lucene.queryparser.classic.QueryParser;
import org.apache.lucene.search.IndexSearcher;
import org.apache.lucene.search.Query;
import org.apache.lucene.search.ScoreDoc;
import org.apache.lucene.search.TopDocs;
import org.apache.lucene.search.similarities.BM25Similarity;
import org.apache.lucene.store.ByteBuffersDirectory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import vn.haui.advisor.ai.rag.model.RagChunk;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.locks.ReentrantReadWriteLock;

/**
 * Bộ máy tìm kiếm từ vựng Lucene BM25 nhúng trong bộ nhớ với khả năng chuẩn hóa dấu tiếng Việt (Diacritic Folding).
 * Bù đắp điểm mù của Dense Vector đối với các số hiệu văn bản chính xác như "Điều 14 Khoản 2", "F23-006".
 */
@Component
public class LuceneLexicalSearcher implements AutoCloseable {

    private static final Logger log = LoggerFactory.getLogger(LuceneLexicalSearcher.class);

    private static final String FIELD_CHUNK_ID = "chunkId";
    private static final String FIELD_SOURCE_ID = "sourceId";
    private static final String FIELD_SECTION = "section";
    private static final String FIELD_TITLE = "title";
    private static final String FIELD_CONTENT = "content";

    private static final Map<String, Float> FIELD_BOOSTS = Map.of(
            FIELD_SECTION, 3.5f,
            FIELD_TITLE, 2.0f,
            FIELD_CHUNK_ID, 2.5f,
            FIELD_CONTENT, 1.0f
    );

    private final ByteBuffersDirectory directory = new ByteBuffersDirectory();
    private final Analyzer analyzer;
    private final ReentrantReadWriteLock rwLock = new ReentrantReadWriteLock();

    private DirectoryReader directoryReader;
    private IndexSearcher indexSearcher;

    public LuceneLexicalSearcher() {
        this.analyzer = new Analyzer() {
            @Override
            protected TokenStreamComponents createComponents(String fieldName) {
                StandardTokenizer tokenizer = new StandardTokenizer();
                TokenStream filter = new LowerCaseFilter(tokenizer);
                filter = new ASCIIFoldingFilter(filter);
                return new TokenStreamComponents(tokenizer, filter);
            }
        };
    }

    /**
     * Lập chỉ mục danh sách RagChunk vào bộ nhớ BM25.
     *
     * @param chunks danh sách đoạn quy chế
     */
    public void indexChunks(Collection<RagChunk> chunks) {
        if (chunks == null || chunks.isEmpty()) {
            return;
        }

        rwLock.writeLock().lock();
        try {
            IndexWriterConfig config = new IndexWriterConfig(analyzer);
            config.setOpenMode(IndexWriterConfig.OpenMode.CREATE);
            config.setSimilarity(new BM25Similarity());

            try (IndexWriter writer = new IndexWriter(directory, config)) {
                for (RagChunk chunk : chunks) {
                    Document doc = new Document();
                    doc.add(new StringField(FIELD_CHUNK_ID, chunk.getChunkId(), Field.Store.YES));
                    doc.add(new StringField(FIELD_SOURCE_ID, chunk.getSourceId() != null ? chunk.getSourceId() : "", Field.Store.YES));
                    doc.add(new TextField(FIELD_SECTION, chunk.getSection() != null ? chunk.getSection() : "", Field.Store.YES));
                    doc.add(new TextField(FIELD_TITLE, chunk.getTitle() != null ? chunk.getTitle() : "", Field.Store.YES));
                    doc.add(new TextField(FIELD_CONTENT, chunk.getContent() != null ? chunk.getContent() : "", Field.Store.YES));
                    writer.addDocument(doc);
                }
                writer.commit();
            }

            if (directoryReader != null) {
                directoryReader.close();
            }
            directoryReader = DirectoryReader.open(directory);
            indexSearcher = new IndexSearcher(directoryReader);
            indexSearcher.setSimilarity(new BM25Similarity());

            log.info("Indexed {} chunks into in-memory Lucene BM25 index", chunks.size());
        } catch (IOException e) {
            log.error("Failed to index chunks into Lucene BM25", e);
            throw new IllegalStateException("Failed to index chunks into Lucene", e);
        } finally {
            rwLock.writeLock().unlock();
        }
    }

    /**
     * Tìm kiếm từ vựng BM25 đa trường có áp dụng diacritic folding và field boosting.
     *
     * @param query truy vấn văn bản
     * @param topK  số lượng kết quả tối đa
     * @return danh sách LexicalHit sắp xếp theo BM25 score giảm dần
     */
    public List<LexicalHit> search(String query, int topK) {
        if (query == null || query.isBlank() || topK <= 0) {
            return Collections.emptyList();
        }

        rwLock.readLock().lock();
        try {
            if (indexSearcher == null || directoryReader == null) {
                return Collections.emptyList();
            }

            String escaped = QueryParser.escape(query.trim());
            if (escaped.isBlank()) {
                return Collections.emptyList();
            }

            MultiFieldQueryParser parser = new MultiFieldQueryParser(
                    new String[]{FIELD_SECTION, FIELD_TITLE, FIELD_CHUNK_ID, FIELD_CONTENT},
                    analyzer,
                    FIELD_BOOSTS
            );
            parser.setDefaultOperator(QueryParser.Operator.OR);

            Query luceneQuery;
            try {
                luceneQuery = parser.parse(escaped);
            } catch (Exception e) {
                log.warn("Failed to parse query '{}', falling back to fuzzy term matching", query, e);
                return Collections.emptyList();
            }

            TopDocs topDocs = indexSearcher.search(luceneQuery, topK);
            List<LexicalHit> hits = new ArrayList<>(topDocs.scoreDocs.length);

            for (ScoreDoc scoreDoc : topDocs.scoreDocs) {
                Document doc = indexSearcher.doc(scoreDoc.doc);
                hits.add(new LexicalHit(
                        doc.get(FIELD_CHUNK_ID),
                        scoreDoc.score,
                        doc.get(FIELD_SECTION),
                        doc.get(FIELD_TITLE),
                        doc.get(FIELD_CONTENT)
                ));
            }

            return Collections.unmodifiableList(hits);
        } catch (IOException e) {
            log.error("Error executing Lucene BM25 search for query '{}'", query, e);
            return Collections.emptyList();
        } finally {
            rwLock.readLock().unlock();
        }
    }

    @Override
    public void close() {
        rwLock.writeLock().lock();
        try {
            if (directoryReader != null) {
                directoryReader.close();
            }
            directory.close();
            analyzer.close();
        } catch (IOException e) {
            log.warn("Error closing Lucene resources", e);
        } finally {
            rwLock.writeLock().unlock();
        }
    }
}

