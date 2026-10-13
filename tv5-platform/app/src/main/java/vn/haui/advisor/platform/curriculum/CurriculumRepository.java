package vn.haui.advisor.platform.curriculum;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import vn.haui.advisor.contracts.dto.CurriculumCourseItem;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * CTĐT (curricula), học phần (courses) và học phần theo chương trình (curriculum_courses).
 */
@Repository
public class CurriculumRepository {

    private final JdbcClient jdbc;

    public CurriculumRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public record CurriculumRow(String curriculumId, String curriculumName, String majorCode, String majorName, String faculty,
                                Integer totalCreditsRequired, String dataStatus, String source) {
    }

    /** Thông tin học phần theo CTĐT dùng để kiểm tra dòng nhập bảng điểm. */
    public record CourseInfo(String courseCode, String courseName, BigDecimal credits) {
    }

    public Optional<CurriculumRow> find(String curriculumId) {
        return jdbc.sql("""
                        SELECT curriculum_id, curriculum_name, major_code, major_name, faculty, total_credits, data_status, source
                        FROM curricula WHERE curriculum_id = :id
                        """)
                .param("id", curriculumId)
                .query((rs, i) -> new CurriculumRow(rs.getString("curriculum_id"), rs.getString("curriculum_name"),
                        rs.getString("major_code"), rs.getString("major_name"), rs.getString("faculty"),
                        rs.getInt("total_credits"), rs.getString("data_status"), rs.getString("source")))
                .optional();
    }

    public Optional<String> findIdByMajorCode(String majorCode) {
        return jdbc.sql("SELECT curriculum_id FROM curricula WHERE major_code = :major ORDER BY curriculum_id")
                .param("major", majorCode).query(String.class).list().stream().findFirst();
    }

    public List<CurriculumCourseItem> listCourses(String curriculumId) {
        return jdbc.sql("""
                        SELECT c.course_code, c.course_name, c.credits, cc.knowledge_block, cc.suggested_semester, cc.is_mandatory,
                               cc.prerequisite_codes, cc.prior_course_codes, cc.corequisite_codes
                        FROM curriculum_courses cc JOIN courses c ON c.course_id = cc.course_id
                        WHERE cc.curriculum_id = :id ORDER BY cc.sort_order
                        """)
                .param("id", curriculumId)
                .query((rs, i) -> {
                    CurriculumCourseItem item = new CurriculumCourseItem();
                    item.setCourseCode(rs.getString("course_code"));
                    item.setCourseName(rs.getString("course_name"));
                    item.setCredits(rs.getBigDecimal("credits").stripTrailingZeros());
                    item.setKnowledgeBlock(rs.getString("knowledge_block"));
                    item.setSuggestedSemester((Integer) rs.getObject("suggested_semester"));
                    item.setMandatory(rs.getBoolean("is_mandatory"));
                    item.setPrerequisiteCourseCodes(split(rs.getString("prerequisite_codes")));
                    item.setPriorCourseCodes(split(rs.getString("prior_course_codes")));
                    item.setCorequisiteCourseCodes(split(rs.getString("corequisite_codes")));
                    return item;
                })
                .list();
    }

    public Map<String, CourseInfo> courseCatalog(String curriculumId) {
        Map<String, CourseInfo> catalog = new LinkedHashMap<>();
        jdbc.sql("""
                        SELECT c.course_code, c.course_name, c.credits
                        FROM curriculum_courses cc JOIN courses c ON c.course_id = cc.course_id
                        WHERE cc.curriculum_id = :id
                        """)
                .param("id", curriculumId)
                .query((rs, i) -> new CourseInfo(rs.getString("course_code"), rs.getString("course_name"),
                        rs.getBigDecimal("credits").stripTrailingZeros()))
                .list()
                .forEach(info -> catalog.put(info.courseCode(), info));
        return catalog;
    }

    // ----- seed -----

    public void upsertCurriculum(CurriculumRow row) {
        int updated = jdbc.sql("""
                        UPDATE curricula SET curriculum_name = :name, major_code = :major, major_name = :majorName, faculty = :faculty,
                               total_credits = :total, data_status = :status, source = :source, updated_at = CURRENT_TIMESTAMP
                        WHERE curriculum_id = :id
                        """)
                .params(curriculumParams(row)).update();
        if (updated == 0) {
            jdbc.sql("""
                            INSERT INTO curricula (curriculum_id, curriculum_code, curriculum_name, major_code, major_name, faculty,
                                                   total_credits, data_status, source, is_active)
                            VALUES (:id, :id, :name, :major, :majorName, :faculty, :total, :status, :source, TRUE)
                            """)
                    .params(curriculumParams(row)).update();
        }
    }

    public void upsertCourse(String curriculumId, int sortOrder, String code, String name, BigDecimal credits, String knowledgeBlock,
                             Integer suggestedSemester, boolean mandatory, List<String> prerequisites, List<String> priorCourses,
                             List<String> corequisites) {
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("code", code);
        params.put("name", name);
        params.put("credits", credits);
        params.put("block", knowledgeBlock);
        params.put("semester", suggestedSemester);
        params.put("mandatory", mandatory);
        int updated = jdbc.sql("""
                        UPDATE courses SET course_name = :name, credits = :credits, knowledge_block = :block,
                               suggested_semester = :semester, is_mandatory = :mandatory, updated_at = CURRENT_TIMESTAMP
                        WHERE course_id = :code
                        """).params(params).update();
        if (updated == 0) {
            jdbc.sql("""
                            INSERT INTO courses (course_id, course_code, course_name, credits, knowledge_block, is_mandatory, suggested_semester)
                            VALUES (:code, :code, :name, :credits, :block, :mandatory, :semester)
                            """).params(params).update();
        }

        params.put("curriculumId", curriculumId);
        params.put("sortOrder", sortOrder);
        params.put("prerequisites", join(prerequisites));
        params.put("prior", join(priorCourses));
        params.put("coreq", join(corequisites));
        int linked = jdbc.sql("""
                        UPDATE curriculum_courses SET sort_order = :sortOrder, suggested_semester = :semester, is_mandatory = :mandatory,
                               knowledge_block = :block, prerequisite_codes = :prerequisites, prior_course_codes = :prior,
                               corequisite_codes = :coreq
                        WHERE curriculum_id = :curriculumId AND course_id = :code
                        """).params(params).update();
        if (linked == 0) {
            jdbc.sql("""
                            INSERT INTO curriculum_courses (curriculum_id, course_id, sort_order, suggested_semester, is_mandatory,
                                                            knowledge_block, prerequisite_codes, prior_course_codes, corequisite_codes)
                            VALUES (:curriculumId, :code, :sortOrder, :semester, :mandatory, :block, :prerequisites, :prior, :coreq)
                            """).params(params).update();
        }
    }

    private static Map<String, Object> curriculumParams(CurriculumRow row) {
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("id", row.curriculumId());
        params.put("name", row.curriculumName());
        params.put("major", row.majorCode());
        params.put("majorName", row.majorName());
        params.put("faculty", row.faculty());
        params.put("total", row.totalCreditsRequired());
        params.put("status", row.dataStatus());
        params.put("source", row.source());
        return params;
    }

    private static String join(List<String> codes) {
        return codes == null || codes.isEmpty() ? null : String.join(",", codes);
    }

    private static List<String> split(String codes) {
        return codes == null || codes.isBlank() ? List.of() : Arrays.stream(codes.split(",")).map(String::trim).toList();
    }
}
