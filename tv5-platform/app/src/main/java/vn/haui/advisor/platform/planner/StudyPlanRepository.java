package vn.haui.advisor.platform.planner;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import vn.haui.advisor.contracts.dto.ChatActionItem;
import vn.haui.advisor.contracts.dto.PlannedCourseItem;
import vn.haui.advisor.contracts.dto.PlannedSemesterItem;
import vn.haui.advisor.contracts.dto.StudyPlanStatus;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Kế hoạch học tập (study_plans + plan_semesters/planned_courses/plan_actions).
 * Mọi truy vấn kèm student_id; thao tác ghi chạy sau {@link #lockStudent(String)} trong cùng giao dịch.
 */
@Repository
public class StudyPlanRepository {

    private static final TypeReference<List<String>> STRINGS = new TypeReference<>() {
    };
    private static final String COLUMNS = """
            p.plan_id, p.student_id, p.plan_name, p.status, p.version, p.source_plan_id, p.data_revision, p.target_cpa,
            p.target_graduation_semester, p.max_credits_per_semester, p.projected_cpa, p.warnings_json, p.created_at,
            p.updated_at, p.activated_at, p.validated_at, p.validated_plan_version, p.validated_data_revision,
            p.validated_policy_version, p.checked_data_revision, p.checked_policy_version,
            (SELECT COALESCE(SUM(s.planned_credits), 0) FROM plan_semesters s WHERE s.plan_id = p.plan_id) AS total_credits
            """;
    /** Lần thẩm định gần nhất không dựa trên hồ sơ (:revision) hoặc quy chế (:policy) hiện hành. */
    private static final String OUTDATED = """
            p.status IN (:statuses)
              AND (p.checked_data_revision IS NULL OR p.checked_data_revision <> :revision
                   OR p.checked_policy_version IS NULL OR p.checked_policy_version <> :policy)
            """;

    private final JdbcClient jdbc;
    private final ObjectMapper objectMapper;

    public StudyPlanRepository(JdbcClient jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    /** Phần đầu của một kế hoạch (không kèm học kỳ/action). */
    public static class PlanRow {
        public String planId;
        public String studentId;
        public String planName;
        public StudyPlanStatus status;
        public int version;
        public String sourcePlanId;
        public String dataRevision;
        public BigDecimal targetCpa;
        public String targetGraduationSemester;
        public Integer maxCreditsPerSemester;
        public BigDecimal projectedCpa;
        public List<String> warnings = new ArrayList<>();
        public Instant createdAt;
        public Instant updatedAt;
        public Instant activatedAt;
        public Instant validatedAt;
        public Integer validatedPlanVersion;
        public String validatedDataRevision;
        public String validatedPolicyVersion;
        public String checkedDataRevision;
        public String checkedPolicyVersion;
        public int totalCredits;
    }

    /** Khóa hồ sơ sinh viên của giao dịch: tuần tự hóa mọi thao tác ghi kế hoạch của cùng sinh viên. */
    public record StudentLock(String dataRevision, int planSequence) {
    }

    /**
     * Kết quả một lần thẩm định thật trên nội dung hiện tại của kế hoạch (planVersion), hồ sơ (dataRevision) và quy chế
     * (policyVersion). Đạt: validated_* ghi lần này. Không đạt: validated_* về NULL. Kế hoạch còn được theo dõi
     * (VALIDATED, ACTIVE) ghi checked_* để chỉ kiểm tra lại khi hồ sơ hoặc quy chế đổi tiếp; DRAFT thì không.
     */
    public record Check(StudyPlanStatus status, boolean valid, List<String> warnings, Instant checkedAt, int planVersion,
                        String dataRevision, String policyVersion) {
    }

    public Optional<StudentLock> lockStudent(String studentId) {
        return jdbc.sql("SELECT data_revision, plan_sequence FROM student_records WHERE student_id = :id FOR UPDATE")
                .param("id", studentId)
                .query((rs, n) -> new StudentLock(rs.getString("data_revision"), rs.getInt("plan_sequence")))
                .optional();
    }

    /** Mã kế hoạch mới, tăng dần theo sinh viên; gọi sau lockStudent. */
    public String nextPlanId(String studentId, StudentLock lock) {
        int next = lock.planSequence() + 1;
        jdbc.sql("UPDATE student_records SET plan_sequence = :next WHERE student_id = :id")
                .param("next", next).param("id", studentId)
                .update();
        return String.format("plan-%s-%04d", studentId, next);
    }

    public Optional<PlanRow> find(String studentId, String planId) {
        return jdbc.sql("SELECT " + COLUMNS + " FROM study_plans p WHERE p.plan_id = :planId AND p.student_id = :studentId")
                .param("planId", planId).param("studentId", studentId)
                .query(this::map)
                .optional();
    }

    public List<PlanRow> list(String studentId) {
        return jdbc.sql("SELECT " + COLUMNS + " FROM study_plans p WHERE p.student_id = :studentId ORDER BY p.updated_at DESC, p.plan_id DESC")
                .param("studentId", studentId)
                .query(this::map)
                .list();
    }

    /**
     * Kế hoạch có trạng thái trong {@code statuses} mà lần thẩm định gần nhất dựa trên hồ sơ hoặc quy chế khác bản hiện hành
     * (hoặc chưa ghi lần nào).
     */
    public List<PlanRow> findOutdatedChecks(String studentId, String dataRevision, String policyVersion,
                                            Collection<StudyPlanStatus> statuses) {
        if (statuses.isEmpty()) {
            return List.of();
        }
        return jdbc.sql("SELECT " + COLUMNS + " FROM study_plans p WHERE p.student_id = :studentId AND " + OUTDATED + " ORDER BY p.plan_id")
                .params(outdatedParams(studentId, dataRevision, policyVersion, statuses))
                .query(this::map)
                .list();
    }

    public int countOutdatedChecks(String studentId, String dataRevision, String policyVersion,
                                   Collection<StudyPlanStatus> statuses) {
        if (statuses.isEmpty()) {
            return 0;
        }
        return jdbc.sql("SELECT count(*) FROM study_plans p WHERE p.student_id = :studentId AND " + OUTDATED)
                .params(outdatedParams(studentId, dataRevision, policyVersion, statuses))
                .query(Integer.class).single();
    }

    public int count(String studentId) {
        return jdbc.sql("SELECT count(*) FROM study_plans WHERE student_id = :studentId")
                .param("studentId", studentId)
                .query(Integer.class).single();
    }

    public void insert(PlanRow plan) {
        jdbc.sql("""
                        INSERT INTO study_plans (plan_id, student_id, plan_name, status, version, source_plan_id, data_revision,
                                                 target_cpa, target_graduation_semester, max_credits_per_semester, projected_cpa,
                                                 warnings_json, created_at, updated_at)
                        VALUES (:planId, :studentId, :planName, :status, :version, :sourcePlanId, :dataRevision, :targetCpa,
                                :targetSemester, :maxCredits, :projectedCpa, :warnings, :createdAt, :updatedAt)
                        """)
                .params(contentParams(plan))
                .param("studentId", plan.studentId)
                .param("status", plan.status.name())
                .param("version", plan.version)
                .param("sourcePlanId", plan.sourcePlanId)
                .param("createdAt", ts(plan.createdAt))
                .update();
    }

    /** Ghi nội dung mới nếu version chưa đổi: version + 1, về DRAFT, hủy kết quả thẩm định cũ. */
    public boolean updateContent(PlanRow plan, int expectedVersion) {
        return jdbc.sql("""
                        UPDATE study_plans SET plan_name = :planName, status = 'DRAFT', version = :expectedVersion + 1,
                               data_revision = :dataRevision, target_cpa = :targetCpa, target_graduation_semester = :targetSemester,
                               max_credits_per_semester = :maxCredits, projected_cpa = :projectedCpa, warnings_json = :warnings,
                               updated_at = :updatedAt, validated_at = NULL, validated_plan_version = NULL,
                               validated_data_revision = NULL, validated_policy_version = NULL,
                               checked_data_revision = NULL, checked_policy_version = NULL
                        WHERE plan_id = :planId AND student_id = :studentId AND version = :expectedVersion
                          AND status IN ('DRAFT', 'VALIDATED')
                        """)
                .params(contentParams(plan))
                .param("studentId", plan.studentId)
                .param("expectedVersion", expectedVersion)
                .update() == 1;
    }

    /**
     * Ghi một lần thẩm định thật (xem {@link Check}). Đạt thì dataRevision của kế hoạch là hồ sơ của lần thẩm định này;
     * không đổi trạng thái ACTIVE (bản đang theo dõi vi phạm vẫn ACTIVE, kèm cảnh báo).
     */
    public void recordCheck(PlanRow plan, Check check) {
        boolean tracked = check.status() != StudyPlanStatus.DRAFT;
        jdbc.sql("""
                        UPDATE study_plans SET status = :status, warnings_json = :warnings, data_revision = :planRevision,
                               validated_at = :validatedAt, validated_plan_version = :planVersion,
                               validated_data_revision = :validatedRevision, validated_policy_version = :validatedPolicy,
                               checked_data_revision = :checkedRevision, checked_policy_version = :checkedPolicy
                        WHERE plan_id = :planId AND student_id = :studentId AND version = :version
                        """)
                .param("status", check.status().name()).param("warnings", write(check.warnings()))
                .param("planRevision", check.valid() ? check.dataRevision() : plan.dataRevision)
                .param("validatedAt", check.valid() ? ts(check.checkedAt()) : null)
                .param("planVersion", check.valid() ? check.planVersion() : null)
                .param("validatedRevision", check.valid() ? check.dataRevision() : null)
                .param("validatedPolicy", check.valid() ? check.policyVersion() : null)
                .param("checkedRevision", tracked ? check.dataRevision() : null)
                .param("checkedPolicy", tracked ? check.policyVersion() : null)
                .param("planId", plan.planId).param("studentId", plan.studentId).param("version", check.planVersion())
                .update();
    }

    /** Lưu trữ các bản ACTIVE khác của sinh viên; trả mã kế hoạch đã lưu trữ. */
    public List<String> archiveActive(String studentId, String exceptPlanId, Instant now) {
        List<String> ids = jdbc.sql("SELECT plan_id FROM study_plans WHERE student_id = :studentId AND status = 'ACTIVE' AND plan_id <> :planId")
                .param("studentId", studentId).param("planId", exceptPlanId)
                .query(String.class).list();
        if (!ids.isEmpty()) {
            jdbc.sql("""
                            UPDATE study_plans SET status = 'ARCHIVED', active_student_id = NULL, updated_at = :now
                            WHERE student_id = :studentId AND status = 'ACTIVE' AND plan_id <> :planId
                            """)
                    .param("now", ts(now)).param("studentId", studentId).param("planId", exceptPlanId)
                    .update();
        }
        return ids;
    }

    public void activate(String studentId, String planId, Instant now, List<String> warnings, int planVersion,
                         String dataRevision, String policyVersion) {
        jdbc.sql("""
                        UPDATE study_plans SET status = 'ACTIVE', active_student_id = student_id, activated_at = :now,
                               updated_at = :now, data_revision = :dataRevision, warnings_json = :warnings, validated_at = :now,
                               validated_plan_version = :planVersion, validated_data_revision = :dataRevision,
                               validated_policy_version = :policyVersion, checked_data_revision = :dataRevision,
                               checked_policy_version = :policyVersion
                        WHERE plan_id = :planId AND student_id = :studentId
                        """)
                .param("now", ts(now)).param("dataRevision", dataRevision).param("warnings", write(warnings))
                .param("planVersion", planVersion).param("policyVersion", policyVersion)
                .param("planId", planId).param("studentId", studentId)
                .update();
    }

    public void delete(String studentId, String planId) {
        jdbc.sql("DELETE FROM study_plans WHERE plan_id = :planId AND student_id = :studentId")
                .param("planId", planId).param("studentId", studentId)
                .update();
    }

    // ----- Học kỳ, học phần, action -----

    public void replaceChildren(String planId, List<PlannedSemesterItem> semesters, List<ChatActionItem> actions) {
        jdbc.sql("DELETE FROM plan_semesters WHERE plan_id = :planId").param("planId", planId).update();
        jdbc.sql("DELETE FROM plan_actions WHERE plan_id = :planId").param("planId", planId).update();
        for (PlannedSemesterItem semester : semesters) {
            String semesterId = UUID.randomUUID().toString();
            jdbc.sql("""
                            INSERT INTO plan_semesters (plan_semester_id, plan_id, semester_order, semester_code, semester_name,
                                                        planned_credits, estimated_gpa)
                            VALUES (:id, :planId, :order, :code, :name, :credits, :gpa)
                            """)
                    .param("id", semesterId).param("planId", planId).param("order", semester.getSemesterOrder())
                    .param("code", semester.getSemesterCode()).param("name", semester.getSemesterName())
                    .param("credits", semester.getTotalCredits()).param("gpa", semester.getExpectedGpa())
                    .update();
            int order = 0;
            for (PlannedCourseItem course : semester.getCourses()) {
                jdbc.sql("""
                                INSERT INTO planned_courses (planned_course_id, plan_semester_id, course_id, course_code, course_name,
                                                             credits, target_grade, rationale, course_type, status, sort_order)
                                VALUES (:id, :semesterId, (SELECT c.course_id FROM courses c WHERE c.course_code = :code),
                                        :code, :name, :credits, :grade, :rationale, :type, :status, :order)
                                """)
                        .param("id", UUID.randomUUID().toString()).param("semesterId", semesterId)
                        .param("code", course.getCourseCode()).param("name", course.getCourseName())
                        .param("credits", course.getCredits() == null ? null : BigDecimal.valueOf(course.getCredits()))
                        .param("grade", course.getTargetGrade()).param("rationale", course.getRationale())
                        .param("type", course.getCourseType()).param("status", course.getStatus()).param("order", order++)
                        .update();
            }
        }
        int order = 0;
        for (ChatActionItem action : actions) {
            jdbc.sql("""
                            INSERT INTO plan_actions (action_id, plan_id, action_type, label, target_route, payload_json, description,
                                                      priority, sort_order)
                            VALUES (:id, :planId, :type, :label, :route, :payload, :description, :priority, :order)
                            """)
                    .param("id", UUID.randomUUID().toString()).param("planId", planId).param("type", action.getActionType())
                    .param("label", action.getLabel()).param("route", action.getTargetRoute())
                    .param("payload", action.getPayloadJson()).param("description", action.getDescription())
                    .param("priority", action.getPriority()).param("order", order++)
                    .update();
        }
    }

    public List<PlannedSemesterItem> loadSemesters(String planId) {
        Map<String, PlannedSemesterItem> semesters = new LinkedHashMap<>();
        jdbc.sql("""
                        SELECT plan_semester_id, semester_order, semester_code, semester_name, planned_credits, estimated_gpa
                        FROM plan_semesters WHERE plan_id = :planId ORDER BY semester_order
                        """)
                .param("planId", planId)
                .query(rs -> {
                    semesters.put(rs.getString("plan_semester_id"), new PlannedSemesterItem(rs.getInt("semester_order"),
                            rs.getString("semester_code"), rs.getString("semester_name"), new ArrayList<>(),
                            rs.getInt("planned_credits"), rs.getBigDecimal("estimated_gpa")));
                });
        if (semesters.isEmpty()) {
            return new ArrayList<>();
        }
        jdbc.sql("""
                        SELECT pc.plan_semester_id, pc.course_code, pc.course_name, pc.credits, pc.target_grade, pc.rationale,
                               pc.course_type, pc.status
                        FROM planned_courses pc JOIN plan_semesters s ON s.plan_semester_id = pc.plan_semester_id
                        WHERE s.plan_id = :planId ORDER BY s.semester_order, pc.sort_order
                        """)
                .param("planId", planId)
                .query(rs -> {
                    BigDecimal credits = rs.getBigDecimal("credits");
                    semesters.get(rs.getString("plan_semester_id")).getCourses().add(new PlannedCourseItem(
                            rs.getString("course_code"), rs.getString("course_name"),
                            credits == null ? null : credits.intValue(), rs.getString("target_grade"), rs.getString("rationale"),
                            rs.getString("course_type"), rs.getString("status")));
                });
        return new ArrayList<>(semesters.values());
    }

    public List<ChatActionItem> loadActions(String planId) {
        return jdbc.sql("""
                        SELECT action_type, label, target_route, payload_json, description, priority
                        FROM plan_actions WHERE plan_id = :planId ORDER BY sort_order
                        """)
                .param("planId", planId)
                .query((rs, n) -> {
                    int priority = rs.getInt("priority");
                    Integer value = rs.wasNull() ? null : priority;
                    return new ChatActionItem(rs.getString("action_type"), rs.getString("label"), rs.getString("target_route"),
                            rs.getString("payload_json"), rs.getString("description"), value);
                })
                .list();
    }

    // ---------------------------------------------------------------------------------------------

    private Map<String, Object> contentParams(PlanRow plan) {
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("planId", plan.planId);
        params.put("planName", plan.planName);
        params.put("dataRevision", plan.dataRevision);
        params.put("targetCpa", plan.targetCpa);
        params.put("targetSemester", plan.targetGraduationSemester);
        params.put("maxCredits", plan.maxCreditsPerSemester);
        params.put("projectedCpa", plan.projectedCpa);
        params.put("warnings", write(plan.warnings));
        params.put("updatedAt", ts(plan.updatedAt));
        return params;
    }

    private PlanRow map(ResultSet rs, int rowNum) throws SQLException {
        PlanRow plan = new PlanRow();
        plan.planId = rs.getString("plan_id");
        plan.studentId = rs.getString("student_id");
        plan.planName = rs.getString("plan_name");
        plan.status = StudyPlanStatus.valueOf(rs.getString("status"));
        plan.version = rs.getInt("version");
        plan.sourcePlanId = rs.getString("source_plan_id");
        plan.dataRevision = rs.getString("data_revision");
        plan.targetCpa = rs.getBigDecimal("target_cpa");
        plan.targetGraduationSemester = rs.getString("target_graduation_semester");
        int maxCredits = rs.getInt("max_credits_per_semester");
        plan.maxCreditsPerSemester = rs.wasNull() ? null : maxCredits;
        plan.projectedCpa = rs.getBigDecimal("projected_cpa");
        plan.warnings = read(rs.getString("warnings_json"));
        plan.createdAt = instant(rs, "created_at");
        plan.updatedAt = instant(rs, "updated_at");
        plan.activatedAt = instant(rs, "activated_at");
        plan.validatedAt = instant(rs, "validated_at");
        int validatedVersion = rs.getInt("validated_plan_version");
        plan.validatedPlanVersion = rs.wasNull() ? null : validatedVersion;
        plan.validatedDataRevision = rs.getString("validated_data_revision");
        plan.validatedPolicyVersion = rs.getString("validated_policy_version");
        plan.checkedDataRevision = rs.getString("checked_data_revision");
        plan.checkedPolicyVersion = rs.getString("checked_policy_version");
        plan.totalCredits = rs.getInt("total_credits");
        return plan;
    }

    private static Map<String, Object> outdatedParams(String studentId, String dataRevision, String policyVersion,
                                                      Collection<StudyPlanStatus> statuses) {
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("studentId", studentId);
        params.put("statuses", statuses.stream().map(Enum::name).toList());
        params.put("revision", dataRevision);
        params.put("policy", policyVersion);
        return params;
    }

    private String write(List<String> values) {
        try {
            return objectMapper.writeValueAsString(values == null ? List.of() : values);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Không ghi được JSON kế hoạch", ex);
        }
    }

    private List<String> read(String json) {
        if (json == null) {
            return new ArrayList<>();
        }
        try {
            return objectMapper.readValue(json, STRINGS);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Không đọc được JSON kế hoạch", ex);
        }
    }

    private static OffsetDateTime ts(Instant instant) {
        return instant == null ? null : OffsetDateTime.ofInstant(instant, ZoneOffset.UTC);
    }

    private static Instant instant(ResultSet rs, String column) throws SQLException {
        OffsetDateTime value = rs.getObject(column, OffsetDateTime.class);
        return value == null ? null : value.toInstant();
    }
}
