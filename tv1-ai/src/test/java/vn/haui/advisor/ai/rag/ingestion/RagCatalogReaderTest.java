package vn.haui.advisor.ai.rag.ingestion;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.rag.model.CatalogSourceEntry;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("RagCatalogReader Tests")
class RagCatalogReaderTest {

    private RagCatalogReader reader;

    @BeforeEach
    void setUp() {
        reader = new RagCatalogReader();
    }

    @Test
    @DisplayName("Should successfully read and validate all 5 official sources from source-catalog.json")
    void readCatalog_shouldLoadAllFiveSources() {
        List<CatalogSourceEntry> entries = reader.readCatalog();

        assertThat(entries).hasSize(5);

        for (CatalogSourceEntry entry : entries) {
            assertThat(entry.getSourceId()).startsWith("REG-HAUI-");
            assertThat(entry.getTitle()).isNotBlank();
            assertThat(entry.getVersion()).matches("^gitblob:[0-9a-fA-F]{12}$");
            assertThat(entry.getSourceStatus()).isEqualTo("PROJECT_GROUND_TRUTH");
            assertThat(entry.isRagEnabled()).isTrue();
            assertThat(entry.getReferenceUrl()).startsWith("https://sv.haui.edu.vn/quy-che/");
            assertThat(entry.getSections()).isNotEmpty();
        }
    }

    @Test
    @DisplayName("Should return active sources when ragEnabled is true")
    void readActiveSources_shouldReturnOnlyRagEnabledSources() {
        List<CatalogSourceEntry> activeEntries = reader.readActiveSources();
        assertThat(activeEntries).hasSize(5);
        assertThat(activeEntries).allMatch(CatalogSourceEntry::isRagEnabled);
    }

    @Test
    @DisplayName("Should get source entry by sourceId successfully")
    void getSourceById_withValidId_shouldReturnEntry() {
        CatalogSourceEntry entry = reader.getSourceById("REG-HAUI-01");
        assertThat(entry).isNotNull();
        assertThat(entry.getSourceId()).isEqualTo("REG-HAUI-01");
        assertThat(entry.getTitle()).contains("tín chỉ");
        assertThat(entry.getVersion()).isEqualTo("gitblob:cab439dd3364");
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException when getting non-existent sourceId")
    void getSourceById_withUnknownId_shouldThrowException() {
        assertThatThrownBy(() -> reader.getSourceById("REG-NON-EXISTENT"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("REG-NON-EXISTENT");
    }

    @Test
    @DisplayName("Should resolve document paths to real markdown files on disk for all 5 catalog sources")
    void resolveDocumentPath_withValidEntry_shouldReturnExistingFile() {
        List<CatalogSourceEntry> entries = reader.readCatalog();
        for (CatalogSourceEntry entry : entries) {
            Path resolved = reader.resolveDocumentPath(entry);
            assertThat(resolved)
                    .withFailMessage("Resolved path for %s must exist: %s", entry.getSourceId(), resolved)
                    .isNotNull();
            assertThat(Files.exists(resolved)).isTrue();
            assertThat(Files.isRegularFile(resolved)).isTrue();
            assertThat(resolved.toString()).endsWith(".md");
        }
    }

    @Test
    @DisplayName("Should reject path traversal attempts escaping documents directory")
    void resolveDocumentPath_withPathTraversal_shouldThrowSecurityException() {
        assertThatThrownBy(() -> reader.resolveDocumentPath("../../../../../../../etc/passwd"))
                .isInstanceOf(SecurityException.class);

        assertThatThrownBy(() -> reader.resolveDocumentPath("data-source/documents/../../etc/passwd"))
                .isInstanceOf(SecurityException.class);

        assertThatThrownBy(() -> reader.resolveDocumentPath("C:\\Windows\\System32\\calc.exe"))
                .isInstanceOf(SecurityException.class);
    }

    @Test
    @DisplayName("Should reject catalog entry with invalid gitblob version format")
    void validateEntry_withInvalidVersion_shouldThrowException() {
        CatalogSourceEntry invalidEntry = new CatalogSourceEntry(
                "REG-HAUI-99",
                "Tiêu đề thử nghiệm",
                "../../../data-source/documents/01_quy_che_dao_tao_tin_chi_haui.md",
                "v1.0.0", // Không theo định dạng gitblob:<12-hex>
                "PROJECT_GROUND_TRUTH",
                true,
                "https://sv.haui.edu.vn/quy-che/reg-haui-99",
                List.of("Section 1")
        );

        assertThatThrownBy(() -> reader.validateEntry(invalidEntry))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("version");
    }

    @Test
    @DisplayName("Should reject catalog entry with invalid status")
    void validateEntry_withInvalidStatus_shouldThrowException() {
        CatalogSourceEntry invalidEntry = new CatalogSourceEntry(
                "REG-HAUI-99",
                "Tiêu đề thử nghiệm",
                "../../../data-source/documents/01_quy_che_dao_tao_tin_chi_haui.md",
                "gitblob:1234567890ab",
                "DRAFT", // Không phải PROJECT_GROUND_TRUTH
                true,
                "https://sv.haui.edu.vn/quy-che/reg-haui-99",
                List.of("Section 1")
        );

        assertThatThrownBy(() -> reader.validateEntry(invalidEntry))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("source_status");
    }

    @Test
    @DisplayName("Should reject catalog entry with empty sections")
    void validateEntry_withEmptySections_shouldThrowException() {
        CatalogSourceEntry invalidEntry = new CatalogSourceEntry(
                "REG-HAUI-99",
                "Tiêu đề thử nghiệm",
                "../../../data-source/documents/01_quy_che_dao_tao_tin_chi_haui.md",
                "gitblob:1234567890ab",
                "PROJECT_GROUND_TRUTH",
                true,
                "https://sv.haui.edu.vn/quy-che/reg-haui-99",
                List.of() // Empty sections
        );

        assertThatThrownBy(() -> reader.validateEntry(invalidEntry))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("sections");
    }
}
