package vn.haui.advisor.contracts.fake;

import vn.haui.advisor.contracts.dto.CertificateListResponse;
import vn.haui.advisor.contracts.dto.StudentAcademicRecord;
import vn.haui.advisor.contracts.dto.TranscriptResponse;
import vn.haui.advisor.contracts.dto.TranscriptStatus;
import vn.haui.advisor.contracts.ports.StudentAcademicRecordProvider;

import java.util.ArrayList;

/**
 * StudentAcademicRecordProvider giả lập cho TV4/TV1: sinh viên demo có bảng điểm và chứng chỉ theo fixture,
 * sinh viên khác là hồ sơ trống (transcriptStatus = NONE) — giống hành vi của provider thật khi chưa nhập bảng điểm.
 */
public class FixtureStudentAcademicRecordProvider implements StudentAcademicRecordProvider {

    private static final String CURRICULUM_ID = "curriculum-ktpm-haui-2024";

    @Override
    public StudentAcademicRecord getAcademicRecord(String studentId) {
        StudentAcademicRecord record = new StudentAcademicRecord();
        record.setStudentId(studentId);
        record.setCurriculumId(CURRICULUM_ID);
        if (ContractFixtures.DEMO_STUDENT_ID.equals(studentId)) {
            TranscriptResponse transcript = ContractFixtures.load("transcript-response.sample.json", TranscriptResponse.class);
            record.setDataRevision(transcript.getDataRevision());
            record.setTranscriptStatus(transcript.getTranscriptStatus());
            record.setAttempts(transcript.getAttempts());
            record.setCertificates(ContractFixtures.load("certificates-response.sample.json", CertificateListResponse.class).getCertificates());
        } else {
            record.setDataRevision("REV-" + studentId + "-001");
            record.setTranscriptStatus(TranscriptStatus.NONE);
            record.setAttempts(new ArrayList<>());
            record.setCertificates(new ArrayList<>());
        }
        return record;
    }
}
