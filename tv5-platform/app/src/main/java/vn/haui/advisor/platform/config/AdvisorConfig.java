package vn.haui.advisor.platform.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import vn.haui.advisor.ai.config.AiMode;
import vn.haui.advisor.ai.config.AiProperties;
import vn.haui.advisor.ai.conversation.ConversationHistoryManager;
import vn.haui.advisor.ai.grounding.ResponseGroundingValidator;
import vn.haui.advisor.ai.intent.IntentClassifier;
import vn.haui.advisor.ai.model.AdvisorModel;
import vn.haui.advisor.ai.model.LiveAdvisorModel;
import vn.haui.advisor.ai.model.MockAdvisorModel;
import vn.haui.advisor.ai.rag.embedding.DeterministicFakeEmbeddingProvider;
import vn.haui.advisor.ai.rag.embedding.EmbeddingProvider;
import vn.haui.advisor.ai.rag.embedding.LiveEmbeddingProvider;
import vn.haui.advisor.ai.rag.grounding.CitationGrounder;
import vn.haui.advisor.ai.rag.grounding.EvidenceValidator;
import vn.haui.advisor.ai.rag.ingestion.MarkdownDocumentReader;
import vn.haui.advisor.ai.rag.ingestion.RagCatalogReader;
import vn.haui.advisor.ai.rag.ingestion.RagIngestionService;
import vn.haui.advisor.ai.rag.ingestion.SemanticChunker;
import vn.haui.advisor.ai.rag.retrieval.RagRetriever;
import vn.haui.advisor.ai.rag.retrieval.VietnameseQueryNormalizer;
import vn.haui.advisor.ai.rag.service.RagAdvisorService;
import vn.haui.advisor.ai.rag.vector.InMemoryVectorStore;
import vn.haui.advisor.ai.service.DefaultAdvisorFacade;
import vn.haui.advisor.ai.tools.DefaultToolAdapter;
import vn.haui.advisor.contracts.ports.AcademicFacade;
import vn.haui.advisor.contracts.ports.AdvisorFacade;
import vn.haui.advisor.platform.advisor.AdvisorReadiness;
import vn.haui.advisor.platform.conversation.ConversationTurns;

import java.nio.file.Path;
import java.time.Clock;
import java.util.Arrays;
import java.util.Set;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Composition root của trợ lý AI (Task 4.3b): nối AdvisorFacade của module AI (TV1) với AcademicFacade thật, hội thoại trên
 * DB (qua lượt chat của platform) và RAG. Dựng tường minh thay vì nạp AiAutoConfiguration để runtime không bao giờ có
 * MockAcademicFacade, và MockAdvisorModel chỉ có ở profile dev/test.
 *
 * Thiếu khóa API (ai.model.api-key = GEMINI_API_KEY) không chặn khởi động: Chat trả 503 AI_UNAVAILABLE, các chức năng khác
 * chạy bình thường. Chỉ mục RAG lập ở lần hỏi đầu tiên, không lúc khởi động.
 */
@Configuration
@EnableConfigurationProperties({AiProperties.class, AdvisorProperties.class})
public class AdvisorConfig {

    private static final Set<String> MOCK_PROFILES = Set.of("dev", "test");

    @Bean
    public AdvisorReadiness advisorReadiness(AiProperties ai, AdvisorProperties properties, Environment environment) {
        if (ai.getMode() == AiMode.MOCK && Arrays.stream(environment.getActiveProfiles()).noneMatch(MOCK_PROFILES::contains)) {
            throw new IllegalStateException("ai.mode=mock (mô hình trả lời thử) chỉ dùng được với profile dev hoặc test; "
                    + "runtime dùng ai.mode=live và GEMINI_API_KEY");
        }
        String apiKey = ai.getModel().getApiKey();
        return new AdvisorReadiness(ai.getMode(), () -> apiKey != null && !apiKey.isBlank(), properties.getDegradedWindow(),
                Clock.systemUTC());
    }

    @Bean
    public RagAdvisorService ragAdvisorService(AiProperties ai, AdvisorProperties properties) {
        AiProperties.RagProperties rag = ai.getRag();
        if (rag.getStoreType() != AiProperties.RagProperties.StoreType.IN_MEMORY) {
            throw new IllegalStateException("ai.rag.store-type=" + rag.getStoreType() + " chưa được nối ở platform "
                    + "(cần migration rag_chunks trên PostgreSQL có pgvector); dùng IN_MEMORY");
        }
        String root = properties.getRagDocumentsRoot();
        RagCatalogReader catalog = root == null || root.isBlank() ? new RagCatalogReader() : new RagCatalogReader(Path.of(root));
        EmbeddingProvider embedding = embeddingProvider(ai);
        InMemoryVectorStore store = new InMemoryVectorStore();
        RagRetriever retriever = new RagRetriever(embedding, store, new VietnameseQueryNormalizer(),
                rag.getSimilarityThreshold(), rag.getTopK());
        RagIngestionService ingestion = new RagIngestionService(catalog, new MarkdownDocumentReader(catalog), new SemanticChunker());
        // Không lập chỉ mục ở đây: RagAdvisorService tự lập ở lần truy xuất đầu tiên, lỗi nhúng không chặn khởi động
        return new RagAdvisorService(retriever, new EvidenceValidator(catalog), new CitationGrounder(catalog), ingestion,
                store, embedding);
    }

    @Bean
    public ResponseGroundingValidator responseGroundingValidator() {
        return new ResponseGroundingValidator();
    }

    /**
     * Mô hình trả lời: live gọi Gemini với khóa trong biến môi trường GEMINI_API_KEY (không đọc file .env); lỗi/chưa cấu hình
     * được module AI gắn cảnh báo MODEL_PROVIDER_ERROR và platform trả 503. Mock chỉ ở dev/test (đã chặn ở advisorReadiness).
     */
    @Bean
    public AdvisorModel advisorModel(AiProperties ai, AdvisorReadiness readiness, RagAdvisorService rag,
                                     ResponseGroundingValidator validator) {
        return readiness.mode() == AiMode.MOCK
                ? new MockAdvisorModel(rag, validator)
                : new LiveAdvisorModel(null, validator, false);
    }

    @Bean
    public AdvisorFacade advisorFacade(AdvisorModel model, AcademicFacade academicFacade, RagAdvisorService rag,
                                       ConversationTurns turns, ObjectMapper objectMapper, AiProperties ai,
                                       ResponseGroundingValidator validator) {
        ConversationHistoryManager history = new ConversationHistoryManager(turns.advisorStore(), objectMapper, true);
        return new DefaultAdvisorFacade(model, new DefaultToolAdapter(academicFacade, ai.getAdvisor().isStrictReadiness()), rag,
                history, new IntentClassifier(), validator, ai.getAdvisor().getToolTimeoutMs());
    }

    /** Luồng chạy lượt chat có giới hạn: quá tải thì từ chối ngay (503) thay vì xếp hàng vô hạn. */
    @Bean(destroyMethod = "shutdownNow")
    public ExecutorService advisorChatExecutor(AdvisorProperties properties) {
        AtomicInteger counter = new AtomicInteger();
        return new ThreadPoolExecutor(properties.getMaxConcurrentChats(), properties.getMaxConcurrentChats(), 60, TimeUnit.SECONDS,
                new ArrayBlockingQueue<>(Math.max(1, properties.getMaxQueuedChats())), runnable -> {
                    Thread thread = new Thread(runnable, "advisor-chat-" + counter.incrementAndGet());
                    thread.setDaemon(true);
                    return thread;
                }, new ThreadPoolExecutor.AbortPolicy());
    }

    private static EmbeddingProvider embeddingProvider(AiProperties ai) {
        AiProperties.RagProperties rag = ai.getRag();
        if (rag.getEmbeddingProvider() == AiProperties.RagProperties.EmbeddingProviderType.LIVE) {
            String apiKey = rag.getEmbeddingApiKey() == null || rag.getEmbeddingApiKey().isBlank()
                    ? ai.getModel().getApiKey() : rag.getEmbeddingApiKey();
            return new LiveEmbeddingProvider(rag.getEmbeddingEndpoint(), apiKey, rag.getEmbeddingModelName(),
                    rag.getEmbeddingDimension());
        }
        // Nhúng cục bộ tất định của module AI (không gọi mạng); chỉ ảnh hưởng xếp hạng đoạn quy chế, không tạo câu trả lời
        return new DeterministicFakeEmbeddingProvider(rag.getEmbeddingDimension());
    }
}
