package vn.haui.advisor.platform.support;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import vn.haui.advisor.academic.model.StudentProfileFixture;
import vn.haui.advisor.contracts.dto.AcademicRiskLevel;
import vn.haui.advisor.contracts.dto.ConfirmTranscriptImportRequest;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

/**
 * Dữ liệu học vụ của sinh viên test qua API thật: nhập bảng điểm (nhập tay → xem lại → xác nhận) và dựng hồ sơ đầu vào
 * của công cụ TV4 độc lập từ /academic/transcript + /academic/status để so kết quả API với engine.
 */
public class StudentRecords {

    private final StudentApi api;
    private final ObjectMapper objectMapper;

    public StudentRecords(StudentApi api, ObjectMapper objectMapper) {
        this.api = api;
        this.objectMapper = objectMapper;
    }

    /** Thay bảng điểm bằng các dòng {@code rows}; trả dataRevision mới. */
    public String confirmManualImport(String sv, String revision, ObjectNode... rows) throws Exception {
        JsonNode session = api.call(post("/api/v1/academic/transcript/imports/manual"), sv, 200, "TranscriptImportResponse");
        String id = session.get("importSessionId").asText();
        ObjectNode update = objectMapper.createObjectNode().put("sessionVersion", session.get("sessionVersion").asInt());
        ArrayNode list = update.putArray("rows");
        for (ObjectNode row : rows) {
            list.add(row);
        }
        String imports = "/api/v1/academic/transcript/imports/" + id;
        JsonNode reviewed = api.call(put(imports + "/rows"), sv, 200, "TranscriptImportResponse", update);
        return api.call(post(imports + "/confirm"), sv, 200, "TranscriptResponse",
                new ConfirmTranscriptImportRequest(reviewed.get("sessionVersion").asInt(), revision)).get("dataRevision").asText();
    }

    public ObjectNode row(String courseCode, String semesterCode, double score10, String letterGrade) {
        return objectMapper.createObjectNode().put("courseCode", courseCode).put("semesterCode", semesterCode)
                .put("score10", score10).put("letterGrade", letterGrade);
    }

    /** Hồ sơ đầu vào công cụ TV4 dựng độc lập từ API: bảng điểm đã xác nhận + trạng thái học vụ facade tính. */
    public StudentProfileFixture profileFromApi(String sv) throws Exception {
        JsonNode transcript = api.call(get("/api/v1/academic/transcript"), sv, 200, "TranscriptResponse");
        JsonNode status = api.call(get("/api/v1/academic/status"), sv, 200, "AcademicStatusResponse");
        StudentProfileFixture profile = new StudentProfileFixture();
        profile.setStudentId(sv);
        profile.setDataRevision(status.get("dataRevision").asText());
        profile.setCpa(status.get("cpa").isNull() ? null : status.get("cpa").decimalValue());
        profile.setAccumulatedCredits(status.get("accumulatedCredits").isNull() ? null : status.get("accumulatedCredits").asDouble());
        profile.setRiskLevel(AcademicRiskLevel.valueOf(status.get("riskLevel").asText()));
        List<StudentProfileFixture.CourseAttempt> attempts = new ArrayList<>();
        Set<String> mainSemesters = new HashSet<>();
        for (JsonNode item : transcript.get("attempts")) {
            StudentProfileFixture.CourseAttempt attempt = new StudentProfileFixture.CourseAttempt();
            attempt.setCourseCode(item.get("courseCode").asText());
            attempt.setCourseName(text(item, "courseName"));
            attempt.setCredits(item.get("credits").asDouble());
            attempt.setSemesterCode(item.get("semesterCode").asText());
            attempt.setLetterGrade(text(item, "letterGrade"));
            attempt.setScore10(item.path("score10").isNumber() ? item.get("score10").asDouble() : null);
            attempts.add(attempt);
            if (attempt.getSemesterCode().matches("^[0-9]{4}_(1|2)$")) {
                mainSemesters.add(attempt.getSemesterCode());
            }
        }
        profile.setCourseAttempts(attempts);
        profile.setCurrentSemester(mainSemesters.isEmpty() ? null : mainSemesters.size());
        return profile;
    }

    /** JSON so sánh được giữa kết quả API và DTO tính trực tiếp (cùng đường serialize/parse). */
    public JsonNode json(Object value) throws Exception {
        return objectMapper.readTree(objectMapper.writeValueAsString(value));
    }

    private static String text(JsonNode node, String field) {
        return node.path(field).isTextual() ? node.get(field).asText() : null;
    }
}
