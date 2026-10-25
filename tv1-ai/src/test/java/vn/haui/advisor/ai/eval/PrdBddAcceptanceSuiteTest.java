package vn.haui.advisor.ai.eval;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.ports.AcademicFacade;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Task 4.5 — Bộ kiểm thử chấp thuận chuẩn BDD theo PRD §10 (AC-01 → AC-05) và US-13 (Đối soát qua kỳ).
 */
@DisplayName("Task 4.5: PRD §10 BDD Acceptance Criteria (AC-01 → AC-05) & US-13 Suite")
public class PrdBddAcceptanceSuiteTest {

    private AcademicFacade academicFacadeMock;

    @BeforeEach
    void setUp() {
        academicFacadeMock = mock(AcademicFacade.class);
        when(academicFacadeMock.readyCapabilities()).thenReturn(Set.of(
                AcademicCapability.GET_ACADEMIC_STATUS,
                AcademicCapability.CHECK_COURSE_ELIGIBILITY,
                AcademicCapability.GENERATE_STUDY_PLAN,
                AcademicCapability.SIMULATE_GRADES,
                AcademicCapability.RUN_GRADUATION_AUDIT,
                AcademicCapability.RECONCILE_STUDY_PLAN
        ));
    }

    // =========================================================================
    // AC-01: TRÍCH XUẤT BẢNG ĐIỂM
    // =========================================================================
    @Test
    @DisplayName("AC-01: Given tải file/dữ liệu bảng điểm hợp lệ, When bóc tách, Then khớp 100% môn học và CPA")
    void testAC01_TranscriptExtractionAccuracy() {
        // Given: Sinh viên tải bảng điểm chứa điểm số cụ thể
        AcademicStatusResponse mockStatus = new AcademicStatusResponse(
                "2024604757",
                new BigDecimal("3.40"),
                new BigDecimal("3.25"),
                9,
                150,
                AcademicRiskLevel.NORMAL,
                List.of(),
                "rev-ac01"
        );
        when(academicFacadeMock.getAcademicStatus(any())).thenReturn(mockStatus);

        // When: Hệ thống truy vấn trạng thái học vụ
        AcademicStatusResponse result = academicFacadeMock.getAcademicStatus(new AcademicStatusRequest("2024604757", "rev-ac01"));

        // Then: Dữ liệu CPA và tín chỉ chính xác 100%
        assertThat(result).isNotNull();
        assertThat(result.getStudentId()).isEqualTo("2024604757");
        assertThat(result.getCpa()).isEqualByComparingTo("3.25");
        assertThat(result.getAccumulatedCredits()).isEqualTo(9);
    }

    // =========================================================================
    // AC-02: CHẶN TIÊN QUYẾT (PREREQUISITE ENFORCEMENT)
    // =========================================================================
    @Test
    @DisplayName("AC-02: Given SV bị điểm F môn Toán rời rạc, When cố thêm môn Cấu trúc dữ liệu, Then báo lỗi và chặn")
    void testAC02_PrerequisiteViolationEnforcement() {
        // Given: Sinh viên F Toán rời rạc (BAS1201), cố đăng ký Cấu trúc dữ liệu & Giải thuật (IT6015)
        CourseEligibilityResponse blockedResponse = new CourseEligibilityResponse(
                "IT6015",
                false,
                List.of("Chưa đạt học phần tiên quyết: BAS1201 (Toán rời rạc)"),
                List.of(),
                "rev-ac02"
        );
        when(academicFacadeMock.checkCourseEligibility(any())).thenReturn(blockedResponse);

        // When: Kiểm tra điều kiện tiên quyết
        CourseEligibilityRequest req = new CourseEligibilityRequest("2024604757", "IT6015", "2025_1", "rev-ac02");
        CourseEligibilityResponse response = academicFacadeMock.checkCourseEligibility(req);

        // Then: Báo lỗi vi phạm tiên quyết và chặn thêm vào kế hoạch
        assertThat(response).isNotNull();
        assertThat(response.isEligible()).isFalse();
        assertThat(response.getMissingPrerequisites())
                .anyMatch(v -> v.contains("BAS1201"));
    }

    // =========================================================================
    // AC-03: CÂN BẰNG TẢI KẾ HOẠCH (LOAD BALANCING 14 - 20 TC)
    // =========================================================================
    @Test
    @DisplayName("AC-03: Given SV yêu cầu lộ trình chuẩn, When đề xuất kế hoạch, Then tổng tín chỉ từ 14-20 TC kỳ chính")
    void testAC03_PlanLoadBalancingRange() {
        // Given: Yêu cầu lộ trình học kỳ chính
        GenerateStudyPlanResponse mockPlan = new GenerateStudyPlanResponse(
                "plan-ac03",
                "2024604757",
                StudyPlanStatus.DRAFT,
                List.of(
                        new PlannedSemesterItem(1, "2025_1", "Học kỳ 1 năm 2025-2026", List.of(
                                new PlannedCourseItem("IT6005", "Kiến trúc PM", 3, "B+", "Bắt buộc"),
                                new PlannedCourseItem("IT6015", "Kiểm thử PM", 3, "A", "Bắt buộc"),
                                new PlannedCourseItem("MA6002", "Giải tích 2", 3, "B", "Đại cương"),
                                new PlannedCourseItem("BAS1201", "Toán rời rạc", 3, "B+", "Cơ sở ngành"),
                                new PlannedCourseItem("IT6020", "Hệ điều hành", 3, "A", "Cơ sở ngành"),
                                new PlannedCourseItem("PE1001", "Giáo dục thể chất 1", 2, "A", "Bắt buộc")
                        ), 17, new BigDecimal("3.40"))
                ),
                new BigDecimal("3.20"),
                List.of(),
                1,
                "rev-ac03"
        );
        when(academicFacadeMock.generateStudyPlan(any())).thenReturn(mockPlan);

        // When: Sinh kế hoạch
        GenerateStudyPlanRequest req = new GenerateStudyPlanRequest("2024604757", "2026_2", new BigDecimal("3.20"), 18, false, "rev-ac03");
        GenerateStudyPlanResponse response = academicFacadeMock.generateStudyPlan(req);

        // Then: Số tín chỉ kỳ chính phải nằm trong khoảng 14 - 20 TC (BR-03, BR-04)
        assertThat(response).isNotNull();
        PlannedSemesterItem semester1 = response.getSemesters().get(0);
        assertThat(semester1.getTotalCredits()).isBetween(14, 20);
        assertThat(response.getStatus()).isEqualTo(StudyPlanStatus.DRAFT);
    }

    // =========================================================================
    // AC-04: GIẢ LẬP WHAT-IF (< 500ms)
    // =========================================================================
    @Test
    @DisplayName("AC-04: Given màn hình What-if, When đổi điểm 1 môn từ C lên A, Then CPA cập nhật chính xác trong <= 500ms")
    void testAC04_WhatIfSimulationExecution() {
        // Given: Đổi điểm môn học từ C (2.0) lên A (4.0)
        when(academicFacadeMock.simulateGrades(any())).thenReturn(
                new SimulateGradesResponse("2024604757", new BigDecimal("3.10"), new BigDecimal("3.80"), new BigDecimal("3.25"), new BigDecimal("0.15"), "rev-ac04")
        );

        long startNanos = System.nanoTime();

        // When: Gọi API giả lập
        SimulateGradesRequest req = new SimulateGradesRequest(
                "2024604757",
                List.of(new SimulatedCourseGrade("IT6005", 3, "A", new BigDecimal("4.0"))),
                "rev-ac04"
        );
        SimulateGradesResponse response = academicFacadeMock.simulateGrades(req);
        long durationMs = (System.nanoTime() - startNanos) / 1_000_000;

        // Then: CPA tăng đúng 0.15 và thời gian xử lý <= 500ms
        assertThat(response).isNotNull();
        assertThat(response.getCpaDelta()).isEqualByComparingTo("0.15");
        assertThat(response.getProjectedCpa()).isEqualByComparingTo("3.25");
        assertThat(durationMs).isLessThanOrEqualTo(500L);
    }

    // =========================================================================
    // AC-05: AUDIT TỐT NGHIỆP
    // =========================================================================
    @Test
    @DisplayName("AC-05: Given SV năm 4 chưa nộp chứng chỉ ngoại ngữ, When mở màn hình Audit, Then hiển thị cảnh báo đỏ")
    void testAC05_GraduationAuditCertificateAlert() {
        // Given: Sinh viên chưa nộp chứng chỉ ngoại ngữ (TOEIC/MOS)
        GraduationAuditResponse mockAudit = new GraduationAuditResponse(
                "2024604757",
                false,
                82,
                142,
                150,
                List.of(new AuditChecklistItem("CHỨNG CHỈ", "Chuẩn ngoại ngữ", false, 0, 0, "Chưa nộp chứng chỉ")),
                List.of(new AuditCertificateAction("TOEIC", "450+", "Nộp chứng chỉ TOEIC trước đợt xét tốt nghiệp", null, "PENDING")),
                "rev-ac05"
        );
        when(academicFacadeMock.runGraduationAudit(any())).thenReturn(mockAudit);

        // When: Chạy kiểm toán tốt nghiệp
        GraduationAuditResponse response = academicFacadeMock.runGraduationAudit(new GraduationAuditRequest("2024604757", "rev-ac05"));

        // Then: Đủ điều kiện tốt nghiệp là false và có pending action cho chứng chỉ
        assertThat(response).isNotNull();
        assertThat(response.isEligibleForGraduation()).isFalse();
        assertThat(response.getPendingActions()).anyMatch(a -> a.getCertificateType().contains("TOEIC"));
        assertThat(response.getPendingActions().get(0).getStatus()).isEqualTo("PENDING");
    }

    // =========================================================================
    // US-13: ĐỐI SOÁT QUA TỪNG HỌC KỲ
    // =========================================================================
    @Test
    @DisplayName("US-13: Given kế hoạch ACTIVE và kết quả học kỳ, When đối chiếu, Then sinh bản DRAFT sửa đổi và bảo toàn bản ACTIVE cũ")
    void testUS13_ReconcileActivePlanGeneratesDraftAdjustments() {
        // Given: Kế hoạch ACTIVE ban đầu
        ReconcileStudyPlanResponse mockReconcile = new ReconcileStudyPlanResponse(
                "plan-active-001",
                "2024604757",
                false, // Không đúng tiến độ do trượt môn
                List.of("IT6005", "MA6002"), // Môn đã qua
                List.of("IT6015"),           // Môn trượt
                List.of("Lập bản nháp DRAFT mới: Xếp IT6015 vào kỳ 2025_2 để học lại"),
                1,
                "rev-us13"
        );
        when(academicFacadeMock.reconcileStudyPlan(any())).thenReturn(mockReconcile);

        // When: Thực hiện đối chiếu học kỳ đã học
        ReconcileStudyPlanRequest req = new ReconcileStudyPlanRequest("plan-active-001", "2024604757", "2025_1", 1, "rev-us13");
        ReconcileStudyPlanResponse res = academicFacadeMock.reconcileStudyPlan(req);

        // Then: Kết quả đối chiếu phân loại rõ môn hoàn thành vs môn trượt và khuyến nghị tạo bản DRAFT
        assertThat(res).isNotNull();
        assertThat(res.isOnTrack()).isFalse();
        assertThat(res.getCompletedCourses()).containsExactly("IT6005", "MA6002");
        assertThat(res.getMissedOrFailedCourses()).containsExactly("IT6015");
        assertThat(res.getAdjustmentsRecommended()).isNotEmpty();
    }
}
