package vn.haui.advisor.ai.tools;

import java.util.*;

/**
 * Định nghĩa danh mục 7 công cụ theo chuẩn OpenAPI / Gemini Function Declarations Schema:
 * - 6 công cụ học vụ (ủy thác cho AcademicFacade / TV4 Engine qua ToolAdapter)
 * - 1 công cụ tra cứu quy chế (ủy thác cho RagAdvisorService qua TV1 RAG)
 */
public final class GeminiToolDeclarations {

    private GeminiToolDeclarations() {
    }

    public static List<Map<String, Object>> getToolDeclarations() {
        List<Map<String, Object>> functions = new ArrayList<>();

        // 1. run_graduation_audit
        functions.add(Map.of(
                "name", "run_graduation_audit",
                "description", "Rà soát tiến độ tốt nghiệp của sinh viên hiện tại, tổng số tín chỉ tích lũy, số tín chỉ còn thiếu, và trạng thái hoàn thành các chuẩn đầu ra (Tin học, Ngoại ngữ, GDQP, Thể chất).",
                "parameters", Map.of(
                        "type", "OBJECT",
                        "properties", Collections.emptyMap()
                )
        ));

        // 2. get_academic_status
        functions.add(Map.of(
                "name", "get_academic_status",
                "description", "Tra cứu điểm trung bình tích lũy CPA, điểm GPA kỳ gần nhất, số tín chỉ tích lũy, xếp loại học lực và tình trạng cảnh báo học tập hiện tại của sinh viên.",
                "parameters", Map.of(
                        "type", "OBJECT",
                        "properties", Collections.emptyMap()
                )
        ));

        // 3. check_course_eligibility
        Map<String, Object> checkProps = new LinkedHashMap<>();
        checkProps.put("course_code", Map.of(
                "type", "STRING",
                "description", "Mã học phần cần kiểm tra (ví dụ: 'IT6080', 'IT6019', 'MA6001')."
        ));
        checkProps.put("semester", Map.of(
                "type", "STRING",
                "description", "Học kỳ dự kiến đăng ký học phần (ví dụ: '2026_1', '2026_2'). Không bắt buộc."
        ));
        functions.add(Map.of(
                "name", "check_course_eligibility",
                "description", "Kiểm tra điều kiện tiên quyết, học phần học trước, học phần song hành và điều kiện hợp lệ để đăng ký một học phần cụ thể.",
                "parameters", Map.of(
                        "type", "OBJECT",
                        "properties", checkProps,
                        "required", List.of("course_code")
                )
        ));

        // 4. rank_retake_courses
        Map<String, Object> retakeProps = new LinkedHashMap<>();
        retakeProps.put("target_cpa", Map.of(
                "type", "NUMBER",
                "description", "Điểm CPA mục tiêu mà sinh viên mong muốn đạt được (ví dụ: 3.2)."
        ));
        retakeProps.put("max_suggestions", Map.of(
                "type", "INTEGER",
                "description", "Số lượng học phần học lại tối đa cần gợi ý (mặc định là 3)."
        ));
        functions.add(Map.of(
                "name", "rank_retake_courses",
                "description", "Phân tích bảng điểm cá nhân và xếp hạng danh sách các học phần sinh viên nên học lại/học cải thiện để nâng điểm CPA hiệu quả nhất.",
                "parameters", Map.of(
                        "type", "OBJECT",
                        "properties", retakeProps
                )
        ));

        // 5. simulate_grades
        Map<String, Object> simItemProps = new LinkedHashMap<>();
        simItemProps.put("course_code", Map.of("type", "STRING", "description", "Mã học phần cần mô phỏng"));
        simItemProps.put("expected_grade", Map.of("type", "STRING", "description", "Điểm chữ dự kiến (A, B, C, D, F)"));

        Map<String, Object> simProps = new LinkedHashMap<>();
        simProps.put("simulations", Map.of(
                "type", "ARRAY",
                "description", "Danh sách các môn học giả định điểm số",
                "items", Map.of(
                        "type", "OBJECT",
                        "properties", simItemProps,
                        "required", List.of("course_code", "expected_grade")
                )
        ));
        functions.add(Map.of(
                "name", "simulate_grades",
                "description", "Mô phỏng điểm số giả định cho một hoặc nhiều học phần để tính toán dự báo điểm CPA mới của sinh viên.",
                "parameters", Map.of(
                        "type", "OBJECT",
                        "properties", simProps,
                        "required", List.of("simulations")
                )
        ));

        // 6. generate_study_plan
        Map<String, Object> planProps = new LinkedHashMap<>();
        planProps.put("target_semester", Map.of(
                "type", "STRING",
                "description", "Học kỳ dự kiến tốt nghiệp mục tiêu (ví dụ: '2026_2')."
        ));
        planProps.put("max_credits", Map.of(
                "type", "INTEGER",
                "description", "Số tín chỉ tối đa sinh viên có thể đăng ký trong một học kỳ (ví dụ: 18)."
        ));
        planProps.put("target_cpa", Map.of(
                "type", "NUMBER",
                "description", "Mục tiêu điểm CPA mong muốn."
        ));
        functions.add(Map.of(
                "name", "generate_study_plan",
                "description", "Lập đề xuất kế hoạch lộ trình học tập chi tiết phân bổ các môn theo từng học kỳ cho đến khi tốt nghiệp.",
                "parameters", Map.of(
                        "type", "OBJECT",
                        "properties", planProps,
                        "required", List.of("target_semester", "max_credits")
                )
        ));

        // 7. search_regulations
        Map<String, Object> regProps = new LinkedHashMap<>();
        regProps.put("query", Map.of(
                "type", "STRING",
                "description", "Từ khóa hoặc câu hỏi tóm tắt nội dung quy chế cần tra cứu (ví dụ: 'quy định cảnh báo học vụ mức 1', 'điều kiện hoãn thi kết thúc học phần')."
        ));
        functions.add(Map.of(
                "name", "search_regulations",
                "description", "Tra cứu cẩm nang quy chế đào tạo đại học chính quy HaUI (quy định đăng ký tín chỉ, thang điểm, điều kiện cảnh báo học vụ, hoãn thi, thôi học, học bổng...).",
                "parameters", Map.of(
                        "type", "OBJECT",
                        "properties", regProps,
                        "required", List.of("query")
                )
        ));

        // 8. get_transcript
        Map<String, Object> transcriptProps = new LinkedHashMap<>();
        transcriptProps.put("filter", Map.of(
                "type", "STRING",
                "description", "Bộ lọc học phần: 'ALL' (tất cả), 'GRADE_A' (chỉ môn điểm A/A+), 'FAILED' (môn nợ/trượt), 'PASSED' (môn đã qua). Mặc định là 'ALL'."
        ));
        functions.add(Map.of(
                "name", "get_transcript",
                "description", "Tra cứu toàn bộ lịch sử học tập và bảng điểm chi tiết của sinh viên: danh sách các học phần đã học, điểm chữ (A, B, C, D, F), điểm thang 10, số tín chỉ và học kỳ hoàn thành. Dùng khi sinh viên hỏi về các môn đã học, môn điểm cao/thấp, môn điểm A, hoặc phân tích kết quả học tập trong quá khứ.",
                "parameters", Map.of(
                        "type", "OBJECT",
                        "properties", transcriptProps
                )
        ));

        // 9. get_curriculum_tree
        Map<String, Object> treeProps = new LinkedHashMap<>();
        treeProps.put("scope", Map.of(
                "type", "STRING",
                "description", "Phạm vi tra cứu: 'ELIGIBLE_NEXT_SEMESTER' (các môn đủ điều kiện đăng ký ngay kỳ tới), 'REMAINING_COURSES' (toàn bộ môn chưa học trong CTĐT), 'ALL' (toàn bộ cây CTĐT). Mặc định là 'ELIGIBLE_NEXT_SEMESTER'."
        ));
        functions.add(Map.of(
                "name", "get_curriculum_tree",
                "description", "Tra cứu toàn bộ cây chương trình đào tạo (CTĐT) của sinh viên: danh sách các môn chưa học (bắt buộc/tự chọn), danh sách các môn ĐỦ ĐIỀU KIỆN ĐĂNG KÝ trong học kỳ tới, điều kiện tiên quyết và học kỳ gợi ý. Dùng khi sinh viên hỏi về các môn học trong tương lai, kỳ tới nên/được học môn gì, hoặc lộ trình các môn còn lại.",
                "parameters", Map.of(
                        "type", "OBJECT",
                        "properties", treeProps
                )
        ));

        return List.of(Map.of("functionDeclarations", functions));
    }
}
