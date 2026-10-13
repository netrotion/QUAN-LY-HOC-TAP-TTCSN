package vn.haui.advisor.platform.support;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import vn.haui.advisor.platform.student.StudentRepository;

import java.time.Instant;

/**
 * Tạo tài khoản sinh viên thật trong DB test (H2) để test chạy qua StudentContextProvider trên DB.
 * Mỗi test dùng mã sinh viên riêng vì context Spring (và DB) được dùng chung giữa các lớp test.
 */
@Component
public class TestAccounts {

    public static final String PASSWORD = "mat-khau-test-123";
    public static final String CURRICULUM_ID = "curriculum-ktpm-haui-2024";

    private final StudentRepository studentRepository;
    private final PasswordEncoder passwordEncoder;

    public TestAccounts(StudentRepository studentRepository, PasswordEncoder passwordEncoder) {
        this.studentRepository = studentRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /** Tạo tài khoản nếu chưa có; trả dataRevision hiện hành. */
    public String ensure(String studentId) {
        if (!studentRepository.existsUser(studentId)) {
            studentRepository.insertAccount(studentId, passwordEncoder.encode(PASSWORD), "Sinh viên " + studentId,
                    null, "TEST01", "K19", CURRICULUM_ID, "CT1085", Instant.now());
        }
        return revision(studentId);
    }

    public String revision(String studentId) {
        return studentRepository.findByStudentId(studentId).orElseThrow().dataRevision();
    }

    /** Mô phỏng dữ liệu học vụ vừa đổi ở nơi khác (vd. vừa xác nhận bảng điểm). */
    public String bumpRevision(String studentId) {
        StudentRepository.StudentRow row = studentRepository.findByStudentId(studentId).orElseThrow();
        return studentRepository.bumpRevision(studentId, row.version(), Instant.now()).orElseThrow();
    }
}
