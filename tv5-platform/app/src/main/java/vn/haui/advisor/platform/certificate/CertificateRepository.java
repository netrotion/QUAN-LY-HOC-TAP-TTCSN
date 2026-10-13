package vn.haui.advisor.platform.certificate;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import vn.haui.advisor.contracts.dto.CertificateStatus;
import vn.haui.advisor.contracts.dto.CertificateStatusItem;
import vn.haui.advisor.contracts.dto.CertificateVerification;

import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Chuẩn đầu ra phi tín chỉ (audit_requirements) và khai báo của sinh viên (student_audit_checklists).
 */
@Repository
public class CertificateRepository {

    private final JdbcClient jdbc;

    public CertificateRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<CertificateStatusItem> listForStudent(String studentId) {
        return jdbc.sql("""
                        SELECT r.requirement_code, r.category, r.requirement_name, k.status, k.verification, k.evidence_note,
                               k.achieved_on, k.updated_at
                        FROM audit_requirements r
                        LEFT JOIN student_audit_checklists k ON k.requirement_id = r.requirement_id AND k.student_id = :studentId
                        ORDER BY r.requirement_code
                        """)
                .param("studentId", studentId)
                .query((rs, i) -> {
                    CertificateStatusItem item = new CertificateStatusItem();
                    item.setRequirementCode(rs.getString("requirement_code"));
                    item.setCategory(rs.getString("category"));
                    item.setName(rs.getString("requirement_name"));
                    String status = rs.getString("status");
                    String verification = rs.getString("verification");
                    item.setStatus(status == null ? CertificateStatus.UNKNOWN : CertificateStatus.valueOf(status));
                    item.setVerification(verification == null ? CertificateVerification.NOT_DECLARED : CertificateVerification.valueOf(verification));
                    item.setEvidenceNote(rs.getString("evidence_note"));
                    LocalDate achievedOn = rs.getObject("achieved_on", LocalDate.class);
                    item.setAchievedOn(achievedOn == null ? null : achievedOn.toString());
                    OffsetDateTime updatedAt = rs.getObject("updated_at", OffsetDateTime.class);
                    item.setUpdatedAt(updatedAt == null ? null : updatedAt.toInstant().toString());
                    return item;
                })
                .list();
    }

    public Optional<String> findRequirementId(String requirementCode) {
        return jdbc.sql("SELECT requirement_id FROM audit_requirements WHERE requirement_code = :code")
                .param("code", requirementCode).query(String.class).optional();
    }

    public Optional<String> findRequirementIdByCategory(String category) {
        return jdbc.sql("SELECT requirement_id FROM audit_requirements WHERE category = :category")
                .param("category", category).query(String.class).optional();
    }

    public void renameRequirement(String category, String name) {
        jdbc.sql("UPDATE audit_requirements SET requirement_name = :name WHERE category = :category")
                .param("name", name).param("category", category).update();
    }

    public void upsertDeclaration(String studentId, String requirementId, CertificateStatus status, CertificateVerification verification,
                                  String evidenceNote, LocalDate achievedOn, Instant now) {
        OffsetDateTime timestamp = OffsetDateTime.ofInstant(now, ZoneOffset.UTC);
        int updated = jdbc.sql("""
                        UPDATE student_audit_checklists SET status = :status, verification = :verification, evidence_note = :note,
                               achieved_on = :achievedOn, updated_at = :now
                        WHERE student_id = :studentId AND requirement_id = :requirementId
                        """)
                .param("status", status.name()).param("verification", verification.name()).param("note", evidenceNote)
                .param("achievedOn", achievedOn).param("now", timestamp)
                .param("studentId", studentId).param("requirementId", requirementId)
                .update();
        if (updated == 0) {
            jdbc.sql("""
                            INSERT INTO student_audit_checklists (checklist_id, student_id, requirement_id, status, verification,
                                                                  evidence_note, achieved_on, created_at, updated_at)
                            VALUES (:id, :studentId, :requirementId, :status, :verification, :note, :achievedOn, :now, :now)
                            """)
                    .param("id", "chk-" + UUID.randomUUID()).param("studentId", studentId).param("requirementId", requirementId)
                    .param("status", status.name()).param("verification", verification.name()).param("note", evidenceNote)
                    .param("achievedOn", achievedOn).param("now", timestamp)
                    .update();
        }
    }
}
