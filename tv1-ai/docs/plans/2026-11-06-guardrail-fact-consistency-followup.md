# Follow-up: Guardrail factual consistency

Hai lỗ hổng đã được tái hiện bằng dữ liệu tổng hợp trong `ResponseGroundingValidatorTest.diagnosticTwoPassMatrixRecordsWhatTheCurrentGuardrailActuallyChanges`:

1. `courseCode=IT6080`, `courseName=Lập trình Web bằng Java` từ `CourseEligibilityResponse`, nhưng answer `IT6080 là Đồ án chuyên ngành.` được giữ nguyên. Cần phân biệt câu khẳng định sai với câu phủ định đúng như `IT6080 không phải Đồ án chuyên ngành`; test phải bao cả hai, và không biến tên user nêu thành dữ kiện đã xác minh.
2. Answer có hai lần ghi `CPA hiện tại` sai: guardrail sửa lần đầu nhưng để lọt lần hai. Cần xử lý toàn bộ lần nhắc CPA/GPA/tín chỉ phù hợp, đồng thời không sửa CPA mục tiêu, dự kiến hoặc ngưỡng quy chế. Test phải bao Markdown và hai lượt validate.
3. Guardrail quan hệ học trước hiện chỉ nhận một nhóm câu phủ định đã tái hiện, ví dụ `IT6020 không nằm trong yêu cầu học trước`. Thêm biến thể chỉ khi có lời đáp live mâu thuẫn và test đỏ; tránh chặn câu đúng như `IT6020 không phải môn tiên quyết mà là môn học trước`.

Giữ ranh giới: số liệu và tên chuẩn đến từ Academic Tool thuộc `TrustedStudentContext`; không thêm LLM call, không bỏ bảo vệ PII/citation. Đo câu trả lời live và false positives trước khi bật ở runtime. Đây là việc riêng, chưa coi là đã sửa trong đợt response integrity.
