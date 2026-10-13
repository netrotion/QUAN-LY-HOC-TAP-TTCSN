package vn.haui.advisor.platform.security;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import vn.haui.advisor.contracts.dto.AccountRole;
import vn.haui.advisor.platform.student.StudentRepository;

import java.util.List;

/**
 * Nạp tài khoản đăng nhập từ bảng users. Chỉ vai trò STUDENT được đăng nhập (solution: một role STUDENT);
 * tài khoản vai trò khác coi như không tồn tại.
 */
@Service
public class StudentUserDetailsService implements UserDetailsService {

    public static final String STUDENT_AUTHORITY = "ROLE_" + AccountRole.STUDENT.name();

    private final StudentRepository studentRepository;

    public StudentUserDetailsService(StudentRepository studentRepository) {
        this.studentRepository = studentRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) {
        StudentRepository.UserRow user = studentRepository.findUser(username)
                .filter(u -> AccountRole.STUDENT.name().equals(u.role()))
                .orElseThrow(() -> new UsernameNotFoundException("Không có tài khoản sinh viên " + username));
        return User.withUsername(user.username())
                .password(user.passwordHash())
                .authorities(List.of(new SimpleGrantedAuthority(STUDENT_AUTHORITY)))
                .disabled(!"ACTIVE".equals(user.status()))
                .build();
    }
}
