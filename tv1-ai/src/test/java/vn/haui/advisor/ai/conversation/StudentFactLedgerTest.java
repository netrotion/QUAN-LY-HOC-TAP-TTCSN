package vn.haui.advisor.ai.conversation;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.contracts.dto.StudentFactRecord;
import vn.haui.advisor.contracts.fake.InMemoryStudentFactStore;
import vn.haui.advisor.contracts.ports.StudentFactStore;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class StudentFactLedgerTest {

    private StudentFactStore factStore;

    @BeforeEach
    void setUp() {
        factStore = new InMemoryStudentFactStore();
    }

    @Test
    @DisplayName("Should persist and retrieve verified student preferences across independent calls")
    void testPersistAndRetrieveFacts() {
        String studentId = "SV2021600001";
        StudentFactRecord record = new StudentFactRecord(
                studentId,
                BigDecimal.valueOf(3.50),
                "Kỹ thuật phần mềm & Trí tuệ nhân tạo",
                20,
                Map.of("career_goal", "Kỹ sư cầu nối Nhật Bản"),
                Instant.now().toString()
        );

        factStore.saveFacts(record);

        StudentFactRecord retrieved = factStore.getFacts(studentId);
        assertThat(retrieved).isNotNull();
        assertThat(retrieved.getTargetCpa()).isEqualTo(BigDecimal.valueOf(3.50));
        assertThat(retrieved.getPreferredCareerTrack()).isEqualTo("Kỹ thuật phần mềm & Trí tuệ nhân tạo");
        assertThat(retrieved.getMaxCreditsPerSemester()).isEqualTo(20);
        assertThat(retrieved.getVerifiedPreferences()).containsEntry("career_goal", "Kỹ sư cầu nối Nhật Bản");
    }

    @Test
    @DisplayName("Should strictly isolate student facts between different students (multi-tenant)")
    void testTenantIsolation() {
        String studentA = "SV_A";
        String studentB = "SV_B";

        factStore.saveFacts(new StudentFactRecord(studentA, BigDecimal.valueOf(3.80), "Data Science", 22, Map.of(), null));

        assertThat(factStore.getFacts(studentB)).isNull();
    }

    @Test
    @DisplayName("DefaultAdvisorFacade should automatically persist verified student goals into StudentFactStore across sessions")
    void testAdvisorFacadeFactPersistence() {
        vn.haui.advisor.ai.model.AdvisorModel mockModel = (input) -> new vn.haui.advisor.ai.model.AdvisorModelOutput(
                "Đã ghi nhận mục tiêu của bạn.", java.util.List.of(), java.util.List.of(), null, java.util.List.of()
        );
        vn.haui.advisor.ai.tools.ToolAdapter mockTool = org.mockito.Mockito.mock(vn.haui.advisor.ai.tools.ToolAdapter.class);

        vn.haui.advisor.ai.service.DefaultAdvisorFacade facade = new vn.haui.advisor.ai.service.DefaultAdvisorFacade(
                mockModel, mockTool, null, null, null, null, 2500, null, null, null, factStore
        );

        vn.haui.advisor.contracts.dto.TrustedStudentContext ctx =
                new vn.haui.advisor.contracts.dto.TrustedStudentContext("SV2021600999", "2021600999", "Nguyễn Văn B", "KTPM", "K16", "rev-v1");

        // Session 1: Student mentions goal CPA 3.65
        facade.chat(new vn.haui.advisor.contracts.dto.ChatRequest("conv-session-1", "Mục tiêu của mình là đạt cpa 3.65", null), ctx);

        // Assert StudentFactStore has saved the goal
        StudentFactRecord saved = factStore.getFacts("SV2021600999");
        assertThat(saved).isNotNull();
        assertThat(saved.getTargetCpa()).isEqualByComparingTo("3.65");

        // Session 2: Fresh chat in another thread -> Fact is still in store
        StudentFactRecord session2Facts = facade.getStudentFactStore().getFacts("SV2021600999");
        assertThat(session2Facts).isNotNull();
        assertThat(session2Facts.getTargetCpa()).isEqualByComparingTo("3.65");
    }
}
