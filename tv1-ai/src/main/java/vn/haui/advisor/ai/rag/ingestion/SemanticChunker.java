package vn.haui.advisor.ai.rag.ingestion;

import vn.haui.advisor.ai.rag.model.RagChunk;
import vn.haui.advisor.ai.rag.model.RagDocument;

import java.text.Normalizer;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Trình phân tách đoạn văn bản ngữ nghĩa (Semantic Chunker) cho Markdown tài liệu quy chế HaUI:
 * - Nhận biết cấu trúc tiêu đề (#, ##, ###)
 * - Bảo toàn cây phân cấp section ("1. Tổ chức Đào tạo... > 2. Giới hạn Đăng ký...")
 * - Bảo toàn nguyên vẹn Markdown Table (không bao giờ cắt đôi bảng)
 * - Bảo toàn nguyên vẹn công thức LaTeX ($$...$$ và $...$)
 * - Bảo toàn các điều khoản đánh số (1. ..., 2. ...)
 * - Định dạng chunk ID xác định, ổn định: {sourceId}#{sectionSlug}#{chunkIndex}
 * - Không sinh chunk rỗng, đảm bảo tính bất biến và idempotent
 */
public class SemanticChunker {

    public static final int DEFAULT_MAX_CHUNK_SIZE = 800;
    public static final int DEFAULT_OVERLAP = 100;

    private static final Pattern NUMBERED_BOLD_PATTERN = Pattern.compile("^\\s*(\\d+\\.\\s+\\*\\*(.+?)\\*\\*[:.]?)");
    private static final Pattern H2_PATTERN = Pattern.compile("^##\\s+(.+)$");
    private static final Pattern H3_PATTERN = Pattern.compile("^###\\s+(.+)$");

    private final int maxChunkSize;
    private final int overlap;

    public SemanticChunker() {
        this(DEFAULT_MAX_CHUNK_SIZE, DEFAULT_OVERLAP);
    }

    public SemanticChunker(int maxChunkSize, int overlap) {
        if (maxChunkSize <= 0) {
            throw new IllegalArgumentException("maxChunkSize phải lớn hơn 0");
        }
        if (overlap < 0 || overlap >= maxChunkSize) {
            throw new IllegalArgumentException("overlap phải >= 0 và < maxChunkSize");
        }
        this.maxChunkSize = maxChunkSize;
        this.overlap = overlap;
    }

    public int getMaxChunkSize() {
        return maxChunkSize;
    }

    public int getOverlap() {
        return overlap;
    }

    /**
     * Phân tách RagDocument thành danh sách các RagChunk ngữ nghĩa.
     */
    public List<RagChunk> chunk(RagDocument document) {
        if (document == null || document.getContent() == null || document.getContent().isBlank()) {
            return Collections.emptyList();
        }

        @SuppressWarnings("unchecked")
        List<String> catalogSections = document.getMetadataProperty("sections", List.class);

        // 1. Phân tách tài liệu thành các Section ngữ nghĩa
        List<SectionUnit> sections = extractSections(document.getContent(), catalogSections);

        // 2. Chuyển từng Section thành một hoặc nhiều RagChunk
        List<RagChunk> allChunks = new ArrayList<>();
        int globalChunkIndex = 0;

        for (SectionUnit sec : sections) {
            List<String> chunkContents = splitSectionContent(sec.content, maxChunkSize, overlap);
            String sectionSlug = slugify(sec.sectionName);

            for (String cContent : chunkContents) {
                if (cContent.isBlank()) {
                    continue;
                }
                String chunkId = document.getSourceId() + "#" + sectionSlug + "#" + globalChunkIndex;
                int tokenEstimate = estimateTokens(cContent);

                RagChunk chunk = new RagChunk(
                        chunkId,
                        document.getSourceId(),
                        document.getTitle(),
                        sec.sectionName,
                        document.getVersion(),
                        document.getReferenceUrl(),
                        cContent.trim(),
                        globalChunkIndex,
                        tokenEstimate
                );

                allChunks.add(chunk);
                globalChunkIndex++;
            }
        }

        return Collections.unmodifiableList(allChunks);
    }

    /**
     * Phân tích văn bản markdown thành các SectionUnit theo cấu trúc tiêu đề hoặc danh mục catalog.
     */
    private List<SectionUnit> extractSections(String markdown, List<String> catalogSections) {
        String[] lines = markdown.split("\\r?\\n");
        List<SectionUnit> result = new ArrayList<>();

        String currentH2 = null;
        String currentSectionName = null;
        StringBuilder currentBuffer = new StringBuilder();

        for (int i = 0; i < lines.length; i++) {
            String line = lines[i];
            String trimmed = line.trim();

            // Bỏ qua dòng kẻ phân cách ngang đứng riêng
            if (trimmed.equals("---")) {
                continue;
            }

            Matcher h2Matcher = H2_PATTERN.matcher(trimmed);
            Matcher h3Matcher = H3_PATTERN.matcher(trimmed);
            Matcher numBoldMatcher = NUMBERED_BOLD_PATTERN.matcher(trimmed);

            String candidateSection = null;

            if (h2Matcher.matches()) {
                currentH2 = cleanHeading(h2Matcher.group(1));
                // Nếu catalog có đúng section này (ví dụ REG-HAUI-04 hay REG-HAUI-05)
                if (catalogSections != null && catalogSections.contains(currentH2)) {
                    candidateSection = currentH2;
                } else if (catalogSections == null) {
                    candidateSection = currentH2;
                }
            } else if (h3Matcher.matches()) {
                String h3 = cleanHeading(h3Matcher.group(1));
                String combined = (currentH2 != null ? currentH2 + " > " : "") + h3;
                if (catalogSections != null && catalogSections.contains(combined)) {
                    candidateSection = combined;
                } else if (catalogSections == null) {
                    candidateSection = combined;
                }
            } else if (numBoldMatcher.find()) {
                String boldText = numBoldMatcher.group(2).trim();
                // Bỏ dấu hai chấm hoặc dấu chấm ở cuối nếu có
                if (boldText.endsWith(":") || boldText.endsWith(".")) {
                    boldText = boldText.substring(0, boldText.length() - 1).trim();
                }
                String ruleNumber = numBoldMatcher.group(1);
                String numberPrefix = ruleNumber.substring(0, ruleNumber.indexOf('.')).trim() + ". ";
                String ruleTitle = numberPrefix + boldText;

                String combined = (currentH2 != null ? currentH2 + " > " : "") + ruleTitle;
                if (catalogSections != null && catalogSections.contains(combined)) {
                    candidateSection = combined;
                }
            }

            if (candidateSection != null) {
                // Đóng section cũ nếu có nội dung
                if (currentSectionName != null && !currentBuffer.toString().isBlank()) {
                    result.add(new SectionUnit(currentSectionName, currentBuffer.toString().trim()));
                    currentBuffer.setLength(0);
                }
                currentSectionName = candidateSection;
            }

            if (currentSectionName != null) {
                currentBuffer.append(line).append("\n");
            }
        }

        // Đóng section cuối cùng
        if (currentSectionName != null && !currentBuffer.toString().isBlank()) {
            result.add(new SectionUnit(currentSectionName, currentBuffer.toString().trim()));
        }

        // Trường hợp tài liệu không có tiêu đề H2/H3 nào khớp catalog: chia toàn bộ tài liệu thành 1 section
        if (result.isEmpty() && !markdown.isBlank()) {
            String fallbackName = catalogSections != null && !catalogSections.isEmpty() ? catalogSections.get(0) : "Default Section";
            result.add(new SectionUnit(fallbackName, markdown.trim()));
        }

        return result;
    }

    /**
     * Chia nhỏ nội dung một section thành các khối <= maxChunkSize,
     * đồng thời bảo toàn nguyên vẹn Markdown Table, công thức LaTeX và điều khoản đánh số.
     */
    private List<String> splitSectionContent(String content, int maxSize, int overlapSize) {
        if (content.length() <= maxSize) {
            return List.of(content);
        }

        List<String> blocks = parseSemanticBlocks(content);
        List<String> chunks = new ArrayList<>();
        StringBuilder currentChunk = new StringBuilder();
        String lastBlockForOverlap = null;

        for (String block : blocks) {
            if (block.isBlank()) {
                continue;
            }

            // Nếu block này là bảng hoặc công thức display math hoặc điều khoản nguyên khối
            boolean isAtomic = isTableBlock(block) || isLatexDisplayBlock(block);

            // Kiểm tra dung lượng khi cộng thêm block
            int addedLen = (currentChunk.length() == 0 ? 0 : 2) + block.length();
            if (currentChunk.length() + addedLen <= maxSize) {
                if (currentChunk.length() > 0) {
                    currentChunk.append("\n\n");
                }
                currentChunk.append(block);
                lastBlockForOverlap = block;
            } else {
                // Đóng chunk hiện tại
                if (currentChunk.length() > 0) {
                    chunks.add(currentChunk.toString().trim());
                    currentChunk.setLength(0);
                }

                // Nếu chính block này vượt quá maxSize
                if (block.length() > maxSize) {
                    if (isAtomic) {
                        // Bảng hoặc công thức bắt buộc phải giữ nguyên vẹn
                        chunks.add(block.trim());
                        lastBlockForOverlap = null;
                    } else {
                        // Đoạn văn bản thường: tách theo câu hoặc dòng
                        List<String> subChunks = splitParagraphBySentences(block, maxSize);
                        chunks.addAll(subChunks);
                        lastBlockForOverlap = subChunks.isEmpty() ? null : subChunks.get(subChunks.size() - 1);
                    }
                } else {
                    // Áp dụng overlap từ block trước nếu phù hợp
                    if (overlapSize > 0 && lastBlockForOverlap != null && lastBlockForOverlap.length() <= overlapSize) {
                        currentChunk.append(lastBlockForOverlap).append("\n\n");
                    }
                    currentChunk.append(block);
                    lastBlockForOverlap = block;
                }
            }
        }

        if (currentChunk.length() > 0 && !currentChunk.toString().isBlank()) {
            chunks.add(currentChunk.toString().trim());
        }

        return chunks;
    }

    /**
     * Tách văn bản thành các khối ngữ nghĩa (Markdown table, LaTeX display math, numbered rules, paragraphs).
     */
    private List<String> parseSemanticBlocks(String content) {
        String[] lines = content.split("\\r?\\n");
        List<String> blocks = new ArrayList<>();
        StringBuilder buffer = new StringBuilder();

        int i = 0;
        while (i < lines.length) {
            String line = lines[i];
            String trimmed = line.trim();

            // 1. Markdown Table: bắt đầu bằng dòng chứa ký tự '|'
            if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
                if (buffer.length() > 0) {
                    blocks.add(buffer.toString().trim());
                    buffer.setLength(0);
                }
                StringBuilder tableBuf = new StringBuilder();
                while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
                    tableBuf.append(lines[i]).append("\n");
                    i++;
                }
                blocks.add(tableBuf.toString().trim());
                continue;
            }

            // 2. LaTeX Display Math: bắt đầu bằng '$$'
            if (trimmed.startsWith("$$")) {
                if (buffer.length() > 0) {
                    blocks.add(buffer.toString().trim());
                    buffer.setLength(0);
                }
                StringBuilder mathBuf = new StringBuilder();
                mathBuf.append(line).append("\n");
                if (!trimmed.endsWith("$$") || trimmed.equals("$$")) {
                    i++;
                    while (i < lines.length) {
                        mathBuf.append(lines[i]).append("\n");
                        if (lines[i].trim().endsWith("$$")) {
                            i++;
                            break;
                        }
                        i++;
                    }
                } else {
                    i++;
                }
                blocks.add(mathBuf.toString().trim());
                continue;
            }

            // 3. Numbered Rule / Bullet Item: gom các dòng thụt lề cùng item
            if (trimmed.matches("^(\\d+\\.|\\-|\\*)\\s+.*")) {
                if (buffer.length() > 0) {
                    blocks.add(buffer.toString().trim());
                    buffer.setLength(0);
                }
                StringBuilder ruleBuf = new StringBuilder();
                ruleBuf.append(line).append("\n");
                i++;
                while (i < lines.length) {
                    String next = lines[i];
                    String nextTrim = next.trim();
                    if (nextTrim.isEmpty()) {
                        break;
                    }
                    // Nếu là mục danh sách mới cùng cấp hoặc tiêu đề mới
                    if (nextTrim.matches("^(\\d+\\.|##|###)\\s+.*")) {
                        break;
                    }
                    ruleBuf.append(next).append("\n");
                    i++;
                }
                blocks.add(ruleBuf.toString().trim());
                continue;
            }

            // 4. Đoạn văn thường
            if (trimmed.isEmpty()) {
                if (buffer.length() > 0) {
                    blocks.add(buffer.toString().trim());
                    buffer.setLength(0);
                }
            } else {
                buffer.append(line).append("\n");
            }
            i++;
        }

        if (buffer.length() > 0) {
            blocks.add(buffer.toString().trim());
        }

        return blocks;
    }

    private boolean isTableBlock(String block) {
        return block.contains("\n|") || (block.startsWith("|") && block.contains("---"));
    }

    private boolean isLatexDisplayBlock(String block) {
        return block.startsWith("$$") && block.endsWith("$$");
    }

    private List<String> splitParagraphBySentences(String paragraph, int maxSize) {
        List<String> result = new ArrayList<>();
        String[] sentences = paragraph.split("(?<=[.!?])\\s+");
        StringBuilder cur = new StringBuilder();

        for (String sentence : sentences) {
            if (cur.length() + sentence.length() + 1 <= maxSize) {
                if (cur.length() > 0) cur.append(" ");
                cur.append(sentence);
            } else {
                if (cur.length() > 0) {
                    result.add(cur.toString().trim());
                    cur.setLength(0);
                }
                if (sentence.length() > maxSize) {
                    // Cắt theo độ dài nếu 1 câu quá dài
                    for (int j = 0; j < sentence.length(); j += maxSize) {
                        result.add(sentence.substring(j, Math.min(sentence.length(), j + maxSize)).trim());
                    }
                } else {
                    cur.append(sentence);
                }
            }
        }
        if (cur.length() > 0 && !cur.toString().isBlank()) {
            result.add(cur.toString().trim());
        }
        return result;
    }

    private String cleanHeading(String heading) {
        if (heading == null) return "";
        return heading.replaceAll("^#+\\s*", "").trim();
    }

    /**
     * Chuyển đổi tên section thành slug định danh xác định, an toàn và ổn định.
     */
    public static String slugify(String text) {
        if (text == null || text.isBlank()) {
            return "sec";
        }
        String s = text.replace("đ", "d").replace("Đ", "D");
        s = Normalizer.normalize(s, Normalizer.Form.NFD);
        s = s.replaceAll("\\p{M}", "");
        s = s.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-");
        s = s.replaceAll("^-+|-+$", "");
        return s.isEmpty() ? "sec" : s;
    }

    /**
     * Ước lượng số lượng token cho tiếng Việt (trung bình ~1.3 token / từ).
     */
    public static int estimateTokens(String content) {
        if (content == null || content.isBlank()) {
            return 0;
        }
        int words = content.trim().split("\\s+").length;
        return Math.max(1, (int) Math.ceil(words * 1.3));
    }

    private static class SectionUnit {
        final String sectionName;
        final String content;

        SectionUnit(String sectionName, String content) {
            this.sectionName = sectionName;
            this.content = content;
        }
    }
}
