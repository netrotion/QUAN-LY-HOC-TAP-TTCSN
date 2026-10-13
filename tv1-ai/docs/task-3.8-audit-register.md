# SỔ ĐĂNG KÝ VÀ THEO DÕI KHUYẾT TẬT KỸ THUẬT (AUDIT DEFECT REGISTER) — TASK 3.8

- **Dự án:** HaUI Advisor (`netrotion/QUAN-LY-HOC-TAP-TTCSN`)
- **Phân hệ sở hữu:** `tv1-ai` (Lead + AI)
- **Tác giả:** Principal AI Architect, Lead Orchestrator & Multi-Agent Verification Team
- **Ngày hoàn tất nghiệm thu:** 2026-10-13
- **Trạng thái tổng thể:** **ALL IN-SCOPE DEFECTS RESOLVED & VERIFIED (5/5 VERIFIED, 1 CROSS-MODULE HANDOFF)**

---

## BẢNG TỔNG HỢP CÁC KHIẾM KHUYẾT KỸ THUẬT VÀ TRẠNG THÁI KHẮC PHỤC

| Finding ID | Phân loại / Tiêu đề | Mức độ | Phụ trách | Trạng thái Trước | Trạng thái Nghiệm thu |
|---|---|:---:|:---:|:---:|:---:|
| **DEFECT-3.8-001** | `DefaultAdvisorFacade` hardcode tham số học kỳ `"2024_2025_HK2"`, CPA `3.0`, `18` TC, hè `false` | CRITICAL | Lead / Agent B | ASSIGNED | **VERIFIED** |
| **DEFECT-3.8-002** | `ToolAdapter` chỉ hỗ trợ 3/9 capabilities của `AcademicFacade`, thiếu kiểm tra `readyCapabilities()` | HIGH | Agent B | ASSIGNED | **VERIFIED** |
| **DEFECT-3.8-003** | `DefaultAdvisorFacade` không tích hợp `ConversationStore`, bỏ qua hội thoại đa lượt và sliding window | HIGH | Agent C | ASSIGNED | **VERIFIED** |
| **DEFECT-3.8-004** | `LiveAdvisorModel` ném `UnsupportedOperationException`, thiếu cấu hình Gemini/Spring AI | HIGH | Agent D | ASSIGNED | **VERIFIED** |
| **DEFECT-3.8-005** | `EvidenceValidator` không lọc bỏ chunk bị nghi ngờ chèn chỉ thị (`DATA_POISONING_SUSPECT`) | MEDIUM | Agent D | ASSIGNED | **VERIFIED** |
| **DEFECT-3.8-006** | `Endpoint POST /api/v1/advisor/chat` trên `tv5-platform` trả về 501 `NOT_IMPLEMENTED` | NOTE | TV5 Platform | BLOCKED | **CROSS-MODULE HANDOFF (tv5-platform)** |

---

## CHI TIẾT TỪNG KHIẾM KHUYẾT VÀ BẰNG CHỨNG XÁC THỰC

### 1. DEFECT-3.8-001: Hardcoded Business Parameters in DefaultAdvisorFacade
- **Finding ID:** `DEFECT-3.8-001`
- **Severity:** `CRITICAL`
- **Nguyên nhân gốc rễ:** Bản mã V0 của `DefaultAdvisorFacade` dùng các hằng số nhúng cứng khi gọi `toolAdapter.generateStudyPlan`, bỏ qua mục tiêu thực tế của người dùng và không có cơ chế hỏi lại khi thiếu tham số.
- **Biện pháp khắc phục đã triển khai:**
  1. Xây dựng bộ phân tích ý định `IntentClassifier` và DTO `ParsedUserIntent` bóc tách động các tham số: `targetCpa`, `targetSemester`, `courseCode`, `maxCredits`, `includeSummer`, `retakeSuggestions`, `simulatedGrades`.
  2. Bổ sung cơ chế phát hiện thiếu tham số (`clarificationNeeded = true`) và lý do làm rõ (`clarificationReason`) khi sinh viên hỏi học vượt mà chưa chỉ định kỳ tốt nghiệp mục tiêu.
  3. Hỗ trợ phát hiện chuyển dịch mục tiêu đa lượt (Multi-turn Goal Shift, e.g. Turn 1 CPA 3.3 -> Turn 2 "Đổi thành 3.5").
- **Bằng chứng kiểm thử (Verification Evidence):**
  - `ChatEvalBenchmarkRunnerTest`: Pass 100% 20/20 kịch bản bao gồm các case lập kế hoạch (`EVAL-PLAN-001`), học vượt (`EVAL-ACCEL-001`), và chuyển dịch mục tiêu (`EVAL-GOAL-001`).
  - `AdvisorFacadeEdgeCasesTest.testMultiTurnGoalShiftTargetCpaChange`: Pass.
  - `AdvisorFacadeEdgeCasesTest.testMissingParametersAcceleratedStudyClarification`: Pass.
- **Trạng thái:** **VERIFIED**

---

### 2. DEFECT-3.8-002: ToolAdapter Missing 6 Capabilities & Readiness Check
- **Finding ID:** `DEFECT-3.8-002`
- **Severity:** `HIGH`
- **Nguyên nhân gốc rễ:** `ToolAdapter` chỉ khai báo 3/9 phương thức của `AcademicFacade`; không gọi `readyCapabilities()`, dẫn đến nguy cơ gọi vào các capability chưa sẵn sàng và thiếu lớp kiểm chuẩn tham số tiền điều kiện.
- **Biện pháp khắc phục đã triển khai:**
  1. Mở rộng `ToolAdapter.java` và `DefaultToolAdapter.java` bao phủ đầy đủ 9 capabilities:
     - `getAcademicStatus`
     - `checkCourseEligibility`
     - `generateStudyPlan`
     - `validateStudyPlan`
     - `simulateGrades`
     - `rankRetakeCourses`
     - `calculateTargetGrades`
     - `runGraduationAudit`
     - `reconcileStudyPlan`
  2. Triển khai phương thức kiểm tra độ sẵn sàng `isCapabilityReady(capability)` và `getReadyCapabilities()`. Khi capability chưa sẵn sàng, hệ thống trả về fallback an toàn kèm cảnh báo `TOOL_UNAVAILABLE`.
  3. Triển khai `ToolParameterValidator` kiểm tra nghiêm ngặt: `targetCpa` $\in [0.00, 4.00]$, `maxCreditsPerSemester` $\in [10, 30]$, `maxSuggestions` $\in [1, 20]$, mã học phần khớp regex `^[A-Z0-9]{4,10}$`.
  4. Cưỡng chế sử dụng `studentId` và `dataRevision` tin cậy từ `TrustedStudentContext`, ghi đè mọi ID gửi từ client.
- **Bằng chứng kiểm thử (Verification Evidence):**
  - `ToolAdapterTest`: 28/28 tests passed bao gồm kiểm tra phân quyền, tham số biên, ủy quyền gọi 9 capabilities, và kiểm tra sẵn sàng.
  - `AdvisorFacadeEdgeCasesTest.testInvalidSchemaParameterRejection`: Pass.
  - `AdvisorFacadeEdgeCasesTest.testToolCapabilityUnreadyReturnsWarning`: Pass.
- **Trạng thái:** **VERIFIED**

---

### 3. DEFECT-3.8-003: Missing Multi-turn Persistence in AdvisorFacade
- **Finding ID:** `DEFECT-3.8-003`
- **Severity:** `HIGH`
- **Nguyên nhân gốc rễ:** `DefaultAdvisorFacade` hoàn toàn bỏ qua tham số `conversationId` trong `ChatRequest`, không gọi `ConversationStore`, không duy trì ngữ cảnh giữa các lượt hỏi-đáp.
- **Biện pháp khắc phục đã triển khai:**
  1. Thiết kế DTO `ChatMessageHistoryItem` tuần tự hóa/giải tuần tự hóa JSON chuẩn Jackson.
  2. Xây dựng dịch vụ `ConversationHistoryManager`:
     - Giới hạn ngữ cảnh trượt (Sliding Window bounding): nạp tối đa 10 tin nhắn mới nhất (`loadHistory`).
     - Bảo vệ giới hạn dung lượng lưu trữ CSDL: tự động cắt tỉa tin nhắn cũ nhất khi tổng chuỗi vượt quá 900.000 ký tự / bytes (`saveTurn`).
     - Tự động sinh tiêu đề hội thoại từ tin nhắn đầu tiên của người dùng.
     - Kiểm soát cô lập phiên: sinh viên B không thể đọc hoặc ghi đè hội thoại của sinh viên A.
  3. Tích hợp trực tiếp vào `DefaultAdvisorFacade`: tự động nạp lịch sử trước khi phân loại ý định và lưu trữ lượt trao đổi sau khi hoàn tất phản hồi.
- **Bằng chứng kiểm thử (Verification Evidence):**
  - `ConversationHistoryManagerTest`: 9/9 tests passed (sliding window, dung lượng lớn, cách ly tài khoản).
  - `AdvisorFacadeEdgeCasesTest.testCrossAccountStudentIsolation`: Pass.
  - `AdvisorFacadeEdgeCasesTest.testConversationStateReloadAndContinuation`: Pass.
- **Trạng thái:** **VERIFIED**

---

### 4. DEFECT-3.8-004: LiveAdvisorModel Missing Spring AI / Gemini Configuration
- **Finding ID:** `DEFECT-3.8-004`
- **Severity:** `HIGH`
- **Nguyên nhân gốc rễ:** `LiveAdvisorModel` chỉ có một dòng mã ném `UnsupportedOperationException`, chưa kết nối hệ sinh thái Spring AI và không có cơ chế bắt lỗi an toàn.
- **Biện pháp khắc phục đã triển khai:**
  1. Tái cấu trúc `LiveAdvisorModel` hỗ trợ hàm cung cấp `Function<String, String> providerFunction` (hoặc Spring AI `ChatModel`).
  2. Xây dựng hệ thống prompt an toàn bao bọc các khối dữ liệu trong thẻ XML thụ động: `<rag_evidence>`, `<academic_tool_results>`, `<student_context>`, `<user_query>`.
  3. Triển khai cơ chế phòng vệ lỗi mạng/API: khi nhà cung cấp gặp sự cố hoặc timeout, hệ thống tự động bẫy ngoại lệ và sinh phản hồi thân thiện với người dùng kèm cảnh báo chẩn đoán `MODEL_PROVIDER_ERROR`, tuyệt đối không rò rỉ stack trace hay mật khẩu hệ thống.
  4. Duy trì `MockAdvisorModel` hoàn chỉnh, hoạt động độc lập và phủ kín 8 họ kịch bản tư vấn học vụ HaUI cho môi trường kiểm thử CI/CD ngoại tuyến.
- **Bằng chứng kiểm thử (Verification Evidence):**
  - `LiveAdvisorModelTest`: 14/14 tests passed (prompt framing, fake provider, lỗi provider, kiểm tra neo nguồn).
  - `AdvisorSecurityIsolationTest.testInformationDisclosureNoStackTraceLeakage`: Pass.
- **Trạng thái:** **VERIFIED**

---

### 5. DEFECT-3.8-005: EvidenceValidator Incomplete Poisoning Defense
- **Finding ID:** `DEFECT-3.8-005`
- **Severity:** `MEDIUM`
- **Nguyên nhân gốc rễ:** Phiên bản cũ của `EvidenceValidator` phát hiện tấn công chèn chỉ thị trong chunk nhưng chỉ ghi nhận cảnh báo mà vẫn đưa chunk độc hại vào danh sách `validated`, khiến LLM có thể bị đầu độc ngữ cảnh (Adversarial Context Poisoning).
- **Biện pháp khắc phục đã triển khai:**
  1. Nâng cấp phương thức `EvidenceValidator.validate`: khi phát hiện `isPotentialPromptInjection(chunk.getContent())`, bổ sung cảnh báo `DATA_POISONING_SUSPECT` và **bỏ qua hoàn toàn** chunk đó (không thêm vào `validated`).
  2. Bổ sung `ResponseGroundingValidator` thực hiện hậu kiểm kép (Double Defense-in-Depth):
     - Gỡ bỏ triệt để mọi trích dẫn không tồn tại trong `GroundedContext` (`UNGROUNDED_CITATION_STRIPPED`).
     - Gỡ bỏ toàn bộ action có URL/route nằm ngoài danh sách allowlist (`UNGROUNDED_ACTION_STRIPPED`).
     - Cưỡng chế bảo toàn số liệu học vụ (CPA, GPA, tín chỉ) từ công cụ, không cho phép mô hình tự sửa số liệu.
- **Bằng chứng kiểm thử (Verification Evidence):**
  - `RagAcceptanceMatrixTest.SecurityAndGuardrailsTests`: Pass.
  - `AdvisorSecurityIsolationTest.testTamperingIndirectPromptInjectionFiltered`: Pass.
  - `AdvisorSecurityIsolationTest.testElevationOfPrivilegeActionRouteAllowlist`: Pass.
- **Trạng thái:** **VERIFIED**

---

### 6. DEFECT-3.8-006: Missing HTTP Controller Endpoint in tv5-platform
- **Finding ID:** `DEFECT-3.8-006`
- **Severity:** `NOTE / CROSS-MODULE INTEGRATION`
- **Mô tả:** Endpoint `POST /api/v1/advisor/chat` trong module `tv5-platform` hiện trả về HTTP 501 `NOT_IMPLEMENTED`.
- **Ranh giới trách nhiệm:** 
  - `tv1-ai` đã bàn giao đầy đủ Spring Bean `AdvisorFacade` (`DefaultAdvisorFacade`) và cấu hình tự động `AiAutoConfiguration`.
  - Phân hệ sở hữu `tv5-platform` cần inject bean `AdvisorFacade` vào `AdvisorChatController` và chuyển tiếp request/context.
- **Biện pháp:** Ghi nhận vào tài liệu bàn giao `tv1-ai/docs/task-3.8-handoff.md` với mã mẫu cấu hình và tích hợp sẵn sàng cho team TV5.
- **Trạng thái:** **CROSS-MODULE HANDOFF (tv5-platform)**

---

## TỔNG KẾT NGHIỆM THU DEFECT REGISTER

- **Tổng số lỗi phát hiện trong phạm vi tv1-ai:** 5 lỗi.
- **Số lỗi đã sửa và thẩm định độc lập thành công:** 5/5 lỗi (100%).
- **Số lỗi tồn đọng trong tv1-ai:** 0 lỗi.
- **Kết luận:** Sổ đăng ký khuyết tật kỹ thuật Task 3.8 chính thức đóng lại với toàn bộ hạng mục đạt chuẩn chất lượng.
