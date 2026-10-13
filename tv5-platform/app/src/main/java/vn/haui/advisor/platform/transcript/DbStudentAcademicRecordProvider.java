package vn.haui.advisor.platform.transcript;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import vn.haui.advisor.contracts.dto.StudentAcademicRecord;
import vn.haui.advisor.contracts.ports.StudentAcademicRecordProvider;
import vn.haui.advisor.platform.certificate.CertificateRepository;
import vn.haui.advisor.platform.student.StudentRepository;

/**
 * Dữ liệu học vụ gốc cho AcademicFacade: chỉ bảng điểm đã xác nhận và khai báo chứng chỉ.
 * Phiên nhập chưa xác nhận và số liệu in trên tài liệu (CPA, tín chỉ tích lũy) không bao giờ đi qua đây.
 */
@Component
public class DbStudentAcademicRecordProvider implements StudentAcademicRecordProvider {

    private final StudentRepository studentRepository;
    private final TranscriptRepository transcriptRepository;
    private final CertificateRepository certificateRepository;

    public DbStudentAcademicRecordProvider(StudentRepository studentRepository, TranscriptRepository transcriptRepository,
                                           CertificateRepository certificateRepository) {
        this.studentRepository = studentRepository;
        this.transcriptRepository = transcriptRepository;
        this.certificateRepository = certificateRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public StudentAcademicRecord getAcademicRecord(String studentId) {
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
}
