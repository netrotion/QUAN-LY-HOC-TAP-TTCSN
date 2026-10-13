package vn.haui.advisor.platform.student;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.platform.certificate.CertificateRepository;
import vn.haui.advisor.platform.curriculum.CurriculumRepository;
import vn.haui.advisor.platform.error.ApiException;
import vn.haui.advisor.platform.transcript.TranscriptRepository;

import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.regex.Pattern;

/**
 * Hồ sơ, CTĐT, bảng điểm đã xác nhận và chứng chỉ tự khai báo của sinh viên đang đăng nhập.
 * Mọi truy vấn lấy studentId từ TrustedStudentContext; không nhận studentId từ client.
 */
@Service
public class StudentDataService {

    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private static final int MAX_EVIDENCE_NOTE = 500;

    private final StudentRepository studentRepository;
    private final CurriculumRepository curriculumRepository;
    private final TranscriptRepository transcriptRepository;
    private final CertificateRepository certificateRepository;

    public StudentDataService(StudentRepository studentRepository, CurriculumRepository curriculumRepository,
                              TranscriptRepository transcriptRepository, CertificateRepository certificateRepository) {
        this.studentRepository = studentRepository;
        this.curriculumRepository = curriculumRepository;
        this.transcriptRepository = transcriptRepository;
        this.certificateRepository = certificateRepository;
    }

    @Transactional(readOnly = true)
    public StudentProfileResponse profile(TrustedStudentContext context) {
        return toProfile(student(context));
    }

    @Transactional
    public StudentProfileResponse updateProfile(TrustedStudentContext context, UpdateStudentProfileRequest request) {
        StudentRepository.StudentRow student = student(context);
        requireFreshRevision(student, request.getDataRevision());

        String email = valueOr(request.getEmail(), student.email());
        if (email != null && !EMAIL.matcher(email).matches()) {
            throw ApiException.badRequest("Email không hợp lệ.");
        }
        Instant now = Instant.now();
        studentRepository.updateProfileFields(student.studentId(), valueOr(request.getFullName(), student.fullName()), email,
                valueOr(request.getClassName(), student.className()), valueOr(request.getCohort(), student.cohort()), now);

        String curriculumId = trim(request.getCurriculumId());
        if (curriculumId != null && !curriculumId.equals(student.curriculumId())) {
            CurriculumRepository.CurriculumRow curriculum = curriculumRepository.find(curriculumId)
                    .orElseThrow(() -> ApiException.curriculumNotFound(curriculumId));
            studentRepository.updateCurriculum(student.studentId(), curriculum.curriculumId(), curriculum.majorCode());
            // CTĐT là dữ liệu đầu vào của AcademicFacade: đổi CTĐT làm dữ liệu học vụ đổi phiên bản
            bumpRevision(student, now);
        }
        return toProfile(student(context));
    }

    @Transactional(readOnly = true)
    public CurriculumResponse curriculum(TrustedStudentContext context) {
        StudentRepository.StudentRow student = student(context);
        CurriculumRepository.CurriculumRow row = curriculumRepository.find(student.curriculumId())
                .orElseThrow(() -> ApiException.curriculumNotFound(student.curriculumId()));
        CurriculumResponse response = new CurriculumResponse();
        response.setCurriculumId(row.curriculumId());
        response.setCurriculumName(row.curriculumName());
        response.setMajorCode(row.majorCode());
        response.setMajorName(row.majorName());
        response.setFaculty(row.faculty());
        response.setTotalCreditsRequired(row.totalCreditsRequired());
        response.setStatus(row.dataStatus());
        response.setSource(row.source());
        response.setCourses(curriculumRepository.listCourses(row.curriculumId()));
        return response;
    }

    @Transactional(readOnly = true)
    public TranscriptResponse transcript(TrustedStudentContext context) {
        return transcriptOf(student(context));
    }

    public TranscriptResponse transcriptOf(StudentRepository.StudentRow student) {
        TranscriptResponse response = new TranscriptResponse();
        response.setStudentId(student.studentId());
        response.setTranscriptStatus(student.transcriptStatus());
        response.setSourceType(student.transcriptSourceType());
        response.setImportSessionId(student.transcriptImportSessionId());
        response.setConfirmedAt(student.transcriptConfirmedAt() == null ? null : student.transcriptConfirmedAt().toString());
        response.setDataRevision(student.dataRevision());
        response.setAttempts(transcriptRepository.listAttempts(student.studentId()));
        return response;
    }

    @Transactional(readOnly = true)
    public CertificateListResponse certificates(TrustedStudentContext context) {
        return new CertificateListResponse(certificateRepository.listForStudent(student(context).studentId()));
    }

    /** Sinh viên tự khai báo chứng chỉ; là đầu vào của Audit nên tăng dataRevision. */
    @Transactional
    public CertificateStatusItem declareCertificate(TrustedStudentContext context, String requirementCode,
                                                    DeclareCertificateRequest request) {
        StudentRepository.StudentRow student = student(context);
        String requirementId = certificateRepository.findRequirementId(requirementCode)
                .orElseThrow(() -> ApiException.requirementNotFound(requirementCode));
        if (request.getStatus() == null) {
            throw ApiException.badRequest("Cần chọn trạng thái chứng chỉ.");
        }
        requireFreshRevision(student, request.getDataRevision());
        String note = trim(request.getEvidenceNote());
        if (note != null && note.length() > MAX_EVIDENCE_NOTE) {
            throw ApiException.badRequest("Ghi chú minh chứng tối đa 500 ký tự.");
        }
        LocalDate achievedOn = parseDate(request.getAchievedOn());

        Instant now = Instant.now();
        certificateRepository.upsertDeclaration(student.studentId(), requirementId, request.getStatus(),
                CertificateVerification.SELF_DECLARED, note, achievedOn, now);
        bumpRevision(student, now);
        return certificateRepository.listForStudent(student.studentId()).stream()
                .filter(item -> item.getRequirementCode().equals(requirementCode))
                .findFirst()
                .orElseThrow();
    }

    public StudentRepository.StudentRow student(TrustedStudentContext context) {
        return studentRepository.findByStudentId(context.getStudentId())
                .orElseThrow(() -> new IllegalStateException("Không có hồ sơ cho sinh viên đã xác thực " + context.getStudentId()));
    }

    /** dataRevision là bắt buộc cho thao tác ghi dữ liệu học vụ; khác bản hiện hành → 409. */
    public static void requireFreshRevision(StudentRepository.StudentRow student, String clientRevision) {
        if (clientRevision == null || clientRevision.isBlank()) {
            throw ApiException.badRequest("dataRevision là bắt buộc.");
        }
        if (!student.dataRevision().equals(clientRevision.trim())) {
            throw ApiException.staleRevision(student.dataRevision(), clientRevision);
        }
    }

    public String bumpRevision(StudentRepository.StudentRow student, Instant now) {
        return studentRepository.bumpRevision(student.studentId(), student.version(), now)
                .orElseThrow(() -> ApiException.staleRevision(student.dataRevision(), student.dataRevision()));
    }

    private StudentProfileResponse toProfile(StudentRepository.StudentRow student) {
        StudentProfileResponse response = new StudentProfileResponse();
        response.setStudentId(student.studentId());
        response.setFullName(student.fullName());
        response.setEmail(student.email());
        response.setClassName(student.className());
        response.setCohort(student.cohort());
        response.setCurriculumId(student.curriculumId());
        curriculumRepository.find(student.curriculumId()).ifPresent(curriculum -> {
            response.setCurriculumName(curriculum.curriculumName());
            response.setMajorCode(curriculum.majorCode());
            response.setMajorName(curriculum.majorName());
            response.setFaculty(curriculum.faculty());
        });
        response.setTranscriptStatus(student.transcriptStatus());
        response.setDataRevision(student.dataRevision());
        response.setCreatedAt(student.createdAt() == null ? null : student.createdAt().toString());
        response.setUpdatedAt(student.updatedAt() == null ? null : student.updatedAt().toString());
        return response;
    }

    private static LocalDate parseDate(String value) {
        String trimmed = trim(value);
        if (trimmed == null) {
            return null;
        }
        try {
            LocalDate date = LocalDate.parse(trimmed);
            if (date.isAfter(LocalDate.now().plusDays(1))) {
                throw ApiException.badRequest("Ngày đạt chứng chỉ không được ở tương lai.");
            }
            return date;
        } catch (DateTimeParseException ex) {
            throw ApiException.badRequest("Ngày đạt chứng chỉ theo dạng yyyy-MM-dd.");
        }
    }

    private static String valueOr(String value, String fallback) {
        String trimmed = trim(value);
        return trimmed != null ? trimmed : fallback;
    }

    private static String trim(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
