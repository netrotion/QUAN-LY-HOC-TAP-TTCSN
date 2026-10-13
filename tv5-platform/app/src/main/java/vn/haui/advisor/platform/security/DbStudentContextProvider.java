package vn.haui.advisor.platform.security;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import vn.haui.advisor.contracts.dto.StudentDataVersion;
import vn.haui.advisor.contracts.dto.TrustedStudentContext;
import vn.haui.advisor.contracts.ports.StudentContextProvider;
import vn.haui.advisor.platform.student.StudentRepository;

/**
 * StudentContextProvider trên DB: danh tính chỉ lấy từ principal của phiên đăng nhập server,
 * hồ sơ và dataRevision đọc từ student_records. Không có fallback sang sinh viên demo.
 */
@Component
public class DbStudentContextProvider implements StudentContextProvider {

    private final StudentRepository studentRepository;

    public DbStudentContextProvider(StudentRepository studentRepository) {
        this.studentRepository = studentRepository;
    }

    @Override
    public TrustedStudentContext getAuthenticatedContext() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            throw new AuthenticationCredentialsNotFoundException("Chưa đăng nhập");
        }
        StudentRepository.StudentRow student = studentRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new AuthenticationCredentialsNotFoundException("Tài khoản chưa có hồ sơ sinh viên"));
        return new TrustedStudentContext(
                student.studentId(),
                student.studentId(),
                student.fullName(),
                student.majorCode(),
                student.cohort(),
                student.dataRevision()
        );
    }

    @Override
    public StudentDataVersion getDataVersion(String studentId) {
        StudentRepository.StudentRow student = studentRepository.findByStudentId(studentId)
                .orElseThrow(() -> new IllegalArgumentException("Không có hồ sơ sinh viên " + studentId));
        return new StudentDataVersion(studentId, student.dataRevision(),
                student.updatedAt() == null ? null : student.updatedAt().toString(), false);
    }

    @Override
    public boolean isDataStale(String studentId, String clientRevision) {
        if (clientRevision == null || clientRevision.isBlank()) {
            return false;
        }
        return !getDataVersion(studentId).getDataRevision().equals(clientRevision.trim());
    }
}
