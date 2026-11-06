# Response Integrity and Course Grounding — Design Spec (2026-11-06)

## Ý định và phạm vi

Sinh viên phải nhận được một câu trả lời hoàn chỉnh, phân biệt đúng mã/tên học phần, môn tiên quyết, môn học trước và môn song hành. Thiết kế này xử lý các lỗi mới quan sát khi thử nhánh `codex/conversational-academic-advisor`; nó bổ sung cho [plan cố vấn hội thoại 2026-11-05](../plans/2026-11-05-conversational-academic-advisor.md), không khởi động lại audit hay Phase 5 function calling.

Đợt này chỉ thiết kế. Khi triển khai, không thêm agent framework, fine-tuning, RAG mới, LLM call thứ hai hay dữ liệu học vụ giả trong runtime. `TrustedStudentContext` và Academic Engine tiếp tục quyết định hồ sơ, điểm số và điều kiện đăng ký.

## Bằng chứng và mức chắc chắn

| Phát hiện | Bằng chứng | Mức chắc chắn |
| --- | --- | --- |
| Câu cụt đã tồn tại trước UI | Hai lượt trong conversation local `2ae15e26-4c83-46a1-af21-b4b4f66cd652` được backend lưu lần lượt kết thúc ở `CPA $\\ge$` và `yêu cầu hoàn`, `warnings=[]`; UI dùng `response.answer` nguyên văn tại `tv3-planner-ui/src/pages/ChatAdvisorPage.js:600`. | Đã xác nhận |
| Adapter có thể cắt phản hồi hợp lệ | `LiveAdvisorModel.java:247-252` chỉ đọc `parts/0/text`. Trong 8 lần gọi cùng model `gemini-3.5-flash-lite`, temperature `0.2`, prompt tái dựng gần lượt IT6080, có một phản hồi `finishReason=STOP`, hai text parts dài 19 và 302 ký tự; phần sau nối tiếp giữa câu. | Cơ chế lỗi đã tái hiện; payload thô của hai lượt cũ không được lưu |
| Câu gợi ý sai tên môn | `ChatAdvisorPage.js:11,1974` ghi `IT6080 - Đồ án chuyên ngành`; fixture CTĐT và API live ghi IT6080 = `Lập trình Web bằng Java`, IT6150 = `Đồ án chuyên ngành` (`curriculum-ktpm-v1.json:1273,1427`). | Đã xác nhận trên CTĐT demo local |
| Tool không trả đủ dữ kiện cho câu hỏi | `CourseEligibilityResponse` chỉ có `eligible`, `missingPrerequisites`; prompt tại `LiveAdvisorModel.java:388` bỏ tên và các quan hệ đầy đủ. API live: IT6080 có `prerequisiteCourseCodes=[]`, `priorCourseCodes=[IT6019,IT6020]`, hiện còn thiếu IT6020. | Đã xác nhận |
| Guardrail có ảnh hưởng chất lượng tiềm tàng | `LiveAdvisorModel.java:95` và `DefaultAdvisorFacade.java:189` cùng validate; `ResponseGroundingValidator.java:148-150` thay cả câu khi gặp source ID không neo; `validateCourseCodes` chỉ cảnh báo mã, không đối chiếu tên. | Hành vi code đã xác nhận; tần suất ảnh hưởng hội thoại chưa đo |
| `0.8s` trên UI là số cố định | `ChatAdvisorPage.js:613`. | Đã xác nhận; không dùng làm baseline latency |

## Thiết kế được chọn và các phương án bỏ qua

1. **Sửa adapter Gemini tại một điểm đọc response.** Gom toàn bộ text parts của candidate đầu tiên theo thứ tự; không đưa thought parts vào câu trả lời. Chỉ nhận câu trả lời khi `finishReason=STOP` và text không rỗng. `MAX_TOKENS`, `SAFETY`, thiếu candidate/text hoặc response không hoàn chỉnh đi vào lỗi provider hiện có, để `AdvisorChatService` trả 503 và không lưu lượt. Ghi telemetry phi nội dung: model, finish reason, số parts, tổng độ dài, token input/output từ `usageMetadata`, thời gian gọi và mã lỗi. Không log prompt, câu trả lời, khóa API hay định danh sinh viên.
2. **Mở rộng chính kết quả eligibility hiện có.** Thêm `courseName`, `prerequisiteCourseCodes`, `priorCourseCodes`, `corequisiteCourseCodes` vào `CourseEligibilityResponse`; `DefaultAcademicFacade.checkCourseEligibility` gắn metadata từ đúng `targetCurriculum` đã đưa vào `RuleEvaluator`. `LiveAdvisorModel.formatToolResults` truyền các trường này cùng kết quả đủ điều kiện. Không thêm capability/call mới. Nếu không tìm thấy học phần trong đúng CTĐT, không dùng tên từ câu hỏi như dữ kiện đã xác minh.
3. **Sửa nội dung gợi ý chat đang sai.** Đổi hai prompt IT6080–Đồ án trong `ChatAdvisorPage.js` thành câu trung tính yêu cầu sinh viên nêu mã môn, hoặc một gợi ý được lấy từ CTĐT đã tải. Bản đầu chọn câu trung tính để không thêm request khi mở trang. Không thêm mã/tên hardcode khác. Nếu không có API client, chat báo lỗi cấu hình thay vì chạy `generateMockChatResponse` chứa mô tả IT6080 cũ. Test fixture vẫn có thể dùng mock API được tiêm tường minh.
4. **Đo guardrail trước khi sửa hành vi.** Tạo một bộ ca bất biến gồm PII, citation có/không có nguồn, nhiều mã môn, số liệu authoritative, Markdown và trả lời tư vấn. Ghi các thay đổi `raw → sau validate lần 1 → sau validate lần 2` dưới dạng diff cục bộ có dữ liệu tổng hợp, không log nội dung sinh viên thật. Chỉ tạo task sửa guardrail riêng nếu phép đo chỉ ra phản hồi hợp lệ bị xóa/sai hoặc thông tin thiếu căn cứ lọt qua. Double-validation là ứng viên đơn giản hóa, chưa là nguyên nhân đã chứng minh của hai câu cụt.

Không chọn cách gọi Gemini lần nữa để “viết lại” câu cụt: lỗi mất `parts` nằm ở parser, retry tăng latency và cost mà không khôi phục đúng payload. Không chọn RAG cho metadata CTĐT: quan hệ học phần đã có trong Academic Engine và cần giữ tính authoritative. Không chọn regex sửa câu trả lời sau khi model sinh: regex không thể tái tạo phần văn bản bị adapter bỏ.

## Dòng dữ liệu và ranh giới tin cậy

`user message + owned history → ConversationTurnPlanner → CHECK_COURSE_ELIGIBILITY(TrustedStudentContext, courseCode) → AcademicFacade/RuleEvaluator + course definition cùng CTĐT → formatToolResults → Gemini → kiểm tra finishReason, ghép parts → grounding/PII validator → persist → UI`.

Lời trả lời phải phân biệt:

- **Quan hệ trong CTĐT:** danh sách đầy đủ `prerequisiteCourseCodes`, `priorCourseCodes`, `corequisiteCourseCodes`.
- **Tình trạng cá nhân:** `eligible`, `missingPrerequisites` của sinh viên hiện tại; tên field legacy không được dùng để gọi tất cả mục bên trong là “môn tiên quyết”.
- **Quy chế:** chỉ khẳng định và citation khi RAG thật sự cung cấp nguồn tương ứng.
- **Tên người dùng tự nêu:** là giả định cần đối chiếu với `courseName` của cùng mã; nếu khác, nêu khác biệt ngắn gọn rồi dùng tên đã xác minh.

Không nhận `studentId`, `dataRevision`, tên môn hoặc quan hệ từ LLM như input cho Academic Engine. Không mở quyền truy cập lịch sử hay CTĐT của sinh viên khác. `CourseEligibilityResponse` bổ sung trường nullable để các client cũ tiếp tục đọc được các trường cũ; model không được diễn giải null là danh sách rỗng.

## Nghiệm thu và giới hạn đo

| Gate | Tiêu chí đo được |
| --- | --- |
| Response integrity | Test với 1, 2, 3 text parts, split giữa từ/câu, thought part, `STOP`, `MAX_TOKENS`, `SAFETY`, thiếu text: 100% text hợp lệ được nối đúng thứ tự; 100% response không hoàn chỉnh trả lỗi và không lưu hội thoại. |
| Course grounding | Với fixture CTĐT demo, IT6080 được gọi đúng tên, `prerequisites=[]`, `prior=[IT6019,IT6020]`; IT6150 được gọi đúng tên. Một môn không có trong CTĐT không được gán tên/quan hệ do người dùng tự khai. |
| UI consistency | Không còn prompt live ghép sai `IT6080` với `Đồ án chuyên ngành`; thời gian xử lý không được trình bày là số đo nếu vẫn là giá trị cố định. |
| Guardrail diagnosis | Ma trận trước/sau ghi rõ số ca bị thay toàn bộ, mất Markdown, rò PII, citation sai, mã/tên sai; kết luận sửa hay giữ từng quy tắc dựa trên kết quả, không dựa vào giả định. |
| Latency/cost | Đường trả lời mặc định vẫn có tối đa một generation call. Không thêm network call cho việc ghép parts hoặc gợi ý chat; đo wall time backend và provider trên cùng bộ câu hỏi trước/sau, báo p50/p95 và token thay đổi. p95 live được báo kèm cỡ mẫu và không lấy 20 lượt làm ngưỡng thống kê cứng; không dùng `0.8s` của UI. |

## Giới hạn và rủi ro

- Hai payload Gemini gốc không còn nên chỉ xác nhận cơ chế parser có thể gây vết cắt; không gán nguyên nhân tuyệt đối cho từng lượt cũ.
- CTĐT local là dữ liệu demo `policy-haui-demo-*`; không suy ra đây là quy chế HaUI chính thức. Test production phải dùng CTĐT/version tương ứng môi trường.
- Nếu `finishReason` có giá trị thành công khác `STOP` ở provider thực tế, cần kiểm chứng bằng payload hợp lệ trước khi mở rộng allowlist; không mặc định nhận mọi status 200.
- Metadata eligibility làm prompt dài hơn một ít; giới hạn ở học phần được hỏi và đo token trước/sau. Không truyền toàn bộ cây CTĐT vào prompt.
