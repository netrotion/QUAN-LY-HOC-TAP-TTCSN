package vn.haui.advisor.platform.transcript;

import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import vn.haui.advisor.contracts.dto.StudentAcademicRecord;
import vn.haui.advisor.contracts.ports.StudentAcademicRecordProvider;
import vn.haui.advisor.platform.certificate.CertificateRepository;
import vn.haui.advisor.platform.student.StudentRepository;

import java.util.function.Supplier;

/**
 * Dữ liệu học vụ gốc cho AcademicFacade: chỉ bảng điểm đã xác nhận và khai báo chứng chỉ.
 * Phiên nhập chưa xác nhận và số liệu in trên tài liệu (CPA, tín chỉ tích lũy) không bao giờ đi qua đây.
 *
 * API học vụ nạp hồ sơ một lần ({@link #load}) rồi gắn vào luồng đang xử lý ({@link #withRecord}) trong lúc gọi facade:
 * mọi lần facade hỏi hồ sơ đều nhận đúng bản đã nạp, nên kết quả khớp dataRevision trả cho client và lỗi đọc DB
 * xảy ra ở platform (không bị facade nuốt thành kết quả rỗng). Ngoài lượt gọi đó hồ sơ đọc thẳng từ DB.
 */
@Component
public class DbStudentAcademicRecordProvider implements StudentAcademicRecordProvider {

    private final StudentRepository studentRepository;
    private final TranscriptRepository transcriptRepository;
    private final CertificateRepository certificateRepository;
    private final TransactionTemplate snapshot;
    private final ThreadLocal<StudentAcademicRecord> pinned = new ThreadLocal<>();

    public DbStudentAcademicRecordProvider(StudentRepository studentRepository, TranscriptRepository transcriptRepository,
                                           CertificateRepository certificateRepository, PlatformTransactionManager transactions) {
        this.studentRepository = studentRepository;
        this.transcriptRepository = transcriptRepository;
        this.certificateRepository = certificateRepository;
        this.snapshot = new TransactionTemplate(transactions);
        this.snapshot.setReadOnly(true);
        this.snapshot.setIsolationLevel(TransactionDefinition.ISOLATION_REPEATABLE_READ);
    }

    @Override
    public StudentAcademicRecord getAcademicRecord(String studentId) {
        StudentAcademicRecord record = pinned.get();
        if (record == null) {
            return load(studentId);
        }
        if (!record.getStudentId().equals(studentId)) {
            throw new IllegalStateException("AcademicFacade hỏi hồ sơ của sinh viên khác sinh viên đang xử lý");
        }
        return record;
    }

    /** Đọc hồ sơ trên một snapshot: revision, bảng điểm và chứng chỉ cùng một thời điểm dù có giao dịch ghi xen vào. */
    public StudentAcademicRecord load(String studentId) {
        return snapshot.execute(status -> read(studentId));
    }

    private StudentAcademicRecord read(String studentId) {
        StudentRepository.StudentRow student = studentRepository.findByStudentId(studentId)
                .orElseThrow(() -> new IllegalArgumentException("Không có hồ sơ sinh viên " + studentId));
        StudentAcademicRecord record = new StudentAcademicRecord();
        record.setStudentId(student.studentId());
        record.setDataRevision(student.dataRevision());
        record.setCurriculumId(student.curriculumId());
        record.setTranscriptStatus(student.transcriptStatus());
        record.setAttempts(transcriptRepository.listAttempts(student.studentId()));
        record.setCertificates(certificateRepository.listForStudent(student.studentId()));
        return record;
    }

    /** Chạy {@code call} với hồ sơ đã nạp gắn cho luồng hiện tại; gỡ ra khi xong. */
    public <T> T withRecord(StudentAcademicRecord record, Supplier<T> call) {
        StudentAcademicRecord previous = pinned.get();
        pinned.set(record);
        try {
            return call.get();
        } finally {
            if (previous == null) {
                pinned.remove();
            } else {
                pinned.set(previous);
            }
        }
    }
}
