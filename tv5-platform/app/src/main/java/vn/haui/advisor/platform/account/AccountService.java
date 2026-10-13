package vn.haui.advisor.platform.account;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.haui.advisor.contracts.dto.ApiErrorCode;
import vn.haui.advisor.contracts.dto.RegisterAccountRequest;
import vn.haui.advisor.platform.curriculum.CurriculumRepository;
import vn.haui.advisor.platform.error.ApiException;
import vn.haui.advisor.platform.student.StudentRepository;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Tạo tài khoản sinh viên HaUI Advisor. Mã sinh viên do người dùng khai báo: hệ thống không đăng nhập
 * hay đối chiếu cổng e-HaUI, nên tài khoản mới luôn bắt đầu với bảng điểm trống.
 */
@Service
public class AccountService {

    private static final Pattern STUDENT_ID = Pattern.compile("^[A-Za-z0-9._-]{4,50}$");
    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private static final int MIN_PASSWORD_LENGTH = 8;
    /** BCrypt chỉ dùng 72 byte đầu; dài hơn sẽ bị cắt ngầm nên từ chối. */
    private static final int MAX_PASSWORD_BYTES = 72;

    private final StudentRepository studentRepository;
    private final CurriculumRepository curriculumRepository;
    private final PasswordEncoder passwordEncoder;

    public AccountService(StudentRepository studentRepository, CurriculumRepository curriculumRepository,
                          PasswordEncoder passwordEncoder) {
        this.studentRepository = studentRepository;
        this.curriculumRepository = curriculumRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public void register(RegisterAccountRequest request) {
        String studentId = trim(request.getStudentId());
        if (studentId == null || !STUDENT_ID.matcher(studentId).matches()) {
            throw ApiException.badRequest("Mã sinh viên gồm 4-50 ký tự chữ, số hoặc . _ -");
        }
        String password = request.getPassword();
        if (password == null || password.length() < MIN_PASSWORD_LENGTH
                || password.getBytes(StandardCharsets.UTF_8).length > MAX_PASSWORD_BYTES) {
            throw ApiException.badRequest("Mật khẩu cần tối thiểu 8 ký tự và không quá 72 byte.");
        }
        String fullName = trim(request.getFullName());
        String cohort = trim(request.getCohort());
        if (fullName == null || cohort == null) {
            throw ApiException.badRequest("Họ tên và khóa là bắt buộc.");
        }
        String email = trim(request.getEmail());
        if (email != null && !EMAIL.matcher(email).matches()) {
            throw ApiException.badRequest("Email không hợp lệ.");
        }
        CurriculumRepository.CurriculumRow curriculum = curriculumRepository.find(trim(request.getCurriculumId()))
                .orElseThrow(() -> ApiException.curriculumNotFound(request.getCurriculumId()));
        if (studentRepository.existsUser(studentId) || studentRepository.findByStudentId(studentId).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, ApiErrorCode.ACCOUNT_ALREADY_EXISTS,
                    "Mã sinh viên này đã có tài khoản.", List.of());
        }

        studentRepository.insertAccount(studentId, passwordEncoder.encode(password), fullName, email,
                trim(request.getClassName()), cohort, curriculum.curriculumId(), curriculum.majorCode(), Instant.now());
    }

    static String trim(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
