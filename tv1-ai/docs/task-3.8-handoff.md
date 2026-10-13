# TÀI LIỆU BÀN GIAO KỸ THUẬT (TASK 3.8 ENGINEERING HANDOFF)
## Phân hệ Cố vấn Học vụ Thông minh, Điều phối Công cụ & Tích hợp Toàn diện

- **Dự án:** HaUI Academic Advisor (`QUAN-LY-HOC-TAP-TTCSN`)
- **Mã Task:** Task 3.8 — Code hội thoại và Tool Calling
- **Phân hệ bàn giao:** `tv1-ai` (Lead + AI)
- **Phân hệ tiếp nhận:** `tv5-platform` (Core Platform & Persistence), `tv2-web` (Web Frontend & Chat UI), `tv4-academic` (Academic Engine)
- **Thời điểm bàn giao:** 2026-10-13
- **Trạng thái mốc:** **advisor-ready (SẴN SÀNG TÍCH HỢP TOÀN HỆ THỐNG)**

---

## 1. Mục đích và Ý nghĩa Bàn giao

Tài liệu này cung cấp hướng dẫn tích hợp chi tiết, giao ước API và hướng dẫn cấu hình phân hệ Cố vấn Học vụ Thông minh (`DefaultAdvisorFacade`) do phân hệ `tv1-ai` phát triển sang các phân hệ đối tác:
1. **`tv5-platform`:** Đấu nối Spring Bean `AdvisorFacade` vào Controller REST API `POST /api/v1/advisor/chat`, cấp phát `TrustedStudentContext` từ phiên xác thực và kết nối `ConversationStore` vào cơ sở dữ liệu PostgreSQL.
2. **`tv2-web`:** Hiển thị giao diện hội thoại đa lượt, biểu diễn trích dẫn quy chế (`sources`), các nút hành động điều hướng (`actions`), thẻ dự thảo kế hoạch học tập (`planProposal`) và cảnh báo học vụ (`warnings`).
3. **`tv4-academic`:** Hoàn thiện và công bố các năng lực học vụ nâng cao qua `AcademicFacade` khi sẵn sàng.

---

## 2. Hướng dẫn Tích hợp Phân hệ `tv5-platform`

### 2.1. Đấu nối Controller `POST /api/v1/advisor/chat`
Trong module `tv5-platform`, lớp `AdvisorChatController` cần được inject bean `AdvisorFacade` và chuyển tiếp yêu cầu từ sinh viên:

```java
package vn.haui.advisor.web.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.haui.advisor.contracts.dto.ChatRequest;
import vn.haui.advisor.contracts.dto.ChatResponse;
import vn.haui.advisor.contracts.dto.TrustedStudentContext;
import vn.haui.advisor.contracts.ports.AdvisorFacade;
import vn.haui.advisor.platform.security.AuthenticatedStudentProvider;

@RestController
@RequestMapping("/api/v1/advisor")
public class AdvisorChatController {

    private final AdvisorFacade advisorFacade;
    private final AuthenticatedStudentProvider studentProvider;

    public AdvisorChatController(AdvisorFacade advisorFacade, AuthenticatedStudentProvider studentProvider) {
        this.advisorFacade = advisorFacade;
        this.studentProvider = studentProvider;
    }

    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(@RequestBody ChatRequest request) {
        // Lấy ngữ cảnh tin cậy từ Session / JWT bảo mật của Server
        // TUYỆT ĐỐI KHÔNG nhận studentId từ Client Payload!
        TrustedStudentContext trustedContext = studentProvider.getCurrentStudentContext();

        ChatResponse response = advisorFacade.chat(request, trustedContext);
        return ResponseEntity.ok(response);
    }
}
```

### 2.2. Đăng ký Bean `ConversationStore`
`tv1-ai` đã kiểm thử toàn diện với cả `InMemoryConversationStore` và port `ConversationStore`.
`tv5-platform` chỉ cần cung cấp implementation của `ConversationStore` lưu xuống bảng `conversations` (PostgreSQL) với schema:
- `conversation_id VARCHAR(64) PRIMARY KEY`
- `student_id VARCHAR(64) NOT NULL`
- `title VARCHAR(255)`
- `messages_json TEXT` (dung lượng tối đa 1MB; `tv1-ai` đã tự động cắt tỉa an toàn dưới 900KB)
- `created_at VARCHAR(32)`
- `updated_at VARCHAR(32)`

---

## 3. Hướng dẫn Tích hợp Giao diện Người dùng `tv2-web`

Dữ liệu phản hồi `ChatResponse` bao gồm 5 trường dữ liệu độc lập:

### 3.1. `answer` (Chuỗi Markdown)
- Nội dung trả lời bằng tiếng Việt sư phạm, đã được định dạng Markdown chuẩn.
- Giao diện chat hiển thị trực tiếp bằng Markdown parser (hỗ trợ in đậm, gạch đầu dòng, công thức toán).

### 3.2. `sources` (Danh sách Trích dẫn Quy chế)
- Mỗi mục là một `ChatSourceItem`:
  - `sourceId`: Ví dụ `REG-HAUI-01`, `REG-HAUI-04`.
  - `title`: Tên quy chế chính thức.
  - `section`: Tên điều khoản (ví dụ: *Điều 14 - Cảnh báo học tập*).
  - `referenceUrl`: Đường dẫn tra cứu toàn văn.
- Giao diện hiển thị dưới dạng các thẻ chip trích dẫn (Citation Badges) ở cuối tin nhắn, sinh viên bấm vào sẽ mở modal xem điều khoản hoặc chuyển hướng tới `/academic/rules`.

### 3.3. `actions` (Danh sách Nút Hành động Tương tác)
- Mỗi mục là một `ChatActionItem`:
  - `actionType`: `NAVIGATE`, `OPEN_PLANNER`, `OPEN_WHAT_IF`, `OPEN_AUDIT`, `OPEN_TRANSCRIPT_IMPORT`.
  - `label`: Nhãn hiển thị trên nút bấm (ví dụ: *"Xem bảng điểm và học phần nợ"*, *"Xem chi tiết kế hoạch trên Study Planner"*).
  - `targetRoute`: Route nội bộ của ứng dụng web (`/academic/transcript`, `/planner`, `/simulator`, `/academic/audit`, `/academic/import`).
  - `payloadJson`: Dữ liệu ngữ cảnh đi kèm (ví dụ: `proposalId` hoặc `studentCode`).
- Giao diện render các nút bấm tương tác nhanh (Quick Action Buttons) giúp sinh viên thao tác chỉ bằng 1 cú nhấp chuột.

### 3.4. `planProposal` (Dự thảo Kế hoạch Học tập Đề xuất)
- Khi trường này khác `null`, giao diện hiển thị khối thẻ tổng quan kế hoạch (Study Plan Preview Card):
  - Tiêu đề đề xuất (`summary`).
  - Điểm CPA dự kiến hoàn thành (`projectedCpa`).
  - Danh sách học kỳ và số tín chỉ phân bổ (`semesters`).
  - Nút bấm xác nhận *"Chuyển tiếp sang Study Planner để chỉnh sửa & lưu chính thức"*.

### 3.5. `warnings` (Danh sách Cảnh báo Học vụ & Hệ thống)
- Các mã cảnh báo kỹ thuật và sư phạm:
  - `INCOMPLETE_TARGET`: Sinh viên hỏi học vượt nhưng chưa cung cấp học kỳ mục tiêu -> Giao diện có thể gợi ý chip chọn kỳ (ví dụ: *"Kỳ 7"*, *"Học kỳ 2 năm 2025-2026"*).
  - `TRANSCRIPT_REQUIRED`: Sinh viên chưa nhập bảng điểm -> Giao diện hiển thị banner nhắc nhở nhập bảng điểm từ cổng đào tạo.
  - `POLICY_SOURCE_UNAVAILABLE`: Câu hỏi ngoài phạm vi quy chế học vụ HaUI.
  - `MODEL_PROVIDER_ERROR`: Sự cố kết nối AI trực tuyến tạm thời.

---

## 4. Bảng Tham số Cấu hình Hệ thống (`application.yml`)

```yaml
ai:
  # Chế độ hoạt động của AI: 'mock' (kiểm thử/offline không tốn phí) hoặc 'live' (kết nối Gemini API)
  mode: ${AI_MODE:mock}
  
  advisor:
    # Ngưỡng thời gian tối đa cho mỗi lệnh gọi công cụ học vụ (milliseconds)
    tool-timeout-ms: 2500
    # Số lượt tin nhắn tối đa duy trì trong Sliding Window ngữ cảnh
    max-history-turns: 10
    # Ngân sách số lần gọi công cụ tối đa trong 1 lượt hội thoại (chống lặp vô hạn)
    tool-execution-budget: 3
    # Hạn mức dung lượng JSON lịch sử trước khi tự động cắt tỉa (bytes)
    max-history-payload-bytes: 900000

  rag:
    # Ngưỡng điểm cosine tương đồng tối thiểu để công nhận chứng cứ quy chế
    min-score: 0.35
    # Số lượng chunk quy chế tối đa truy xuất
    top-k: 5
    # Giới hạn số chunk tối đa cho cùng 1 nguồn quy chế (đảm bảo đa dạng nguồn)
    max-chunks-per-source: 2

spring:
  ai:
    gemini:
      # API Key cung cấp từ Google AI Studio (chỉ cần khi ai.mode=live)
      api-key: ${GEMINI_API_KEY:}
      model: ${GEMINI_MODEL:gemini-1.5-flash}
```

---

## 5. Lệnh Kiểm thử & Nghiệm thu Bàn giao (Verification Script)

Để tái kiểm tra toàn bộ 235 bài kiểm thử và xác thực mốc `advisor-ready` tại bất kỳ thời điểm nào:

```bash
# Chạy toàn bộ 235 bài kiểm thử của phân hệ AI:
./mvnw -pl tv1-ai test

# Chạy riêng bộ kiểm chuẩn Chat Eval Benchmark (20 ca chuẩn):
./mvnw -pl tv1-ai -Dtest=ChatEvalBenchmarkRunnerTest test

# Chạy riêng bộ kiểm thử kịch bản biên & chịu lỗi (11 ca biên):
./mvnw -pl tv1-ai -Dtest=AdvisorFacadeEdgeCasesTest test

# Chạy riêng bộ kiểm thử mô hình đe dọa an ninh STRIDE (6 ca an ninh):
./mvnw -pl tv1-ai -Dtest=AdvisorSecurityIsolationTest test
```

---

## 6. Ký duyệt Bàn giao Kỹ thuật

| Đại diện | Vai trò | Trạng thái Nghiệm thu |
|---|---|:---:|
| **Principal AI Architect & Orchestrator** | TV1 — Lead + AI | **SẴN SÀNG BÀN GIAO** |
| **Sub-Agent E (Independent QA Engineer)** | QA & Evaluation | **VERIFIED & ACCEPTED (235/235 PASS)** |
| **Sub-Agent F (Independent Security Reviewer)** | Security & Architecture | **APPROVED (100% STRIDE COMPLIANT)** |

**Phân hệ AI (`tv1-ai`) chính thức bàn giao sản phẩm Task 3.8 cho dự án.**
