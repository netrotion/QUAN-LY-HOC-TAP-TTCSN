package vn.haui.advisor.platform.web;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.haui.advisor.contracts.dto.CalculateTargetGradesRequest;
import vn.haui.advisor.contracts.dto.CalculateTargetGradesResponse;
import vn.haui.advisor.contracts.dto.RankRetakeCoursesRequest;
import vn.haui.advisor.contracts.dto.RankRetakeCoursesResponse;
import vn.haui.advisor.contracts.dto.SimulateGradesRequest;
import vn.haui.advisor.contracts.dto.SimulateGradesResponse;
import vn.haui.advisor.contracts.ports.StudentContextProvider;
import vn.haui.advisor.platform.academic.AcademicApiService;

/**
 * What-if, học cải thiện theo ROI và mục tiêu ngược (tag Simulation) trên AcademicFacade thật. Chỉ xem thử: không ghi bảng
 * điểm hay kế hoạch. Danh tính chỉ lấy từ phiên đăng nhập; studentId trong body bị bỏ qua.
 */
@RestController
@RequestMapping("/api/v1/simulation")
public class SimulationController {

    private final StudentContextProvider studentContextProvider;
    private final AcademicApiService academicApiService;

    public SimulationController(StudentContextProvider studentContextProvider, AcademicApiService academicApiService) {
        this.studentContextProvider = studentContextProvider;
        this.academicApiService = academicApiService;
    }

    @PostMapping("/grades")
    public SimulateGradesResponse simulateGrades(@RequestBody SimulateGradesRequest request) {
        return academicApiService.simulate(studentContextProvider.getAuthenticatedContext(), request);
    }

    @PostMapping("/retake-ranking")
    public RankRetakeCoursesResponse rankRetakeCourses(@RequestBody RankRetakeCoursesRequest request) {
        return academicApiService.rankRetakes(studentContextProvider.getAuthenticatedContext(), request);
    }

    @PostMapping("/target-grades")
    public CalculateTargetGradesResponse calculateTargetGrades(@RequestBody CalculateTargetGradesRequest request) {
        return academicApiService.targetGrades(studentContextProvider.getAuthenticatedContext(), request);
    }
}
