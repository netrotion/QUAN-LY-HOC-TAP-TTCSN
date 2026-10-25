package vn.haui.advisor.academic;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.academic.engine.GradeCalculator;
import vn.haui.advisor.academic.fixture.AcademicFixtures;
import vn.haui.advisor.academic.model.CurriculumFixture;
import vn.haui.advisor.academic.model.PolicyDemo;
import vn.haui.advisor.academic.model.StudentProfileFixture;
import vn.haui.advisor.academic.service.DefaultAcademicFacade;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.ports.StudentAcademicRecordProvider;

import java.math.BigDecimal;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Bộ kiểm thử hồi quy và nghiệm thu Task 4.3c (Academic Regression Suite).
 * Xác minh toàn diện việc khắc phục 7 điểm sai lệch từ API nối thật:
 * 1. totalCreditsRequired động theo CTĐT (150 TC cho KTPM, 135 TC cho IT).
 * 2. Tính khối đại cương từ bảng điểm thực tế, không gán sẵn 100% cho tài khoản trống.
 * 3. Xử lý thiếu bảng điểm: trả null cho accumulatedCredits, cpa, riskLevel thay vì gán 0 và NORMAL.
 * 4. Audit pendingActions: deadline là null (không phải text), status là PENDING (không phải "Chưa nộp").
 * 5. Tính tín chỉ tích lũy chính xác với học phần có tín chỉ lẻ (1.5 TC).
 * 6. Tích hợp StudentAcademicRecordProvider xuyên suốt các công cụ.
 * 7. Thẩm định kế hoạch chuyên sâu trong validateStudyPlan: tiên quyết, song hành, trùng lặp, môn ngoài CTĐT, môn đã đạt.
 */
@DisplayName("Task 4.3c: Bộ kiểm thử hồi quy & hoàn thiện công cụ học vụ (Academic Regression Suite)")
public class Task43cRegressionTest {

    private PolicyDemo policy;
    private CurriculumFixture curriculumKtpm;
    private CurriculumFixture curriculumIt;
    private Map<String, StudentProfileFixture> profiles;
    private DefaultAcademicFacade defaultFacade;

    @BeforeEach
    void setUp() {
        policy = AcademicFixtures.getPolicyDemo();
        curriculumKtpm = AcademicFixtures.getCurriculumV1();
        curriculumIt = AcademicFixtures.getCurriculum();
        profiles = new HashMap<>(AcademicFixtures.getStudentProfiles());
        defaultFacade = new DefaultAcademicFacade(policy, curriculumKtpm, profiles);
    }

    // =========================================================================
    // 1. DYNAMIC TOTAL CREDITS REQUIRED
    // =========================================================================
    @Test
    @DisplayName("4.3c.1: getAcademicStatus và runGraduationAudit lấy totalCreditsRequired = 150 cho CTĐT KTPM")
    void testDynamicTotalCreditsRequired_KtpmCurriculum() {
        // Sinh viên KTPM 2024604757 thuộc CTĐT KTPM (150 TC)
        AcademicStatusRequest statusReq = new AcademicStatusRequest("2024604757", "rev-4.3c");
        AcademicStatusResponse statusRes = defaultFacade.getAcademicStatus(statusReq);

        assertThat(statusRes).isNotNull();
        assertThat(statusRes.getTotalCreditsRequired()).isEqualTo(150);

        GraduationAuditRequest auditReq = new GraduationAuditRequest("2024604757", "rev-4.3c");
        GraduationAuditResponse auditRes = defaultFacade.runGraduationAudit(auditReq);

        assertThat(auditRes).isNotNull();
        assertThat(auditRes.getTotalCreditsRequired()).isEqualTo(150);
        // % hoàn thành phải tính trên mẫu số 150
        int expectedPct = auditRes.getAccumulatedCredits() * 100 / 150;
        assertThat(auditRes.getCompletedPercentage()).isEqualTo(expectedPct);
    }

    @Test
    @DisplayName("4.3c.2: getAcademicStatus và runGraduationAudit lấy totalCreditsRequired = 135 cho CTĐT CNTT")
    void testDynamicTotalCreditsRequired_ItCurriculum() {
        StudentProfileFixture itStudent = new StudentProfileFixture();
        itStudent.setStudentId("std-it-01");
        itStudent.setMajorCode("CNTT");
        itStudent.setCpa(new BigDecimal("3.00"));
        itStudent.setAccumulatedCredits(60.0);
        profiles.put("std-it-01", itStudent);

        DefaultAcademicFacade itFacade = new DefaultAcademicFacade(policy, curriculumIt, profiles);

        AcademicStatusResponse statusRes = itFacade.getAcademicStatus(new AcademicStatusRequest("std-it-01", "rev-it"));
        assertThat(statusRes.getTotalCreditsRequired()).isEqualTo(135);

        GraduationAuditResponse auditRes = itFacade.runGraduationAudit(new GraduationAuditRequest("std-it-01", "rev-it"));
        assertThat(auditRes.getTotalCreditsRequired()).isEqualTo(135);
    }

    // =========================================================================
    // 2. AUDIT KHỐI ĐẠI CƯƠNG TÍNH TỪ BẢNG ĐIỂM
    // =========================================================================
    @Test
    @DisplayName("4.3c.3: Tài khoản chưa có bảng điểm không bị gán sẵn 100% Khối đại cương")
    void testAuditGeneralEducationBlock_EmptyTranscript_NotCompleted() {
        StudentProfileFixture emptyStudent = new StudentProfileFixture();
        emptyStudent.setStudentId("std-empty-transcript");
        emptyStudent.setMajorCode("CT1085");
        emptyStudent.setCourseAttempts(Collections.emptyList());
        emptyStudent.setAccumulatedCredits(0.0);
        profiles.put("std-empty-transcript", emptyStudent);

        DefaultAcademicFacade facade = new DefaultAcademicFacade(policy, curriculumKtpm, profiles);
        GraduationAuditResponse res = facade.runGraduationAudit(new GraduationAuditRequest("std-empty-transcript", "rev-empty"));

        assertThat(res).isNotNull();
        Optional<AuditChecklistItem> genBlock = res.getChecklist().stream()
                .filter(item -> item.getName().contains("đại cương") || "KHỐI ĐẠI CƯƠNG".equalsIgnoreCase(item.getCategory()))
                .findFirst();

        assertThat(genBlock).isPresent();
        assertThat(genBlock.get().isCompleted()).isFalse();
        assertThat(genBlock.get().getAccumulatedCredits()).isEqualTo(0);
    }

    // =========================================================================
    // 3. THIẾU BẢNG ĐIỂM TRẢ NULL (UNKNOWN), KHÔNG GÁN 0 VÀ NORMAL
    // =========================================================================
    @Test
    @DisplayName("4.3c.4: Thiếu bảng điểm hoàn toàn trả cpa=null, accumulatedCredits=null, riskLevel=null")
    void testMissingTranscript_ReturnsNullsInsteadOfZeroAndNormal() {
        StudentAcademicRecord emptyRecord = new StudentAcademicRecord();
        emptyRecord.setStudentId("std-brand-new");
        emptyRecord.setCurriculumId("curriculum-ktpm-haui-2024");
        emptyRecord.setDataRevision("rev-0");
        emptyRecord.setAttempts(Collections.emptyList());
        emptyRecord.setCertificates(Collections.emptyList());

        StudentAcademicRecordProvider emptyProvider = studentId -> emptyRecord;

        DefaultAcademicFacade providerFacade = new DefaultAcademicFacade(emptyProvider, policy, curriculumKtpm, Map.of());
        AcademicStatusResponse res = providerFacade.getAcademicStatus(new AcademicStatusRequest("std-brand-new", "rev-0"));

        assertThat(res).isNotNull();
        assertThat(res.getCpa()).isNull();
        assertThat(res.getAccumulatedCredits()).isNull();
        assertThat(res.getRiskLevel()).isNull();
        assertThat(res.getWarnings()).anyMatch(w -> w.contains("bảng điểm") || w.contains("chưa có"));
    }

    // =========================================================================
    // 4. AUDIT PENDING ACTIONS: DEADLINE VÀ STATUS
    // =========================================================================
    @Test
    @DisplayName("4.3c.5: Pending actions có deadline là null (hoặc yyyy-MM-dd) và status là PENDING")
    void testAuditPendingActions_DeadlineAndStatusConformance() {
        StudentAcademicRecord record = new StudentAcademicRecord();
        record.setStudentId("std-cert-01");
        record.setCurriculumId("curriculum-ktpm-haui-2024");
        record.setDataRevision("rev-1");
        record.setAttempts(Collections.emptyList());
        CertificateStatusItem cert1 = new CertificateStatusItem();
        cert1.setRequirementCode("CERT_ENG");
        cert1.setName("Tiếng Anh chuẩn đầu ra (TOEIC)");
        cert1.setStatus(CertificateStatus.NOT_ACHIEVED);
        cert1.setVerification(CertificateVerification.SELF_DECLARED);

        CertificateStatusItem cert2 = new CertificateStatusItem();
        cert2.setRequirementCode("CERT_IT");
        cert2.setName("Tin học chuẩn đầu ra (MOS)");
        cert2.setStatus(CertificateStatus.UNKNOWN);
        cert2.setVerification(CertificateVerification.NOT_DECLARED);

        record.setCertificates(List.of(cert1, cert2));

        StudentAcademicRecordProvider certProvider = studentId -> record;

        DefaultAcademicFacade certFacade = new DefaultAcademicFacade(certProvider, policy, curriculumKtpm, Map.of());
        GraduationAuditResponse res = certFacade.runGraduationAudit(new GraduationAuditRequest("std-cert-01", "rev-1"));

        assertThat(res).isNotNull();
        assertThat(res.getPendingActions()).isNotEmpty();
        for (AuditCertificateAction action : res.getPendingActions()) {
            // Deadline không được là chuỗi tự do "Trước kỳ tốt nghiệp"
            if (action.getDeadline() != null) {
                assertThat(action.getDeadline()).matches("^\\d{4}-\\d{2}-\\d{2}$");
            }
            // Status phải là PENDING hoặc DONE
            assertThat(action.getStatus()).isIn("PENDING", "DONE");
        }
    }

    // =========================================================================
    // 5. FRACTIONAL CREDITS CALCULATION
    // =========================================================================
    @Test
    @DisplayName("4.3c.6: GradeCalculator tính chính xác tín chỉ lẻ 1.5 TC và không bị mất 0.5 khi làm tròn từng môn")
    void testFractionalCreditsCalculation() {
        List<TranscriptAttemptItem> attempts = new ArrayList<>();

        TranscriptAttemptItem c1 = new TranscriptAttemptItem();
        c1.setCourseCode("PE1001");
        c1.setCredits(new BigDecimal("1.5"));
        c1.setLetterGrade("A");
        attempts.add(c1);

        TranscriptAttemptItem c2 = new TranscriptAttemptItem();
        c2.setCourseCode("PE1002");
        c2.setCredits(new BigDecimal("1.5"));
        c2.setLetterGrade("B");
        attempts.add(c2);

        TranscriptAttemptItem c3 = new TranscriptAttemptItem();
        c3.setCourseCode("IT1001");
        c3.setCredits(new BigDecimal("3.0"));
        c3.setLetterGrade("A");
        attempts.add(c3);

        // 1.5 + 1.5 + 3.0 = 6.0 TC (nếu intValue() từng môn sẽ thành 1 + 1 + 3 = 5 TC -> SAI)
        int totalCredits = GradeCalculator.calculateAccumulatedCreditsFromAttempts(attempts);
        assertThat(totalCredits).isEqualTo(6);

        BigDecimal exactCredits = GradeCalculator.calculateAccumulatedCreditsExactFromAttempts(attempts);
        assertThat(exactCredits).isEqualByComparingTo(new BigDecimal("6.0"));
    }

    // =========================================================================
    // 6. THẨM ĐỊNH KẾ HOẠCH CHUYÊN SÂU (VALIDATE STUDY PLAN)
    // =========================================================================
    @Test
    @DisplayName("4.3c.7: validateStudyPlan phát hiện vi phạm môn tiên quyết xếp cùng kỳ hoặc thiếu")
    void testValidateStudyPlan_DetectsPrerequisiteViolations() {
        // FL6288 yêu cầu môn học trước FL6287
        // Xếp FL6288 vào kỳ 1 mà chưa học FL6287
        PlannedSemesterItem sem1 = new PlannedSemesterItem(1, "2026_1", "Học kỳ 1", List.of(
                new PlannedCourseItem("FL6288", "Tiếng Hàn cơ bản 2", 5, "B", "STANDARD"),
                new PlannedCourseItem("IT6015", "Kỹ thuật đồ họa", 3, "B", "STANDARD"),
                new PlannedCourseItem("IT6016", "Nhập môn an toàn thông tin", 3, "B", "STANDARD")
        ), 11, new BigDecimal("3.00"));

        ValidateStudyPlanRequest req = new ValidateStudyPlanRequest("p-prereq-fail", "2024604757", List.of(sem1), 1, "rev-1");
        ValidateStudyPlanResponse res = defaultFacade.validateStudyPlan(req);

        assertThat(res.isValid()).isFalse();
        assertThat(res.getStatus()).isEqualTo(StudyPlanStatus.DRAFT);
        assertThat(res.getViolations()).anyMatch(v -> v.contains("FL6287") || v.contains("tiên quyết") || v.contains("học trước"));
    }

    @Test
    @DisplayName("4.3c.8: validateStudyPlan phát hiện môn trùng lặp trong kế hoạch")
    void testValidateStudyPlan_DetectsDuplicateCourses() {
        PlannedSemesterItem sem1 = new PlannedSemesterItem(1, "2026_1", "Học kỳ 1", List.of(
                new PlannedCourseItem("IT6015", "Kỹ thuật đồ họa", 3, "B", "STANDARD"),
                new PlannedCourseItem("IT6016", "Nhập môn an toàn thông tin", 3, "B", "STANDARD"),
                new PlannedCourseItem("IT6019", "Trí tuệ nhân tạo", 3, "B", "STANDARD"),
                new PlannedCourseItem("IT6020", "Học máy", 3, "B", "STANDARD")
        ), 12, new BigDecimal("3.00"));

        // Kỳ 2 lại xếp lại IT6015 (trùng lặp)
        PlannedSemesterItem sem2 = new PlannedSemesterItem(2, "2026_2", "Học kỳ 2", List.of(
                new PlannedCourseItem("IT6015", "Kỹ thuật đồ họa", 3, "B", "STANDARD"),
                new PlannedCourseItem("IT6030", "Lập trình Web", 3, "B", "STANDARD"),
                new PlannedCourseItem("IT6031", "Điện toán đám mây", 3, "B", "STANDARD"),
                new PlannedCourseItem("IT6032", "DevOps", 3, "B", "STANDARD")
        ), 12, new BigDecimal("3.00"));

        ValidateStudyPlanRequest req = new ValidateStudyPlanRequest("p-dup-fail", "2024604757", List.of(sem1, sem2), 2, "rev-1");
        ValidateStudyPlanResponse res = defaultFacade.validateStudyPlan(req);

        assertThat(res.isValid()).isFalse();
        assertThat(res.getViolations()).anyMatch(v -> v.contains("IT6015") && v.contains("trùng"));
        assertThat(res.getPlanVersion()).isEqualTo(2);
    }

    @Test
    @DisplayName("4.3c.9: validateStudyPlan phát hiện môn không tồn tại trong CTĐT")
    void testValidateStudyPlan_DetectsCourseOutsideCurriculum() {
        PlannedSemesterItem sem1 = new PlannedSemesterItem(1, "2026_1", "Học kỳ 1", List.of(
                new PlannedCourseItem("UNKNOWN999", "Môn không có trong CTĐT", 3, "A", "STANDARD"),
                new PlannedCourseItem("IT6015", "Kỹ thuật đồ họa", 3, "B", "STANDARD"),
                new PlannedCourseItem("IT6016", "Nhập môn an toàn thông tin", 3, "B", "STANDARD"),
                new PlannedCourseItem("IT6019", "Trí tuệ nhân tạo", 3, "B", "STANDARD")
        ), 12, new BigDecimal("3.00"));

        ValidateStudyPlanRequest req = new ValidateStudyPlanRequest("p-out-fail", "2024604757", List.of(sem1), 1, "rev-1");
        ValidateStudyPlanResponse res = defaultFacade.validateStudyPlan(req);

        assertThat(res.isValid()).isFalse();
        assertThat(res.getViolations()).anyMatch(v -> v.contains("UNKNOWN999") && v.contains("chương trình đào tạo"));
    }

    @Test
    @DisplayName("4.3c.10: validateStudyPlan phát hiện đăng ký lại môn đã đạt điểm cao (A/B) mà không đủ điều kiện cải thiện")
    void testValidateStudyPlan_DetectsAlreadyPassedHighGradeCourse() {
        // Sinh viên 2024604757 đã đạt IT6035 với điểm A
        PlannedSemesterItem sem1 = new PlannedSemesterItem(1, "2026_1", "Học kỳ 1", List.of(
                new PlannedCourseItem("IT6035", "Lập trình C++", 3, "A", "IMPROVE"),
                new PlannedCourseItem("IT6015", "Kỹ thuật đồ họa", 3, "B", "STANDARD"),
                new PlannedCourseItem("IT6016", "Nhập môn an toàn thông tin", 3, "B", "STANDARD"),
                new PlannedCourseItem("IT6019", "Trí tuệ nhân tạo", 3, "B", "STANDARD")
        ), 12, new BigDecimal("3.00"));

        ValidateStudyPlanRequest req = new ValidateStudyPlanRequest("p-pass-fail", "2024604757", List.of(sem1), 1, "rev-1");
        ValidateStudyPlanResponse res = defaultFacade.validateStudyPlan(req);

        // IT6035 đã đạt điểm A (4.0) nên không được học cải thiện theo BR-06
        assertThat(res.isValid()).isFalse();
        assertThat(res.getViolations()).anyMatch(v -> v.contains("IT6035") && (v.contains("đã đạt") || v.contains("cải thiện")));
    }

    // =========================================================================
    // 7. PROVIDER-BACKED GENERATE & WHAT-IF ENGINE
    // =========================================================================
    @Test
    @DisplayName("4.3c.11: DefaultAcademicFacade hỗ trợ đầy đủ StudentAcademicRecordProvider cho generateStudyPlan")
    void testDefaultAcademicFacade_UsesProviderForGenerateStudyPlan() {
        TranscriptAttemptItem att = new TranscriptAttemptItem();
        att.setCourseCode("IT6035");
        att.setCourseName("Toán kỹ thuật");
        att.setCredits(new BigDecimal("3.0"));
        att.setLetterGrade("A");
        att.setSemesterCode("2024_1");

        StudentAcademicRecord record = new StudentAcademicRecord();
        record.setStudentId("std-provider-live");
        record.setCurriculumId("curriculum-ktpm-haui-2024");
        record.setDataRevision("rev-live");
        record.setAttempts(List.of(att));
        record.setCertificates(Collections.emptyList());

        StudentAcademicRecordProvider provider = studentId -> "std-provider-live".equals(studentId) ? record : null;

        DefaultAcademicFacade liveFacade = new DefaultAcademicFacade(provider, policy, curriculumKtpm, Map.of());
        GenerateStudyPlanRequest req = new GenerateStudyPlanRequest("std-provider-live", "2027_2", new BigDecimal("3.50"), 18, false, "rev-live");

        GenerateStudyPlanResponse res = liveFacade.generateStudyPlan(req);
        assertThat(res).isNotNull();
        assertThat(res.getStudentId()).isEqualTo("std-provider-live");
        // Không xếp lại môn IT6035 đã đạt ở DB
        assertThat(res.getSemesters().stream()
                .flatMap(s -> s.getCourses().stream())
                .anyMatch(c -> "IT6035".equalsIgnoreCase(c.getCourseCode()))).isFalse();
    }
}
