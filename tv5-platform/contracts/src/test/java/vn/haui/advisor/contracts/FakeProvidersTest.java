package vn.haui.advisor.contracts;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.fake.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("contracts-v1: fake provider cho AI và platform")
class FakeProvidersTest {

    @Test
    @DisplayName("FixtureAcademicFacade trả fixture của cả 9 capability từ classpath")
    void fixtureAcademicFacadeCoversAllCapabilities() {
        FixtureAcademicFacade facade = new FixtureAcademicFacade();

        assertThat(facade.getAcademicStatus(new AcademicStatusRequest()).getCpa()).isEqualByComparingTo("3.18");
        assertThat(facade.checkCourseEligibility(new CourseEligibilityRequest()).isEligible()).isFalse();
        assertThat(facade.generateStudyPlan(new GenerateStudyPlanRequest()).getSemesters()).hasSize(2);
        assertThat(facade.validateStudyPlan(new ValidateStudyPlanRequest()).getViolations()).isNotEmpty();
        assertThat(facade.simulateGrades(new SimulateGradesRequest()).getProjectedCpa()).isEqualByComparingTo("3.23");
        assertThat(facade.rankRetakeCourses(new RankRetakeCoursesRequest()).getRecommendations()).hasSize(2);
        assertThat(facade.calculateTargetGrades(new CalculateTargetGradesRequest()).getRequiredAverageGpa()).isEqualByComparingTo("3.55");
        assertThat(facade.runGraduationAudit(new GraduationAuditRequest()).getPendingActions()).hasSize(1);
        assertThat(facade.reconcileStudyPlan(new ReconcileStudyPlanRequest()).isOnTrack()).isFalse();
    }

    @Test
    @DisplayName("Mỗi lần gọi trả bản sao mới, phía dùng sửa không ảnh hưởng lần sau")
    void fixturesAreFreshCopies() {
        FixtureAcademicFacade facade = new FixtureAcademicFacade();
        facade.getAcademicStatus(null).getWarnings().clear();
        assertThat(facade.getAcademicStatus(null).getWarnings()).isNotEmpty();
    }

    @Test
    @DisplayName("FixedStudentContextProvider: context demo và phát hiện revision cũ")
    void fixedStudentContextProvider() {
        FixedStudentContextProvider provider = new FixedStudentContextProvider();
        TrustedStudentContext context = provider.getAuthenticatedContext();
        assertThat(context.getStudentId()).isEqualTo(ContractFixtures.DEMO_STUDENT_ID);
        assertThat(context.getDataRevision()).isEqualTo(ContractFixtures.DEMO_DATA_REVISION);
        assertThat(provider.isDataStale(context.getStudentId(), ContractFixtures.DEMO_DATA_REVISION)).isFalse();

        provider.changeDataRevision("REV-2024604757-002");
        assertThat(provider.isDataStale(context.getStudentId(), ContractFixtures.DEMO_DATA_REVISION)).isTrue();
        assertThat(provider.getDataVersion(context.getStudentId()).getDataRevision()).isEqualTo("REV-2024604757-002");
    }

    @Test
    @DisplayName("InMemoryConversationStore: sinh viên khác không đọc được hội thoại")
    void conversationStoreIsolatesStudents() {
        InMemoryConversationStore store = new InMemoryConversationStore();
        store.saveConversation(new ConversationRecord("conv-1", "2024604757", "Hỏi lộ trình", null, null, "[]"));

        assertThat(store.getConversation("conv-1", "2024604757")).isNotNull();
        assertThat(store.getConversation("conv-1", "attacker-9999")).isNull();
        assertThatThrownBy(() -> store.saveConversation(
                new ConversationRecord("conv-1", "attacker-9999", "Chiếm hội thoại", null, null, "[]")))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(store.getConversation("conv-1", "2024604757").getTitle()).isEqualTo("Hỏi lộ trình");
        assertThat(store.listConversations("2024604757")).extracting("conversationId").containsExactly("conv-1");
        assertThat(store.listConversations("attacker-9999")).isEmpty();
    }

    @Test
    @DisplayName("FixtureStudentAcademicRecordProvider: sinh viên demo có bảng điểm, sinh viên khác hồ sơ trống")
    void fixtureStudentAcademicRecordProvider() {
        FixtureStudentAcademicRecordProvider provider = new FixtureStudentAcademicRecordProvider();
        StudentAcademicRecord demo = provider.getAcademicRecord(ContractFixtures.DEMO_STUDENT_ID);
        assertThat(demo.getTranscriptStatus()).isEqualTo(TranscriptStatus.CONFIRMED);
        assertThat(demo.getAttempts()).hasSize(23);
        assertThat(demo.getCertificates()).hasSize(4);

        StudentAcademicRecord other = provider.getAcademicRecord("2024610001");
        assertThat(other.getTranscriptStatus()).isEqualTo(TranscriptStatus.NONE);
        assertThat(other.getAttempts()).isEmpty();
    }

    @Test
    @DisplayName("FixtureAdvisorFacade trả chat-response fixture có planProposal.semesters")
    void fixtureAdvisorFacade() {
        ChatResponse response = new FixtureAdvisorFacade().chat(new ChatRequest(), new TrustedStudentContext());
        assertThat(response.getPlanProposal().getSemesters()).isNotEmpty();
        assertThat(response.getSources()).isNotEmpty();
    }
}
