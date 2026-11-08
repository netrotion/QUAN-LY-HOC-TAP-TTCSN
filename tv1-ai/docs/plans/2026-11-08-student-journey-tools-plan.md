# Student Journey Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trang bị 2 công cụ chiến lược `get_transcript` (lịch sử bảng điểm quá khứ) và `get_curriculum_tree` (cây CTĐT và định hướng môn học tương lai) cho Gemini Native Tool Calling để AI có cái nhìn 360 độ về lộ trình học tập của sinh viên.

**Architecture:** Bổ sung khai báo schema công cụ trong `GeminiToolDeclarations`. Mở rộng `ToolAdapter` với 2 provider chức năng cho transcript và curriculum tree. Tạo `StudentJourneySummarizer` để cô đọng dữ liệu bảng điểm và cây môn học thành bản tóm tắt giàu ngữ nghĩa trước khi nạp vào Turn 2 của Gemini, vừa tiết kiệm token vừa triệt tiêu ảo giác điểm số. Đấu nối provider từ `StudentDataService` và `AcademicApiService` tại composition root của platform.

**Tech Stack:** Java 21, Spring Boot 3.3.4, Google Gemini API (Function Calling), JUnit 5, AssertJ, Mockito.

**Spec:** `tv1-ai/docs/specs/2026-11-08-student-journey-tools-spec.md`

## Global Constraints

- Mọi thay đổi code trong Phase 1-4 bắt buộc nằm trong thư mục `tv1-ai/` để vượt qua kiểm tra ranh giới `npm run check:ownership`.
- Toàn bộ 373 tests hiện có của `tv1-ai` phải luôn luôn xanh (GREEN).
- Không tự suy diễn hoặc bịa đặt điểm chữ, điểm số hoặc trạng thái đạt/chưa đạt; bắt buộc neo chặt chẽ vào kết quả từ provider.

## Review Focus

1. **Sinh viên chưa có bảng điểm (chưa import hoặc rỗng):** `get_transcript` trả về danh sách rỗng, AI phải hướng dẫn người dùng nhập bảng điểm một cách lịch sự, không bị `NullPointerException`.
2. **Bộ lọc điểm A (`GRADE_A`):** Phải phân biệt chính xác môn điểm A, A+ với các môn B+, B, C, D, F; không được liệt kê nhầm môn B+ vào nhóm điểm A.
3. **Môn bị chặn tiên quyết trong Cây CTĐT:** Các môn có `eligible = false` tuyệt đối không được gợi ý là "có thể đăng ký ngay kỳ tới", mà phải chỉ rõ môn tiên quyết còn thiếu.
4. **Giới hạn kích thước tóm tắt (Token Budget Protection):** Cây CTĐT có thể chứa hơn 120 học phần; `StudentJourneySummarizer` phải lọc và tóm tắt dưới 1,000 tokens thay vì serialize toàn bộ JSON thô.
5. **Bảo mật thông tin định danh (PII Protection):** Tóm tắt dữ liệu không để lộ ID nội bộ hoặc thông tin nhạy cảm.

---

### Task 1: Khai báo Gemini Tool Declarations cho `get_transcript` và `get_curriculum_tree`

**Files:**
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/tools/GeminiToolDeclarations.java`
- Test: `tv1-ai/src/test/java/vn/haui/advisor/ai/tools/GeminiToolDeclarationsTest.java`

**Interfaces:**
- Produces: 
  - Function declaration `get_transcript` với tham số `filter` (optional).
  - Function declaration `get_curriculum_tree` với tham số `scope` (optional).

- [ ] **Step 1: Viết failing test kiểm tra sự có mặt của 2 tool mới trong `GeminiToolDeclarationsTest.java`**

```java
@Test
void shouldDeclareStudentJourneyTools() {
    List<Map<String, Object>> decls = GeminiToolDeclarations.getToolDeclarations();
    assertThat(decls).isNotEmpty();
    List<Map<String, Object>> funcs = (List<Map<String, Object>>) decls.get(0).get("functionDeclarations");
    assertThat(funcs).extracting(m -> (String) m.get("name"))
            .contains("get_transcript", "get_curriculum_tree");
}
```

- [ ] **Step 2: Chạy test để xác nhận test thất bại (Red)**

Run: `cmd.exe /c "cd /d C:\Users\nguye\.codex\worktrees\conversational-academic-advisor\thuctapcosonganh && mvnw.cmd test -pl tv1-ai -am -Dtest=GeminiToolDeclarationsTest"`
Expected: FAIL vì chưa có 2 tool `get_transcript` và `get_curriculum_tree`.

- [ ] **Step 3: Cập nhật `GeminiToolDeclarations.java` để khai báo 2 tools mới**

Bổ sung khai báo schema cho `get_transcript` và `get_curriculum_tree` như mô tả trong Spec.

- [ ] **Step 4: Chạy test để xác nhận test vượt qua (Green)**

Run: `cmd.exe /c "cd /d C:\Users\nguye\.codex\worktrees\conversational-academic-advisor\thuctapcosonganh && mvnw.cmd test -pl tv1-ai -am -Dtest=GeminiToolDeclarationsTest"`
Expected: BUILD SUCCESS, tất cả tests pass.

- [ ] **Step 5: Commit task 1**

```bash
git add tv1-ai/src/main/java/vn/haui/advisor/ai/tools/GeminiToolDeclarations.java tv1-ai/src/test/java/vn/haui/advisor/ai/tools/GeminiToolDeclarationsTest.java
git commit -m "feat(ai): declare get_transcript and get_curriculum_tree tools in gemini schema"
```

---

### Task 2: Mở rộng `ToolAdapter` và `DefaultToolAdapter` với Transcript & Curriculum Tree Providers

**Files:**
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/tools/ToolAdapter.java`
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/tools/DefaultToolAdapter.java`
- Test: `tv1-ai/src/test/java/vn/haui/advisor/ai/tools/ToolAdapterTest.java`

**Interfaces:**
- Produces:
  - `TranscriptResponse ToolAdapter.getTranscript(TrustedStudentContext context)`
  - `CurriculumTreeResponse ToolAdapter.getCurriculumTree(TrustedStudentContext context)`
  - Constructor mới của `DefaultToolAdapter` hỗ trợ nhận `Function<TrustedStudentContext, TranscriptResponse>` và `Function<TrustedStudentContext, CurriculumTreeResponse>`.

- [ ] **Step 1: Viết failing test trong `ToolAdapterTest.java`**

Kiểm tra `DefaultToolAdapter` gọi đúng provider khi được cấp `transcriptProvider` và `curriculumTreeProvider`, hoặc trả `null`/rỗng khi chưa cấu hình.

- [ ] **Step 2: Chạy test để xác nhận test thất bại (Red)**

Run: `cmd.exe /c "cd /d C:\Users\nguye\.codex\worktrees\conversational-academic-advisor\thuctapcosonganh && mvnw.cmd test -pl tv1-ai -am -Dtest=ToolAdapterTest"`
Expected: FAIL do thiếu method trên `ToolAdapter`.

- [ ] **Step 3: Thêm default method vào `ToolAdapter.java` và triển khai trong `DefaultToolAdapter.java`**

Cung cấp các constructor tương thích ngược và triển khai gọi provider an toàn theo `TrustedStudentContext`.

- [ ] **Step 4: Chạy test để xác nhận test vượt qua (Green)**

Run: `cmd.exe /c "cd /d C:\Users\nguye\.codex\worktrees\conversational-academic-advisor\thuctapcosonganh && mvnw.cmd test -pl tv1-ai -am -Dtest=ToolAdapterTest"`
Expected: BUILD SUCCESS.

- [ ] **Step 5: Commit task 2**

```bash
git add tv1-ai/src/main/java/vn/haui/advisor/ai/tools/ToolAdapter.java tv1-ai/src/main/java/vn/haui/advisor/ai/tools/DefaultToolAdapter.java tv1-ai/src/test/java/vn/haui/advisor/ai/tools/ToolAdapterTest.java
git commit -m "feat(ai): extend ToolAdapter with transcript and curriculum tree providers"
```

---

### Task 3: Xây dựng `StudentJourneySummarizer` để tối ưu dữ liệu nạp cho LLM

**Files:**
- Create: `tv1-ai/src/main/java/vn/haui/advisor/ai/tools/StudentJourneySummarizer.java`
- Test: `tv1-ai/src/test/java/vn/haui/advisor/ai/tools/StudentJourneySummarizerTest.java`

**Interfaces:**
- Produces:
  - `String StudentJourneySummarizer.summarizeTranscript(TranscriptResponse transcript, String filter)`
  - `String StudentJourneySummarizer.summarizeCurriculumTree(CurriculumTreeResponse tree, String scope)`

- [ ] **Step 1: Viết unit test trong `StudentJourneySummarizerTest.java`**

Kiểm thử:
1. `summarizeTranscript` phân loại chính xác các môn điểm A, B, C, F và tính tổng số tín chỉ.
2. `summarizeCurriculumTree` tách riêng danh sách môn `eligible = true` và môn bị chặn tiên quyết kèm lý do.
3. Xử lý an toàn khi đầu vào null hoặc danh sách rỗng.

- [ ] **Step 2: Chạy test để xác nhận test thất bại (Red)**

Run: `cmd.exe /c "cd /d C:\Users\nguye\.codex\worktrees\conversational-academic-advisor\thuctapcosonganh && mvnw.cmd test -pl tv1-ai -am -Dtest=StudentJourneySummarizerTest"`
Expected: FAIL vì class chưa tồn tại.

- [ ] **Step 3: Cài đặt class `StudentJourneySummarizer.java`**

Format dữ liệu ngắn gọn, dễ đọc, cấu trúc thẻ XML rõ ràng để LLM dễ suy luận.

- [ ] **Step 4: Chạy test để xác nhận test vượt qua (Green)**

Run: `cmd.exe /c "cd /d C:\Users\nguye\.codex\worktrees\conversational-academic-advisor\thuctapcosonganh && mvnw.cmd test -pl tv1-ai -am -Dtest=StudentJourneySummarizerTest"`
Expected: PASS 100%.

- [ ] **Step 5: Commit task 3**

```bash
git add tv1-ai/src/main/java/vn/haui/advisor/ai/tools/StudentJourneySummarizer.java tv1-ai/src/test/java/vn/haui/advisor/ai/tools/StudentJourneySummarizerTest.java
git commit -m "feat(ai): implement StudentJourneySummarizer for concise LLM context"
```

---

### Task 4: Tích hợp điều phối công cụ trong `DefaultAdvisorFacade`

**Files:**
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/service/DefaultAdvisorFacade.java`
- Test: `tv1-ai/src/test/java/vn/haui/advisor/ai/eval/NaturalLanguageToolCallingTest.java`

**Interfaces:**
- Produces:
  - `dispatchAcademicToolByName` hỗ trợ `"get_transcript"` và `"get_curriculum_tree"`.
  - Kết quả được nạp vào `toolResults` dưới dạng tóm tắt có cấu trúc của `StudentJourneySummarizer`.

- [ ] **Step 1: Viết acceptance test trong `NaturalLanguageToolCallingTest.java`**

1. Test prompt: `"Có môn nào của tôi được A không?"` $\rightarrow$ gọi `get_transcript` $\rightarrow$ trả lời danh sách môn điểm A.
2. Test prompt: `"Kỳ tới tôi được đăng ký những môn gì?"` $\rightarrow$ gọi `get_curriculum_tree` $\rightarrow$ trả lời các môn đủ điều kiện.

- [ ] **Step 2: Chạy test để xác nhận thất bại (Red)**

Run: `cmd.exe /c "cd /d C:\Users\nguye\.codex\worktrees\conversational-academic-advisor\thuctapcosonganh && mvnw.cmd test -pl tv1-ai -am -Dtest=NaturalLanguageToolCallingTest"`
Expected: Thất bại do chưa xử lý dispatch cho 2 tool mới.

- [ ] **Step 3: Cập nhật `dispatchAcademicToolByName` trong `DefaultAdvisorFacade.java`**

Bổ sung 2 case xử lý cho `get_transcript` và `get_curriculum_tree`.

- [ ] **Step 4: Chạy test để xác nhận vượt qua (Green)**

Run: `cmd.exe /c "cd /d C:\Users\nguye\.codex\worktrees\conversational-academic-advisor\thuctapcosonganh && mvnw.cmd test -pl tv1-ai -am -Dtest=NaturalLanguageToolCallingTest"`
Expected: BUILD SUCCESS.

- [ ] **Step 5: Chạy toàn bộ test suite của `tv1-ai` và kiểm tra ownership**

Run: `cmd.exe /c "cd /d C:\Users\nguye\.codex\worktrees\conversational-academic-advisor\thuctapcosonganh && mvnw.cmd test -pl tv1-ai -am && npm run check:ownership"`
Expected: Toàn bộ 375+ tests PASS, ownership PASSED.

- [ ] **Step 6: Commit task 4**

```bash
git add tv1-ai/src/main/java/vn/haui/advisor/ai/service/DefaultAdvisorFacade.java tv1-ai/src/test/java/vn/haui/advisor/ai/eval/NaturalLanguageToolCallingTest.java
git commit -m "feat(ai): orchestrate get_transcript and get_curriculum_tree in DefaultAdvisorFacade"
```

---

### Task 5: Đấu nối Provider tại `AdvisorConfig` và Kiểm thử thực tế (End-to-End)

**Files:**
- Modify: `tv5-platform/app/src/main/java/vn/haui/advisor/platform/config/AdvisorConfig.java` (truyền `studentDataService::transcript` và `academicApiService::tree` vào `DefaultToolAdapter`)
- Test: Script `scratch/test_chat.mjs` kiểm tra trực tiếp qua API live

- [ ] **Step 1: Cập nhật bean `advisorFacade` trong `AdvisorConfig.java`**

Truyền 2 provider từ `StudentDataService` và `AcademicApiService` vào `DefaultToolAdapter`.

- [ ] **Step 2: Biên dịch và khởi động lại backend daemon**

Restart task backend trên cổng 8080.

- [ ] **Step 3: Chạy kịch bản kiểm thử trực tiếp trên cổng 8080**

Kiểm tra 2 câu hỏi thực tế:
1. `"Có môn nào của tôi được A không?"`
2. `"Kỳ tới tôi được đăng ký những môn gì?"`

Xác nhận AI trả lời chuẩn xác dựa trên dữ liệu thật của tài khoản `2024604757`.

- [ ] **Step 4: Commit task 5**

```bash
git add tv5-platform/app/src/main/java/vn/haui/advisor/platform/config/AdvisorConfig.java
git commit -m "feat(platform): wire transcript and curriculum tree providers to advisor adapter"
```
