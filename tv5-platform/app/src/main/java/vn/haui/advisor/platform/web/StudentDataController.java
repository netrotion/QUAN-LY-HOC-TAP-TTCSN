package vn.haui.advisor.platform.web;

import org.springframework.web.bind.annotation.*;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.ports.StudentContextProvider;
import vn.haui.advisor.platform.student.StudentDataService;

/**
 * Hồ sơ, CTĐT, bảng điểm đã xác nhận và chứng chỉ tự khai báo của sinh viên đang đăng nhập.
 */
@RestController
@RequestMapping("/api/v1")
public class StudentDataController {

    private final StudentContextProvider studentContextProvider;
    private final StudentDataService studentDataService;

    public StudentDataController(StudentContextProvider studentContextProvider, StudentDataService studentDataService) {
        this.studentContextProvider = studentContextProvider;
        this.studentDataService = studentDataService;
    }

    @GetMapping("/students/me")
    public StudentProfileResponse getStudentProfile() {
        return studentDataService.profile(studentContextProvider.getAuthenticatedContext());
    }

    @PutMapping("/students/me")
    public StudentProfileResponse updateStudentProfile(@RequestBody UpdateStudentProfileRequest request) {
        return studentDataService.updateProfile(studentContextProvider.getAuthenticatedContext(), request);
    }

    @GetMapping("/academic/curriculum")
    public CurriculumResponse getCurriculum() {
        return studentDataService.curriculum(studentContextProvider.getAuthenticatedContext());
    }

    @GetMapping("/academic/transcript")
    public TranscriptResponse getTranscript() {
        return studentDataService.transcript(studentContextProvider.getAuthenticatedContext());
    }

    @GetMapping("/academic/certificates")
    public CertificateListResponse listCertificates() {
        return studentDataService.certificates(studentContextProvider.getAuthenticatedContext());
    }

    @PutMapping("/academic/certificates/{requirementCode}")
    public CertificateStatusItem declareCertificate(@PathVariable String requirementCode,
                                                    @RequestBody DeclareCertificateRequest request) {
        return studentDataService.declareCertificate(studentContextProvider.getAuthenticatedContext(), requirementCode, request);
    }
}
