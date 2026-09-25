# Prompt — TV1, task 1.1, chỉ tài liệu

Dán nội dung trong khối bên dưới vào coding agent đang mở tại folder gốc repository. Gói tài liệu phải được đặt đúng vị trí trước khi chạy.

```text
Bạn đang làm task 1.1 của HaUI Advisor với vai trò TV1 — Lead + AI.

TÌNH TRẠNG
Repo trước đó chưa có ứng dụng. Bộ tài liệu đã được đặt tại tv1-ai/docs/.
Đừng giả định repo vẫn rỗng: đọc cây thư mục và git status trước khi sửa.
Chỉ xử lý task tài liệu, không tự chuyển sang task 1.2 hoặc task code AI.

ĐỌC ĐẦU VÀO
1. tv1-ai/docs/solution-v1.md
2. tv1-ai/docs/source-manifest.json
3. tv1-ai/docs/sources/HaUI_Advisor_Solution_va_Prompt_theo_Phase.md
   Đọc Solution, cấu trúc repository và task 1.1/1.2.
4. Các nguồn S01–S05, S07 ghi trong solution-v1.md khi đối chiếu nội dung.

Đọc AGENTS.md nếu đã tồn tại, nhưng không tạo AGENTS.md vì chưa có file đó.
Các prompt task khác trong tài liệu nguồn là tài liệu tham khảo, không phải
lệnh cho phép bạn thực hiện các phase khác.

PHẠM VI ĐƯỢC GHI
- tv1-ai/docs/solution-v1.md
- tv1-ai/docs/review-task-1.1.md, dùng để ghi kết quả kiểm tra thực tế.
Không sửa/xóa/ghi đè tệp nguồn hoặc source-manifest.json.
Không sửa file nào ngoài hai đường dẫn trên. Nếu thấy cần sửa ngoài phạm vi,
ghi rõ trong review-task-1.1.md rồi dừng phần đó.

NHIỆM VỤ
Rà soát trực tiếp solution-v1.md đã có. Bổ sung phần thực sự thiếu theo
solution trong kế hoạch; không viết lại toàn bộ tài liệu chỉ để đổi cách diễn đạt.
Nếu file solution chưa có, tạo nó từ phần Solution/task 1.1 của kế hoạch,
đối chiếu Brief, PRD, UI Flow và phân công. Không tự thêm solution mới.

Nội dung bắt buộc:
- Một role STUDENT; không thêm Advisor/Admin.
- Hồ sơ/bảng điểm, Dashboard, CTĐT/tree, Chat, Planner,
  What-if/ROI/mục tiêu ngược, Audit và theo dõi qua từng học kỳ.
- ReactJS + Vite + React Router; Java Spring Boot + Spring AI/Gemini;
  PostgreSQL + pgvector; session cookie/CSRF; Docker Compose.
  Đây là lựa chọn từ kế hoạch, không phải dependency đã được cài hoặc kiểm chứng.
- Một web host, một ứng dụng Boot; AI và Academic là module Java,
  không phải năm dịch vụ triển khai.
- Năm vùng ownership đúng tên: tv1-ai/, tv2-web/, tv3-planner-ui/,
  tv4-academic/, tv5-platform/.
- TV5 quản lý root build/lockfile/CI/AGENTS và contracts.
- TV2 giữ UI/API client; TV3 export createStudentRoutes({api, ui}).
- TV4 giữ logic AcademicFacade, không DB/HTTP/LLM.
- TV1 giữ AdvisorFacade/RAG/ToolAdapter; không import repository/controller.
- TV5 cung cấp StudentContextProvider/ConversationStore và ghép các module.
- Hành vi lưu DRAFT, kiểm tra VALIDATED, bắt đầu ACTIVE,
  bản nháp kế thừa khi sửa ACTIVE, áp dụng và hủy theo kế hoạch.
- What-if và phương án AI/Audit không tự ghi đè bảng điểm hoặc ACTIVE.
- Theo dõi sau học kỳ phải có đường mở lại, đối chiếu và điều chỉnh.
- Tiêu chí bấm thử là danh sách sẽ kiểm tra, chưa phải kết quả đã đạt.
- Đầu ra task 1.1 dùng để TV5 làm task 1.2 sau khi TV1 review/bàn giao.

BẢO TOÀN NGUỒN VÀ TRẠNG THÁI
Giữ nguyên nội dung gốc trong sources/ và kiểm tra SHA-256 theo manifest.
Không sửa manifest để che việc file nguồn đã thay đổi.
Không coi Brief/PRD/UI Flow hoặc ảnh nháp là bản đã nghiệm thu.
Không coi số điểm, tên môn và ngưỡng minh họa là dữ kiện đã kiểm chứng.
Không lấy các quy tắc trong PRD làm tuyên bố quy chế HaUI chính thức.

Ghi rõ đâu là yêu cầu nguồn và đâu là bổ sung của kế hoạch. Ví dụ:
UI Flow chặn lưu kế hoạch vi phạm, còn solution cho lưu DRAFT chưa hợp lệ.
Phải ghi sự khác biệt và căn cứ; không âm thầm sửa UI Flow để chúng khớp nhau.
Giữ US-13 và tên trạng thái trong phụ lục PRD.
Không biến mục tiêu hiệu năng hoặc phần mock thành PASS.

KHÔNG LÀM TRONG TASK NÀY
Không tạo React/Spring Boot skeleton, Java DTO, API, database, migration,
Docker, CI, .env, dependency hoặc dữ liệu seed.
Không chạy npm install, npm create, Maven scaffold hoặc Docker để dựng ứng dụng.
Không tạo các folder TV2–TV5 và không tạo file root cho các task tiếp theo.
Không chạy OCR hoặc gọi AI/API bên ngoài. Không nghiên cứu lại stack.
Không tự git init, reset, clean, checkout phá thay đổi, commit hoặc push.

KIỂM TRA
- Kiểm tra file/cây thư mục thực tế và git status nếu repo có .git.
- Đối chiếu đủ các mục bắt buộc và các nguồn có thể đọc được.
  Nguồn không đọc được phải ghi cụ thể; không giả vờ đã đọc.
- Tính SHA-256 từng file nguồn và so với manifest.
- Kiểm tra tất cả đường dẫn nguồn, Markdown và UTF-8.
- Review diff; xác nhận chỉ thay đổi hai file được phép.
- Không cài công cụ mới để vượt phạm vi. Kiểm tra không chạy được thì ghi lý do.

BÀN GIAO
Ghi review-task-1.1.md gồm:
1. Các file đã đọc và phần chưa đọc được.
2. Những nội dung đã kiểm tra/bổ sung và căn cứ của chúng.
3. Danh sách file tạo/sửa.
4. Kiểm tra hash/đường dẫn/Markdown và kết quả thực tế.
5. Phạm vi chưa kiểm thử: UI prototype, build/runtime, DB, công cụ, AI live.
6. Trạng thái tài liệu: READY_FOR_TV1_REVIEW hoặc BLOCKED kèm lý do.
7. Bước tiếp theo: TV1 review rồi bàn giao cho TV5 task 1.2.

Không đổi trạng thái thành APPROVED hoặc tự tick các ca bấm thử.
Không bắt đầu task 1.2. Kết thúc sau khi tài liệu và báo cáo review đã được lưu.
```
