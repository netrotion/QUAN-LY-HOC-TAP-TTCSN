package vn.haui.advisor.ai.rag.ingestion;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import vn.haui.advisor.ai.rag.model.CatalogSourceEntry;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.regex.Pattern;

/**
 * Đọc, xác thực và phân giải đường dẫn cho danh mục tài liệu RAG Source Catalog (source-catalog.json).
 */
public class RagCatalogReader {

    public static final String DEFAULT_CATALOG_RESOURCE = "/rag/source-catalog.json";
    private static final Pattern GITBLOB_PATTERN = Pattern.compile("^gitblob:[0-9a-fA-F]{12}$");
    private static final String REQUIRED_STATUS = "PROJECT_GROUND_TRUTH";
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final String catalogResourcePath;
    private final Path repoRoot;
    private final Path documentsDir;

    public RagCatalogReader() {
        this(DEFAULT_CATALOG_RESOURCE, detectRepoRoot());
    }

    public RagCatalogReader(Path repoRoot) {
        this(DEFAULT_CATALOG_RESOURCE, repoRoot);
    }

    public RagCatalogReader(String catalogResourcePath, Path repoRoot) {
        this.catalogResourcePath = catalogResourcePath != null ? catalogResourcePath : DEFAULT_CATALOG_RESOURCE;
        this.repoRoot = repoRoot != null ? repoRoot.toAbsolutePath().normalize() : detectRepoRoot();
        this.documentsDir = this.repoRoot.resolve("data-source").resolve("documents").normalize();
    }

    /**
     * Tự động phát hiện thư mục gốc repository (chứa data-source/documents và pom.xml).
     */
    public static Path detectRepoRoot() {
        Path cur = Paths.get("").toAbsolutePath();
        while (cur != null) {
            if (Files.isDirectory(cur.resolve("data-source").resolve("documents"))
                    && Files.exists(cur.resolve("pom.xml"))) {
                return cur.normalize();
            }
            cur = cur.getParent();
        }
        Path fallback = Paths.get("").toAbsolutePath();
        if (fallback.endsWith("tv1-ai")) {
            return fallback.getParent().normalize();
        }
        return fallback.normalize();
    }

    /**
     * Đọc toàn bộ danh mục tài liệu từ file catalog resource và xác thực tính hợp lệ.
     */
    public List<CatalogSourceEntry> readCatalog() {
        try (InputStream is = getClass().getResourceAsStream(catalogResourcePath)) {
            if (is == null) {
                throw new IllegalStateException("Không tìm thấy catalog resource tại: " + catalogResourcePath);
            }
            JsonNode root = MAPPER.readTree(is);
            JsonNode sourcesNode = root.path("sources");
            if (!sourcesNode.isArray()) {
                throw new IllegalStateException("Catalog JSON không chứa mảng 'sources' hợp lệ");
            }

            List<CatalogSourceEntry> entries = new ArrayList<>();
            for (JsonNode node : sourcesNode) {
                CatalogSourceEntry entry = MAPPER.treeToValue(node, CatalogSourceEntry.class);
                validateEntry(entry);
                entries.add(entry);
            }
            return Collections.unmodifiableList(entries);
        } catch (IOException e) {
            throw new RuntimeException("Lỗi khi đọc file catalog: " + catalogResourcePath, e);
        }
    }

    /**
     * Đọc các tài liệu có rag_enabled = true.
     */
    public List<CatalogSourceEntry> readActiveSources() {
        return readCatalog().stream()
                .filter(CatalogSourceEntry::isRagEnabled)
                .toList();
    }

    /**
     * Tìm kiếm một mục tài liệu theo mã sourceId.
     */
    public CatalogSourceEntry getSourceById(String sourceId) {
        if (sourceId == null || sourceId.isBlank()) {
            throw new IllegalArgumentException("sourceId không được để trống");
        }
        return readCatalog().stream()
                .filter(e -> sourceId.equals(e.getSourceId()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy source với ID: " + sourceId));
    }

    /**
     * Phân giải đường dẫn tài liệu an toàn từ CatalogSourceEntry.
     */
    public Path resolveDocumentPath(CatalogSourceEntry entry) {
        if (entry == null) {
            throw new IllegalArgumentException("CatalogSourceEntry không được null");
        }
        return resolveDocumentPath(entry.getPath());
    }

    /**
     * Phân giải đường dẫn an toàn:
     * - Ngăn chặn triệt để Path Traversal
     * - Từ chối đường dẫn tuyệt đối nằm ngoài documentsDir
     * - Hỗ trợ phân giải đường dẫn tương đối trỏ về data-source/documents
     */
    public Path resolveDocumentPath(String catalogPath) {
        if (catalogPath == null || catalogPath.isBlank()) {
            throw new IllegalArgumentException("catalogPath không được rỗng");
        }

        // 1. Kiểm tra nếu là đường dẫn tuyệt đối
        Path rawPath = Paths.get(catalogPath);
        if (rawPath.isAbsolute()) {
            Path normalized = rawPath.normalize();
            if (!normalized.startsWith(documentsDir)) {
                throw new SecurityException("Đường dẫn tuyệt đối nằm ngoài thư mục tài liệu hợp lệ: " + catalogPath);
            }
            return normalized;
        }

        // 2. Chuẩn hóa đường dẫn tương đối và phát hiện Path Traversal
        String normalizedSlash = catalogPath.replace('\\', '/');

        // Nếu chuỗi chứa "data-source/documents/"
        String marker = "data-source/documents/";
        String subPath;
        if (normalizedSlash.contains(marker)) {
            subPath = normalizedSlash.substring(normalizedSlash.indexOf(marker) + marker.length());
        } else {
            // Không chứa marker data-source/documents/
            // Kiểm tra nếu cố tình vượt ra ngoài thư mục qua ..
            Path testPath = documentsDir.resolve(catalogPath).normalize();
            if (!testPath.startsWith(documentsDir)) {
                throw new SecurityException("Phát hiện nguy cơ Path Traversal: " + catalogPath);
            }
            return testPath;
        }

        // Kiểm tra phần subPath có chứa '..' nhằm escape không
        if (subPath.contains("..")) {
            Path test = documentsDir.resolve(subPath).normalize();
            if (!test.startsWith(documentsDir)) {
                throw new SecurityException("Phát hiện nguy cơ Path Traversal: " + catalogPath);
            }
            return test;
        }

        Path resolved = documentsDir.resolve(subPath).normalize();
        if (!resolved.startsWith(documentsDir)) {
            throw new SecurityException("Phát hiện nguy cơ Path Traversal: " + catalogPath);
        }

        return resolved;
    }

    /**
     * Xác thực các quy tắc nghiệp vụ nghiêm ngặt cho CatalogSourceEntry:
     * - source_id bắt đầu bằng REG-HAUI-
     * - version tuân thủ gitblob:<12 hex>
     * - source_status phải là PROJECT_GROUND_TRUTH
     * - sections không được rỗng
     */
    public void validateEntry(CatalogSourceEntry entry) {
        if (entry == null) {
            throw new IllegalArgumentException("CatalogSourceEntry không được null");
        }
        if (entry.getSourceId() == null || !entry.getSourceId().startsWith("REG-HAUI-")) {
            throw new IllegalArgumentException("source_id không hợp lệ (phải bắt đầu bằng REG-HAUI-): " + entry.getSourceId());
        }
        if (entry.getVersion() == null || !GITBLOB_PATTERN.matcher(entry.getVersion()).matches()) {
            throw new IllegalArgumentException("version không hợp lệ (phải theo định dạng gitblob:<12-hex>): " + entry.getVersion());
        }
        if (!REQUIRED_STATUS.equals(entry.getSourceStatus())) {
            throw new IllegalArgumentException("source_status không hợp lệ (phải là " + REQUIRED_STATUS + "): " + entry.getSourceStatus());
        }
        if (entry.getSections() == null || entry.getSections().isEmpty()) {
            throw new IllegalArgumentException("sections không được để trống cho source: " + entry.getSourceId());
        }
        if (entry.getPath() == null || entry.getPath().isBlank()) {
            throw new IllegalArgumentException("path không được để trống cho source: " + entry.getSourceId());
        }
    }

    public Path getRepoRoot() {
        return repoRoot;
    }

    public Path getDocumentsDir() {
        return documentsDir;
    }
}
