package vn.haui.advisor.academic;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.academic.engine.GradeCalculator;
import vn.haui.advisor.academic.engine.RuleEvaluator;
import vn.haui.advisor.academic.fixture.AcademicFixtures;
import vn.haui.advisor.academic.model.CurriculumFixture;
import vn.haui.advisor.academic.model.StudentProfileFixture;
import vn.haui.advisor.academic.service.DefaultAcademicFacade;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.ports.AcademicFacade;
import vn.haui.advisor.contracts.ports.StudentAcademicRecordProvider;

import java.math.BigDecimal;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Task 3.1: Academic Core Ready Acceptance Test Suite (TV4)")
public class AcademicCoreReadyTest {

    private AcademicFacade defaultFacade;
    private CurriculumFixture standardCurriculum;

    @BeforeEach
    void setUp() {
        defaultFacade = new DefaultAcademicFacade();
        standardCurriculum = AcademicFixtures.getCurriculum();
    }

    @Nested
    @DisplayName("1. Nhóm PASS: Môn tiên quyết đã hoàn thành hợp lệ (>= D / 1.0)")
    class PassScenarioTests {

        @Test
        @DisplayName("Sinh viên hoàn thành môn tiên quyết với điểm B -> Đủ điều kiện đăng ký môn tiếp theo")
        void testEligibleWhenPrerequisitePassed() {
            CourseEligibilityRequest req = new CourseEligibilityRequest("std-2026-001", "IT2001", "2026_1", "rev-3.1");
            CourseEligibilityResponse res = defaultFacade.checkCourseEligibility(req);

            assertThat(res.isEligible()).isTrue();
            assertThat(res.getMissingPrerequisites()).isEmpty();
        }

        @Test
        @DisplayName("Sinh viên hoàn thành môn tiên quyết với điểm D (điểm tối thiểu đạt) -> Vẫn đủ điều kiện")
        void testEligibleWhenPrerequisitePassedWithMinimumD() {
            StudentProfileFixture profile = new StudentProfileFixture();
            profile.setStudentId("std-test-pass-d");
            StudentProfileFixture.CourseAttempt attempt = new StudentProfileFixture.CourseAttempt();
            attempt.setCourseCode("IT1001");
            attempt.setCourseName("Nhập môn lập trình");
            attempt.setCredits(3.0);
            attempt.setSemesterCode("2024_1");
            attempt.setLetterGrade("D");
            attempt.setGradePoint4(1.0);
            attempt.setPassed(true);
            profile.setCourseAttempts(List.of(attempt));

            CourseEligibilityResponse res = RuleEvaluator.checkEligibility("IT2001", profile, standardCurriculum, "rev-3.1");
            assertThat(res.isEligible()).isTrue();
            assertThat(res.getMissingPrerequisites()).isEmpty();
        }
    }

    @Nested
    @DisplayName("2. Nhóm FAIL: Môn tiên quyết chưa đạt (Điểm F)")
    class FailScenarioTests {

        @Test
        @DisplayName("Sinh viên bị điểm F môn tiên quyết -> Bị chặn đăng ký môn tiếp theo")
        void testIneligibleWhenPrerequisiteFailedWithF() {
            CourseEligibilityRequest req = new CourseEligibilityRequest("std-2026-001", "IT6001", "2026_1", "rev-3.1");
            CourseEligibilityResponse res = defaultFacade.checkCourseEligibility(req);

            assertThat(res.isEligible()).isFalse();
            assertThat(res.getMissingPrerequisites()).anyMatch(msg -> msg.contains("MATH1002") && msg.contains("chưa đạt"));
        }
    }

    @Nested
    @DisplayName("3. Nhóm IN_PROGRESS: Môn đang học không tính vào CPA/tín chỉ tích lũy đã xác nhận")
    class InProgressScenarioTests {

        @Test
        @DisplayName("Môn đang học (chưa có điểm chữ / null) -> Không được cộng vào tín chỉ tích lũy hoặc CPA")
        void testInProgressCourseExcludedFromAccumulatedCreditsAndCpa() {
            List<TranscriptAttemptItem> attempts = new ArrayList<>();

            // Môn đã hoàn thành
            TranscriptAttemptItem completed = new TranscriptAttemptItem();
            completed.setCourseCode("IT1001");
            completed.setCredits(new BigDecimal("3"));
            completed.setLetterGrade("A");
            completed.setAttemptNumber(1);
            attempts.add(completed);

            // Môn đang học
            TranscriptAttemptItem inProgress = new TranscriptAttemptItem();
            inProgress.setCourseCode("IT2001");
            inProgress.setCredits(new BigDecimal("3"));
            inProgress.setLetterGrade(null); // Đang học
            inProgress.setAttemptNumber(1);
            attempts.add(inProgress);

            BigDecimal cpa = GradeCalculator.calculateCpaFromAttempts(attempts);
            int credits = GradeCalculator.calculateAccumulatedCreditsFromAttempts(attempts);

            // Chỉ tính môn IT1001 (A = 4.0, 3 tín chỉ)
            assertThat(cpa).isEqualByComparingTo(new BigDecimal("4.00"));
            assertThat(credits).isEqualTo(3);
        }

        @Test
        @DisplayName("Môn tiên quyết đang học (IN_PROGRESS) -> Không được tự động coi là đã đạt để đăng ký môn kỳ sau")
        void testInProgressPrerequisiteCannotBeAssumedPassed() {
            StudentProfileFixture profile = new StudentProfileFixture();
            profile.setStudentId("std-in-progress");
            StudentProfileFixture.CourseAttempt attempt = new StudentProfileFixture.CourseAttempt();
            attempt.setCourseCode("IT1001");
            attempt.setCourseName("Nhập môn lập trình");
            attempt.setCredits(3.0);
            attempt.setSemesterCode("2025_1");
            attempt.setLetterGrade("IN_PROGRESS");
            attempt.setPassed(null);
            profile.setCourseAttempts(List.of(attempt));

            CourseEligibilityResponse res = RuleEvaluator.checkEligibility("IT2001", profile, standardCurriculum, "rev-3.1");
            assertThat(res.isEligible()).isFalse();
            assertThat(res.getMissingPrerequisites()).anyMatch(msg -> msg.contains("UNKNOWN") || msg.contains("chưa có kết quả"));
        }
    }

    @Nested
    @DisplayName("4. Nhóm RETAKE: Lịch sử học nhiều lần, tính CPA và bảo toàn tín chỉ tích lũy")
    class RetakeScenarioTests {

        @Test
        @DisplayName("Học lại môn F: Lần 1 điểm F, Lần 2 học lại đạt B -> CPA tính theo B, tín chỉ chỉ tính 1 lần")
        void testRetakeFailedCourseReplacesFInCpaAndCountsCreditsOnce() {
            List<TranscriptAttemptItem> attempts = new ArrayList<>();

            // Kỳ 1: Trượt MATH1002 (3 TC, điểm F = 0.0)
            TranscriptAttemptItem attempt1 = new TranscriptAttemptItem();
            attempt1.setCourseCode("MATH1002");
            attempt1.setCourseName("Toán rời rạc");
            attempt1.setCredits(new BigDecimal("3"));
            attempt1.setSemesterCode("2024_1");
            attempt1.setAttemptNumber(1);
            attempt1.setLetterGrade("F");
            attempts.add(attempt1);

            // Kỳ 2: Học lại MATH1002 đạt B (3 TC, điểm B = 3.0)
            TranscriptAttemptItem attempt2 = new TranscriptAttemptItem();
            attempt2.setCourseCode("MATH1002");
            attempt2.setCourseName("Toán rời rạc");
            attempt2.setCredits(new BigDecimal("3"));
            attempt2.setSemesterCode("2024_2");
            attempt2.setAttemptNumber(2);
            attempt2.setLetterGrade("B");
            attempts.add(attempt2);

            BigDecimal cpa = GradeCalculator.calculateCpaFromAttempts(attempts);
            int accumulatedCredits = GradeCalculator.calculateAccumulatedCreditsFromAttempts(attempts);
            int debtCredits = GradeCalculator.calculateDebtCreditsFromAttempts(attempts);

            // CPA phải tính theo B (3.00), không bị kéo tụt bởi F cũ
            assertThat(cpa).isEqualByComparingTo(new BigDecimal("3.00"));
            // Tín chỉ tích lũy chỉ tính 1 lần: 3 TC (không được thành 6 TC)
            assertThat(accumulatedCredits).isEqualTo(3);
            // Môn nợ đã được gỡ: debt = 0
            assertThat(debtCredits).isEqualTo(0);
        }

        @Test
        @DisplayName("Học cải thiện môn D: Lần 1 được D (1.0), Lần 2 cải thiện đạt A (4.0) -> CPA tính theo A")
        void testImprovementGradeIncreasesCpa() {
            List<TranscriptAttemptItem> attempts = new ArrayList<>();

            TranscriptAttemptItem a1 = new TranscriptAttemptItem();
            a1.setCourseCode("IT1001");
            a1.setCredits(new BigDecimal("3"));
            a1.setLetterGrade("D");
            a1.setAttemptNumber(1);
            attempts.add(a1);

            TranscriptAttemptItem a2 = new TranscriptAttemptItem();
            a2.setCourseCode("IT1001");
            a2.setCredits(new BigDecimal("3"));
            a2.setLetterGrade("A");
            a2.setAttemptNumber(2);
            attempts.add(a2);

            BigDecimal cpa = GradeCalculator.calculateCpaFromAttempts(attempts);
            int accumulatedCredits = GradeCalculator.calculateAccumulatedCreditsFromAttempts(attempts);

            assertThat(cpa).isEqualByComparingTo(new BigDecimal("4.00"));
            assertThat(accumulatedCredits).isEqualTo(3);
        }

        @Test
        @DisplayName("Học cải thiện nhưng điểm lần 2 thấp hơn: Lần 1 điểm C (2.0), Lần 2 bị D (1.0) -> Bảo toàn điểm C cao nhất")
        void testImprovementPreservesHighestGradeWhenSecondAttemptIsLower() {
            List<TranscriptAttemptItem> attempts = new ArrayList<>();

            TranscriptAttemptItem a1 = new TranscriptAttemptItem();
            a1.setCourseCode("IT1001");
            a1.setCredits(new BigDecimal("3"));
            a1.setLetterGrade("C");
            a1.setAttemptNumber(1);
            attempts.add(a1);

            TranscriptAttemptItem a2 = new TranscriptAttemptItem();
            a2.setCourseCode("IT1001");
            a2.setCredits(new BigDecimal("3"));
            a2.setLetterGrade("D");
            a2.setAttemptNumber(2);
            attempts.add(a2);

            BigDecimal cpa = GradeCalculator.calculateCpaFromAttempts(attempts);
            assertThat(cpa).isEqualByComparingTo(new BigDecimal("2.00"));
        }

        @Test
        @DisplayName("Chứng chỉ GDTC và GDQP-AN: Cấp chứng chỉ, không tính vào CPA tích lũy")
        void testPhysicalEducationAndDefenseCertificatesExcludedFromCpa() {
            List<TranscriptAttemptItem> attempts = new ArrayList<>();

            TranscriptAttemptItem itCourse = new TranscriptAttemptItem();
            itCourse.setCourseCode("IT1001");
            itCourse.setCredits(new BigDecimal("3"));
            itCourse.setLetterGrade("B"); // 3.0
            attempts.add(itCourse);

            TranscriptAttemptItem gdtcCourse = new TranscriptAttemptItem();
            gdtcCourse.setCourseCode("GDTC1001");
            gdtcCourse.setCourseName("Giáo dục thể chất 1");
            gdtcCourse.setCredits(new BigDecimal("2"));
            gdtcCourse.setLetterGrade("A"); // 4.0
            attempts.add(gdtcCourse);

            BigDecimal cpa = GradeCalculator.calculateCpaFromAttempts(attempts);
            // CPA chỉ tính theo môn IT1001 là 3.00, không bị hòa trộn điểm A của GDTC
            assertThat(cpa).isEqualByComparingTo(new BigDecimal("3.00"));
        }
    }

    @Nested
    @DisplayName("5. Nhóm UNKNOWN / MISSING DATA: Không tự gán điểm = 0 hoặc suy diễn đạt")
    class MissingDataScenarioTests {

        @Test
        @DisplayName("Sinh viên mới chưa có bảng điểm -> CPA và GPA trả về null, không gán 0.0")
        void testNewStudentWithoutGradesReturnsNullCpaAndGpa() {
            StudentProfileFixture emptyStudent = new StudentProfileFixture();
            emptyStudent.setStudentId("std-empty");
            emptyStudent.setCourseAttempts(Collections.emptyList());

            DefaultAcademicFacade facade = new DefaultAcademicFacade(
                    AcademicFixtures.getPolicyDemo(),
                    standardCurriculum,
                    Map.of("std-empty", emptyStudent)
            );

            AcademicStatusResponse res = facade.getAcademicStatus(new AcademicStatusRequest("std-empty", "rev-3.1"));
            assertThat(res.getCpa()).isNull();
            assertThat(res.getGpa()).isNull();
            assertThat(res.getAccumulatedCredits()).isNull();
        }

        @Test
        @DisplayName("Điểm chữ UNKNOWN -> GradeCalculator trả về null")
        void testUnknownLetterGradeReturnsNullGradePoint() {
            assertThat(GradeCalculator.toGradePoint4("UNKNOWN")).isNull();
            assertThat(GradeCalculator.toGradePoint4(null)).isNull();
            assertThat(GradeCalculator.isPassed("UNKNOWN")).isNull();
            assertThat(GradeCalculator.isPassed(null)).isNull();
        }
    }

    @Nested
    @DisplayName("6. Nhóm CYCLE: Phát hiện chu trình phụ thuộc môn học (DAG validation)")
    class CycleDetectionScenarioTests {

        @Test
        @DisplayName("Phát hiện chu trình vòng lặp 2 môn (A -> B -> A) trong CTĐT")
        void testDetectsPrerequisiteCycleDirect() {
            CurriculumFixture cyclicCurriculum = new CurriculumFixture();
            List<CurriculumFixture.CourseDefinitionItem> courses = new ArrayList<>();

            CurriculumFixture.CourseDefinitionItem courseA = new CurriculumFixture.CourseDefinitionItem();
            courseA.setCourseCode("CS_A");
            courseA.setCourseName("Môn A");
            courseA.setPrerequisites(List.of("CS_B")); // A cần B
            courses.add(courseA);

            CurriculumFixture.CourseDefinitionItem courseB = new CurriculumFixture.CourseDefinitionItem();
            courseB.setCourseCode("CS_B");
            courseB.setCourseName("Môn B");
            courseB.setPrerequisites(List.of("CS_A")); // B cần A (tạo chu trình!)
            courses.add(courseB);

            cyclicCurriculum.setCourses(courses);

            String cycle = RuleEvaluator.findPrerequisiteCycle("CS_A", cyclicCurriculum);
            assertThat(cycle).isNotNull();
            assertThat(cycle).contains("CS_A");
            assertThat(cycle).contains("CS_B");

            CourseEligibilityResponse res = RuleEvaluator.checkEligibility("CS_A", null, cyclicCurriculum, "rev-3.1");
            assertThat(res.isEligible()).isFalse();
            assertThat(res.getMissingPrerequisites()).anyMatch(msg -> msg.contains("Cycle detected"));
        }

        @Test
        @DisplayName("Phát hiện chu trình vòng lặp 3 môn (A -> B -> C -> A)")
        void testDetectsPrerequisiteCycleThreeNodes() {
            CurriculumFixture cyclicCurriculum = new CurriculumFixture();
            List<CurriculumFixture.CourseDefinitionItem> courses = new ArrayList<>();

            CurriculumFixture.CourseDefinitionItem a = new CurriculumFixture.CourseDefinitionItem();
            a.setCourseCode("M1");
            a.setPrerequisites(List.of("M2"));
            courses.add(a);

            CurriculumFixture.CourseDefinitionItem b = new CurriculumFixture.CourseDefinitionItem();
            b.setCourseCode("M2");
            b.setPrerequisites(List.of("M3"));
            courses.add(b);

            CurriculumFixture.CourseDefinitionItem c = new CurriculumFixture.CourseDefinitionItem();
            c.setCourseCode("M3");
            c.setPrerequisites(List.of("M1"));
            courses.add(c);

            cyclicCurriculum.setCourses(courses);

            String cycle = RuleEvaluator.findPrerequisiteCycle("M1", cyclicCurriculum);
            assertThat(cycle).isNotNull();
            assertThat(cycle).contains("M1").contains("M2").contains("M3");
        }
    }

    @Nested
    @DisplayName("7. Nhóm COREQUISITE: Kiểm tra môn học song hành")
    class CorequisiteScenarioTests {

        @Test
        @DisplayName("Môn song hành chưa học trong quá khứ và không đăng ký cùng kỳ -> Bị chặn")
        void testCorequisiteNotMetBlocksEligibility() {
            CurriculumFixture coreqCurriculum = new CurriculumFixture();
            CurriculumFixture.CourseDefinitionItem lab = new CurriculumFixture.CourseDefinitionItem();
            lab.setCourseCode("PHY_LAB");
            lab.setCourseName("Thí nghiệm Vật lý");
            lab.setCorequisites(List.of("PHY_THEORY")); // Yêu cầu học song hành Lý thuyết
            coreqCurriculum.setCourses(List.of(lab));

            CourseEligibilityResponse res = RuleEvaluator.checkEligibility("PHY_LAB", null, null, coreqCurriculum, Collections.emptyList(), "rev-3.1");
            assertThat(res.isEligible()).isFalse();
            assertThat(res.getMissingPrerequisites()).anyMatch(msg -> msg.contains("PHY_THEORY") && msg.contains("song hành"));
        }

        @Test
        @DisplayName("Môn song hành được đăng ký đồng thời trong cùng kỳ -> Đủ điều kiện")
        void testCorequisiteMetWhenRegisteredInSameTerm() {
            CurriculumFixture coreqCurriculum = new CurriculumFixture();
            CurriculumFixture.CourseDefinitionItem lab = new CurriculumFixture.CourseDefinitionItem();
            lab.setCourseCode("PHY_LAB");
            lab.setCourseName("Thí nghiệm Vật lý");
            lab.setCorequisites(List.of("PHY_THEORY"));
            coreqCurriculum.setCourses(List.of(lab));

            // Đăng ký PHY_THEORY trong cùng kỳ
            List<String> sameTermCourses = List.of("PHY_THEORY");
            CourseEligibilityResponse res = RuleEvaluator.checkEligibility("PHY_LAB", null, null, coreqCurriculum, sameTermCourses, "rev-3.1");
            assertThat(res.isEligible()).isTrue();
            assertThat(res.getMissingPrerequisites()).isEmpty();
        }
    }

    @Nested
    @DisplayName("8. Nhóm SPI: Tích hợp StudentAcademicRecordProvider")
    class SpiProviderIntegrationTests {

        @Test
        @DisplayName("DefaultAcademicFacade nạp dữ liệu thành công qua StudentAcademicRecordProvider")
        void testDefaultAcademicFacadeWithRecordProvider() {
            StudentAcademicRecordProvider mockProvider = studentId -> {
                StudentAcademicRecord record = new StudentAcademicRecord();
                record.setStudentId(studentId);
                record.setDataRevision("rev-provider-1");
                record.setTranscriptStatus(TranscriptStatus.CONFIRMED);

                TranscriptAttemptItem att1 = new TranscriptAttemptItem();
                att1.setCourseCode("IT1001");
                att1.setCredits(new BigDecimal("3"));
                att1.setLetterGrade("A");
                record.setAttempts(List.of(att1));

                CertificateStatusItem cert1 = new CertificateStatusItem();
                cert1.setRequirementCode("ENG_B1");
                cert1.setName("Chuẩn đầu ra Tiếng Anh B1");
                cert1.setCategory("NGOẠI NGỮ");
                cert1.setStatus(CertificateStatus.ACHIEVED);
                record.setCertificates(List.of(cert1));

                return record;
            };

            AcademicFacade providerFacade = new DefaultAcademicFacade(mockProvider);

            // Kiểm tra getAcademicStatus
            AcademicStatusResponse status = providerFacade.getAcademicStatus(new AcademicStatusRequest("std-provider-01", "rev-0"));
            assertThat(status.getStudentId()).isEqualTo("std-provider-01");
            assertThat(status.getCpa()).isEqualByComparingTo(new BigDecimal("4.00"));
            assertThat(status.getAccumulatedCredits()).isEqualTo(3);

            // Kiểm tra runGraduationAudit
            GraduationAuditResponse audit = providerFacade.runGraduationAudit(new GraduationAuditRequest("std-provider-01", "rev-0"));
            assertThat(audit.getStudentId()).isEqualTo("std-provider-01");
            assertThat(audit.getAccumulatedCredits()).isEqualTo(3);
            assertThat(audit.getChecklist()).anyMatch(item -> item.getName().contains("Tiếng Anh B1") && item.isCompleted());
        }
    }

    @Nested
    @DisplayName("9. Nhóm CAPABILITY: readyCapabilities() công bố đúng 3 năng lực cốt lõi Task 3.1")
    class ReadyCapabilitiesTests {

        @Test
        @DisplayName("readyCapabilities chỉ công bố GET_ACADEMIC_STATUS, CHECK_COURSE_ELIGIBILITY, RUN_GRADUATION_AUDIT")
        void testReadyCapabilitiesDeclaration() {
            Set<AcademicCapability> ready = defaultFacade.readyCapabilities();

            assertThat(ready).containsExactlyInAnyOrder(
                    AcademicCapability.GET_ACADEMIC_STATUS,
                    AcademicCapability.CHECK_COURSE_ELIGIBILITY,
                    AcademicCapability.RUN_GRADUATION_AUDIT
            );

            // Các capability thuộc Task 3.6 và 3.11 chưa được công bố sẵn sàng
            assertThat(ready).doesNotContain(AcademicCapability.GENERATE_STUDY_PLAN);
            assertThat(ready).doesNotContain(AcademicCapability.VALIDATE_STUDY_PLAN);
            assertThat(ready).doesNotContain(AcademicCapability.SIMULATE_GRADES);
            assertThat(ready).doesNotContain(AcademicCapability.RANK_RETAKE_COURSES);
            assertThat(ready).doesNotContain(AcademicCapability.CALCULATE_TARGET_GRADES);
            assertThat(ready).doesNotContain(AcademicCapability.RECONCILE_STUDY_PLAN);
        }
    }

    @Nested
    @DisplayName("10. Nhóm DETERMINISM: Chạy lặp lại 100 lần cùng input cho cùng 100% output")
    class DeterminismTests {

        @Test
        @DisplayName("Kiểm tra tính đơn định qua 100 lần chạy liên tiếp")
        void testDeterminismAcross100Runs() {
            AcademicStatusRequest statusReq = new AcademicStatusRequest("std-2026-001", "rev-1001");
            CourseEligibilityRequest eligReq = new CourseEligibilityRequest("std-2026-001", "IT2001", "2026_1", "rev-1001");
            GraduationAuditRequest auditReq = new GraduationAuditRequest("std-2026-001", "rev-1001");

            AcademicStatusResponse baseStatus = defaultFacade.getAcademicStatus(statusReq);
            CourseEligibilityResponse baseElig = defaultFacade.checkCourseEligibility(eligReq);
            GraduationAuditResponse baseAudit = defaultFacade.runGraduationAudit(auditReq);

            for (int i = 0; i < 100; i++) {
                AcademicStatusResponse s = defaultFacade.getAcademicStatus(statusReq);
                CourseEligibilityResponse e = defaultFacade.checkCourseEligibility(eligReq);
                GraduationAuditResponse a = defaultFacade.runGraduationAudit(auditReq);

                assertThat(s.getCpa()).isEqualByComparingTo(baseStatus.getCpa());
                assertThat(s.getAccumulatedCredits()).isEqualTo(baseStatus.getAccumulatedCredits());
                assertThat(s.getRiskLevel()).isEqualTo(baseStatus.getRiskLevel());

                assertThat(e.isEligible()).isEqualTo(baseElig.isEligible());
                assertThat(e.getMissingPrerequisites()).containsExactlyElementsOf(baseElig.getMissingPrerequisites());

                assertThat(a.getAccumulatedCredits()).isEqualTo(baseAudit.getAccumulatedCredits());
                assertThat(a.isEligibleForGraduation()).isEqualTo(baseAudit.isEligibleForGraduation());
                assertThat(a.getChecklist().size()).isEqualTo(baseAudit.getChecklist().size());
            }
        }
    }
}
