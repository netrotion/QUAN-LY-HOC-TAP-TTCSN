# BÁO CÁO ĐÁNH GIÁ KIẾN TRÚC VÀ BẢO MẬT ĐỘC LẬP (TASK 3.8 CODE REVIEW)
## Phân hệ Hội thoại Cố vấn Học vụ, Điều phối Công cụ (Tool Calling) & Kiểm chuẩn Neo Nguồn (Response Grounding)

- **Dự án:** HaUI Academic Advisor (`QUAN-LY-HOC-TAP-TTCSN`)
- **Mã Task:** Task 3.8 — Code hội thoại và Tool Calling
- **Phân hệ thẩm định:** `tv1-ai` (`vn.haui.advisor:haui-ai`)
- **Vai trò thẩm định:** Sub-Agent F — Kỹ sư Đánh giá Độc lập về Kiến trúc và An toàn Thông tin (Independent Security & Code Reviewer)
- **Thời điểm đánh giá:** 2026-10-13
- **Quyết định phê duyệt:** **APPROVED — CHẤP THUẬN NGHIỆM THU KIẾN TRÚC VÀ MÃ NGUỒN**

---

## 1. Tóm tắt Điều hành (Executive Summary)

Sub-Agent F đã tiến hành rà soát kỹ thuật và thẩm định độc lập toàn diện mã nguồn triển khai của Task 3.8 trong thư mục `tv1-ai/`. Quá trình đánh giá tập trung vào tính toàn vẹn của kiến trúc phân lớp, việc tuân thủ hợp đồng hệ thống (`haui-contracts`), ranh giới bảo mật danh tính sinh viên, cơ chế phòng vệ trước tấn công Prompt Injection, tính an toàn trong điều phối công cụ (Tool Calling Security Boundaries) và chất lượng mã nguồn Java 21 / Spring Boot 3.4.

### Kết quả Tổng quan:
1. **Kiến trúc Phân lớp Sạch (Clean Layered Architecture):** Mã nguồn phân tách rành mạch các trách nhiệm cốt lõi:
   - Tầng điều phối (`DefaultAdvisorFacade`) quản lý quy trình luồng theo đúng bản vẽ kiến trúc khép kín.
   - Tầng phân tích ý định (`IntentClassifier`, `ParsedUserIntent`) bóc tách tham số và theo dõi thay đổi mục tiêu đa lượt.
   - Tầng bộ chuyển đổi công cụ (`ToolAdapter`, `DefaultToolAdapter`, `ToolParameterValidator`) kiểm chuẩn nghiêm ngặt và bao phủ toàn bộ 9 năng lực của `AcademicFacade`.
   - Tầng lưu trữ hội thoại (`ConversationHistoryManager`, `ChatMessageHistoryItem`) quản lý ngữ cảnh trượt (Sliding Window) và tự động cắt tỉa giới hạn dung lượng lưu trữ.
   - Tầng mô hình & hậu kiểm (`LiveAdvisorModel`, `MockAdvisorModel`, `ResponseGroundingValidator`) đảm bảo nguyên tắc suy luận neo nguồn và bảo toàn số liệu toán học.
2. **Tuân thủ Tuyệt đối Hợp đồng Contracts V1:** 
   - Không vi phạm ranh giới ghi dữ liệu: toàn bộ các chỉnh sửa mã nguồn được cách ly 100% trong phạm vi `tv1-ai/**`. Các module `tv4-academic`, `tv5-platform`, `tv2-web`, `tv3-planner-ui` được giữ nguyên trạng thái Read-Only.
   - Cung cấp đầy đủ các phương thức mở rộng trên hợp đồng `AdvisorFacade` và `ToolAdapter`.
3. **An ninh Thông tin & Bảo vệ Dữ liệu:**
   - **Xác thực Danh tính Đáng tin cậy (Trusted Identity Propagation):** Định danh sinh viên `studentId` và phiên bản dữ liệu `dataRevision` được trích xuất duy nhất từ `TrustedStudentContext` do tầng bảo mật server cấp. Mọi tham số do client gửi lên hoặc do mô hình ngôn ngữ sinh ra đều bị ghi đè.
   - **Phòng vệ Tấn công Chèn chỉ thị (Prompt Injection Defenses):** Toàn bộ dữ liệu RAG và kết quả công cụ được bọc trong các thẻ XML tham chiếu thụ động (`<rag_evidence>`, `<academic_tool_results>`), ngăn chặn triệt để kỹ thuật trích xuất hay ghi đè quyền hạn hệ thống.
   - **Lọc Độc tố Ngữ cảnh (Context Poisoning Mitigation):** `EvidenceValidator` phát hiện và loại bỏ các chunk văn bản nghi ngờ chèn chỉ thị trước khi chuyển tới mô hình.
   - **Hậu kiểm Danh mục Hành động (Action Allowlist):** Các đường dẫn ngoài danh sách quy định (`/planner`, `/what-if`, `/transcript`, `/academic/audit`, v.v.) hoặc các lược đồ URL nguy hiểm (`javascript:`, `http://external`) bị loại bỏ 100%.
   - **Chống Rò rỉ Thông tin Mật (Information Disclosure Prevention):** Khi nhà cung cấp AI gặp lỗi, hệ thống không trả về stack trace hay thông tin nội bộ cho sinh viên, chỉ ghi log chẩn đoán an toàn.
4. **Bảo toàn Số liệu Toán học (Mathematical Integrity Preservation):** Điểm trung bình CPA, GPA, số tín chỉ tích lũy từ công cụ học vụ được bảo vệ tuyệt đối. `ResponseGroundingValidator` áp dụng cơ chế xác thực để đảm bảo mô hình không tự tiện thay đổi hoặc làm tròn sai lệch số liệu học vụ chính thức.

---

## 2. Bảng Kiểm tra Thẩm định Độc lập (Review Checklist)

| STT | Hạng mục Kiểm tra | Tiêu chuẩn Đánh giá | Kết quả | Đánh giá Kỹ thuật |
|:---:|---|---|:---:|---|
| **I** | **Kiến trúc & Ranh giới Module** | | | |
| 1.1 | Ranh giới ghi mã nguồn | Chỉ ghi vào `tv1-ai/**`, giữ nguyên các module khác | **PASS** | 100% thay đổi nằm trong `tv1-ai`. Không sửa `tv4-academic` hay `tv5-platform`. |
| 1.2 | Tính phân lớp rành mạch | Facade $\rightarrow$ Intent $\rightarrow$ Tools $\rightarrow$ RAG $\rightarrow$ Model $\rightarrow$ Validator | **PASS** | Mỗi thành phần độc lập, đơn trách nhiệm, dễ kiểm thử đơn vị. |
| 1.3 | Quản lý vòng đời công cụ | Bounded tool calling $\le 3$ calls / lượt, timeout 2500ms | **PASS** | Sử dụng `ExecutorService` và `Future.get(toolTimeoutMs)` để ngắt an toàn. |
| **II** | **Điều phối Công cụ Học vụ (Tool Calling)** | | | |
| 2.1 | Bao phủ 9 năng lực | Hỗ trợ trọn vẹn 9 capabilities của `AcademicFacade` | **PASS** | Khai báo và ủy quyền đầy đủ qua `ToolAdapter` và `DefaultToolAdapter`. |
| 2.2 | Kiểm tra độ sẵn sàng | Gọi `readyCapabilities()` trước khi thực thi | **PASS** | Trả về cảnh báo `TOOL_UNAVAILABLE` nếu capability chưa sẵn sàng. |
| 2.3 | Kiểm chuẩn tham số tiền điều kiện | Kiểm tra biên CPA [0, 4], tín chỉ [10, 30], regex mã môn | **PASS** | `ToolParameterValidator` chặn lỗi dữ liệu rác ngay tại biên ứng dụng. |
| 2.4 | Ranh giới chỉ đọc & dự thảo | Không tự ý kích hoạt hay lưu kế hoạch học tập chính thức | **PASS** | Chỉ sinh `ChatPlanProposal` dự thảo; việc ghi nhận chính thức thuộc về người dùng. |
| **III**| **Bảo mật & Quyền riêng tư (Security & Privacy)** | | | |
| 3.1 | Cô lập danh tính sinh viên | Sử dụng `TrustedStudentContext`, cấm client override | **PASS** | Mã nguồn cưỡng chế lấy `studentId` từ context máy chủ. |
| 3.2 | Cách ly phiên hội thoại | Sinh viên B không thể xem hoặc ghi đè hội thoại của sinh viên A | **PASS** | `ConversationHistoryManager` ném `SecurityException` khi phát hiện truy cập chéo. |
| 3.3 | Bọc thẻ XML thụ động | Bọc RAG và Tool results trong thẻ XML thụ động | **PASS** | `LiveAdvisorModel.buildPrompt` sử dụng thẻ XML và chỉ thị hệ thống bất biến. |
| 3.4 | Chống đầu độc ngữ cảnh RAG | Loại bỏ chunk nghi ngờ chèn chỉ thị khỏi danh sách hợp lệ | **PASS** | `EvidenceValidator` lọc bỏ chunk chứa `DATA_POISONING_SUSPECT`. |
| 3.5 | Lọc trích dẫn ngoài chứng cứ | Gỡ bỏ nguồn trích dẫn không có trong evidence | **PASS** | `ResponseGroundingValidator` gỡ bỏ trích dẫn bịa đặt (`UNGROUNDED_CITATION_STRIPPED`). |
| 3.6 | Danh mục Allowlist cho Action | Chỉ cho phép hành động và route trong danh mục phê duyệt | **PASS** | Loại bỏ URL bên ngoài và `javascript:` (`UNGROUNDED_ACTION_STRIPPED`). |
| 3.7 | Chống rò rỉ thông tin mật | Không xuất stack trace hoặc thông tin mật trong câu trả lời | **PASS** | Câu trả lời lỗi được chuẩn hóa, che giấu chi tiết hạ tầng nội bộ. |
| **IV** | **Quản lý Hội thoại Đa lượt (Multi-turn Conversation)** | | | |
| 4.1 | Giới hạn ngữ cảnh trượt | Sliding window nạp tối đa 10 tin nhắn mới nhất | **PASS** | Ngăn tràn ngữ cảnh token và giữ chi phí gọi LLM ở mức tối ưu. |
| 4.2 | Cắt tỉa kích thước lưu trữ | Tự động cắt tỉa tin nhắn cũ khi payload vượt 900KB | **PASS** | Đảm bảo kích thước JSON luôn nhỏ hơn giới hạn 1MB của database. |
| 4.3 | Tự động sinh tiêu đề | Sinh tiêu đề ngắn gọn từ tin nhắn đầu tiên của người dùng | **PASS** | Cắt tối đa 50 ký tự, định dạng chuẩn cho giao diện danh sách hội thoại. |
| **V** | **Chất lượng Kiểm thử & Độ tin cậy** | | | |
| 5.1 | Tỷ lệ kiểm thử thành công | 100% bài kiểm thử đạt kết quả màu xanh (Green) | **PASS** | 235/235 bài kiểm thử chạy thành công không có bất kỳ lỗi nào. |
| 5.2 | Độ phủ Chat Eval Benchmark | 20/20 ca chuẩn đạt kết quả mong đợi | **PASS** | Bao phủ cả 8 họ kịch bản quy chuẩn của trường HaUI. |
| 5.3 | Kiểm thử kịch bản biên & an ninh | Có bài kiểm thử chuyên biệt cho edge cases và STRIDE | **PASS** | `AdvisorFacadeEdgeCasesTest` (11 tests) và `AdvisorSecurityIsolationTest` (6 tests). |

---

## 3. Nhận xét Chi tiết về Các Thành phần Cốt lõi

### 3.1. `DefaultAdvisorFacade.java`
- Luồng xử lý khép kín 9 bước được hiện thực hóa một cách mạch lạc.
- Việc kiểm tra context tin cậy ngay từ bước 2 giúp ngăn chặn mọi request mạo danh trước khi tiêu tốn tài nguyên RAG hay LLM.
- Khối `executeAcademicTools` triển khai đầy đủ cơ chế timeout và budget bounding ($\le 3$ calls), giải quyết dứt điểm nguy cơ lặp vô hạn giữa các công cụ.
- Quá trình phân loại ý định `IntentClassifier` nhận diện chuẩn xác các nhu cầu nghiệp vụ mà không cần dựa dẫm vào các prompt LLM đắt đỏ.

### 3.2. `ToolAdapter.java` & `DefaultToolAdapter.java`
- Khắc phục hoàn toàn khiếm khuyết thiếu 6 capabilities từ phiên bản V0.
- Lớp tiền kiểm tra `ToolParameterValidator` hoạt động như một bức tường lửa bảo vệ `AcademicFacade`, bắt các lỗi nghiệp vụ ngay tại biên ứng dụng.
- Phương thức `isCapabilityReady` trả về cờ độ sẵn sàng giúp hệ thống hoạt động ổn định ngay cả khi phân hệ TV4 chưa triển khai đầy đủ các tính năng nâng cao.

### 3.3. `ConversationHistoryManager.java`
- Thuật toán Sliding Window và Size Pruning được viết cẩn trọng, kiểm tra kích thước UTF-8 an toàn trước khi lưu xuống `ConversationStore`.
- Kiểm tra tính thuộc quyền (`record.getStudentId().equals(studentId)`) ngăn ngừa triệt để lỗ hổng IDOR (Insecure Direct Object Reference) trong truy xuất hội thoại.

### 3.4. `ResponseGroundingValidator.java`
- Đóng vai trò là chốt chặn an toàn cuối cùng (Last Line of Defense) trước khi trả phản hồi về cho sinh viên.
- Phối hợp chặt chẽ với `EvidenceValidator` để bảo vệ trích dẫn, loại bỏ nguồn ảo và đảm bảo tính toàn vẹn của các số liệu học vụ then chốt (CPA, GPA, tín chỉ).

---

## 4. Quyết định Phê duyệt Độc lập

Căn cứ vào kết quả thẩm định kỹ thuật, mã nguồn phân hệ `tv1-ai` của Task 3.8 hoàn toàn đáp ứng các tiêu chuẩn khắt khe về kiến trúc sạch, an toàn thông tin, bảo vệ dữ liệu cá nhân sinh viên và khả năng mở rộng.

Sub-Agent F chính thức phê duyệt: **CODE & SECURITY REVIEW VERDICT: APPROVED — CHẤP THUẬN NGHIỆM THU MỐC advisor-ready**.
