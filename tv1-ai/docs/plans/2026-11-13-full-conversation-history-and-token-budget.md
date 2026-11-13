# Full Conversation History & Token Budget Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transmit 100% full conversation history without silent truncation or duplication across all 4 architectural layers (`ConversationHistoryManager`, `DefaultAdvisorFacade`, `AdvisorStreamingService`, `LiveAdvisorModel`) and audit total token budget including system prompt, history, RAG evidence, tool results, and output reservation before dispatch.

**Architecture:** 
1. `ConversationHistoryManager` loads the full chronological message array from PostgreSQL `conversations` table via `loadFullHistory` and replaces silent DB pruning with explicit overflow exceptions.
2. A new `TokenBudgetAuditor` estimates the comprehensive token consumption ($T_{\text{sys}} + T_{\text{hist}} + T_{\text{rag}} + T_{\text{tool}} + T_{\text{user}} + T_{\text{reserve}}$) with Vietnamese Unicode heuristics and rejects over-budget calls explicitly without truncation.
3. `DefaultAdvisorFacade` and `AdvisorStreamingService` eliminate the 10-turn sliding window, audit token budget, and propagate full context.
4. `LiveAdvisorModel` formats the full history into Gemini alternating `user`/`model` contents while guaranteeing zero duplication of the current query.

**Tech Stack:** Java 21, Spring Boot 3.3.4, Jackson, PostgreSQL (`conversations` table), Apache Maven 3.9.9, JUnit 5, AssertJ.

**Spec:** `docs/superpowers/specs/2026-11-13-full-conversation-history-and-token-budget-design.md`

## Global Constraints

- Scope: `tv1-ai` module only. Never modify database schemas or external module contracts.
- No Silent Truncation: `loadFullHistory` returns 100% of messages; `saveTurn` never calls `messages.remove(0)`.
- Token Budget Formula: $T_{\text{total}} = T_{\text{sys}} + T_{\text{hist}} + T_{\text{rag}} + T_{\text{tool}} + T_{\text{user}} + T_{\text{reserve}}$.
- Hard Ceiling: Default 64,000 tokens (`ai.conversation.max-context-tokens`). If exceeded, return `CONTEXT_LIMIT_EXCEEDED` error without silent trimming.
- Zero Duplication: Current `userMessage` must appear exactly once in Gemini `contents` array and XML prompt.
- Git: Local git commits only. Never push to remote.
- Quality Gate: All existing tests in `tv1-ai` must pass with 0 failures at each task.

## Review Focus

1. **Multi-turn goal shift:** When a student changes their target CPA from 3.0 (at turn 2) to 3.5 (at turn 8), the model at turn 9 must respect the new CPA (3.5) while retaining all courses discussed in earlier turns.
2. **Context overflow boundary:** When total estimated tokens exceed the 64,000 ceiling, the system halts with an explicit `CONTEXT_LIMIT_EXCEEDED` error, preserving all database records without pruning.
3. **Consecutive same-role turns:** When history contains consecutive messages with the same role (`user` followed by `user`, or `assistant` followed by `assistant`), `formatGeminiContents` must merge them so Gemini API's alternating role requirement is strictly honored.
4. **De-duplication boundary:** If a caller has already appended `userMessage` to `history`, `formatGeminiContents` and `buildPrompt` must detect this and never double-append the text.
5. **Database storage limit:** When conversation JSON serialization exceeds the 1MB physical database limit, throw `ConversationStorageOverflowException` to protect database integrity instead of silently dropping the oldest turns.

---

### Task 1: Create `TokenBudgetAuditor` Component & Unit Tests

**Files:**
- Create: `tv1-ai/src/main/java/vn/haui/advisor/ai/conversation/TokenBudgetAuditor.java`
- Create: `tv1-ai/src/test/java/vn/haui/advisor/ai/conversation/TokenBudgetAuditorTest.java`
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/config/AiProperties.java:151-179`
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/config/AiAutoConfiguration.java:200-245`

**Interfaces:**
- Produces: `TokenBudgetAuditor.AuditResult audit(String systemPrompt, List<ChatMessageHistoryItem> history, String userMessage, GroundedContext ragContext, Map<String, Object> toolResults, Integer configuredMaxOutputTokens, Integer configuredMaxContextTokens)`
- Produces: `record AuditResult(boolean isAllowed, long estimatedTotalTokens, long systemTokens, long historyTokens, long userTokens, long ragTokens, long toolTokens, long reservedOutputTokens, long maxLimit, String detailMessage)`

- [ ] **Step 1: Write the failing unit test for `TokenBudgetAuditor`**

Create `tv1-ai/src/test/java/vn/haui/advisor/ai/conversation/TokenBudgetAuditorTest.java`:
```java
package vn.haui.advisor.ai.conversation;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.rag.service.GroundedContext;
import vn.haui.advisor.contracts.dto.ChatSourceItem;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Task 1: TokenBudgetAuditor Comprehensive Estimation & Hard Ceiling Test")
class TokenBudgetAuditorTest {

    private final TokenBudgetAuditor auditor = new TokenBudgetAuditor();

    @Test
    @DisplayName("Should calculate token breakdown accurately for normal conversation")
    void testAuditWithinBudget() {
        String systemPrompt = "Bạn là HaUI Advisor...";
        List<ChatMessageHistoryItem> history = List.of(
                ChatMessageHistoryItem.ofUser("Chào bạn, mình muốn hỏi về CPA", "2026-11-13T01:00:00Z"),
                ChatMessageHistoryItem.ofAssistant("Chào bạn, CPA của bạn hiện tại là 3.18", List.of(), List.of(), null, List.of())
        );
        String userMessage = "Làm sao để lên CPA 3.5?";
        GroundedContext ragContext = new GroundedContext(
                "quy chế", List.of(), List.of(new ChatSourceItem("REG-HAUI-02", "Thang điểm", "Điều 2", "2024", "/rules")),
                "Điều 2: Cách tính CPA tích lũy...", true, List.of()
        );
        Map<String, Object> toolResults = Map.of("cpa", 3.18, "gpa", 3.4);

        TokenBudgetAuditor.AuditResult result = auditor.audit(
                systemPrompt, history, userMessage, ragContext, toolResults, 2048, 64000
        );

        assertThat(result.isAllowed()).isTrue();
        assertThat(result.systemTokens()).isGreaterThan(0);
        assertThat(result.historyTokens()).isGreaterThan(0);
        assertThat(result.userTokens()).isGreaterThan(0);
        assertThat(result.ragTokens()).isGreaterThan(0);
        assertThat(result.toolTokens()).isGreaterThan(0);
        assertThat(result.reservedOutputTokens()).isEqualTo(2048);
        assertThat(result.estimatedTotalTokens()).isEqualTo(
                result.systemTokens() + result.historyTokens() + result.userTokens()
                        + result.ragTokens() + result.toolTokens() + result.reservedOutputTokens()
        );
    }

    @Test
    @DisplayName("Should reject and return isAllowed=false when total tokens exceed ceiling limit")
    void testAuditExceedsBudget() {
        String hugeText = "Nội dung học vụ rất dài lặp đi lặp lại để kiểm tra tràn ngân sách token. ".repeat(1500);
        List<ChatMessageHistoryItem> history = List.of(
                ChatMessageHistoryItem.ofUser(hugeText, "2026-11-13T01:00:00Z")
        );

        TokenBudgetAuditor.AuditResult result = auditor.audit(
                "System prompt", history, "Câu hỏi tiếp theo", null, null, 2048, 10000
        );

        assertThat(result.isAllowed()).isFalse();
        assertThat(result.detailMessage()).contains("Context limit exceeded");
        assertThat(result.estimatedTotalTokens()).isGreaterThan(10000);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.\mvnw.cmd test -pl tv1-ai -Dtest=TokenBudgetAuditorTest`
Expected: Compilation failure because `TokenBudgetAuditor` does not exist yet.

- [ ] **Step 3: Implement `TokenBudgetAuditor` and update `AiProperties` & `AiAutoConfiguration`**

1. In `tv1-ai/src/main/java/vn/haui/advisor/ai/config/AiProperties.java`, add `maxContextTokens = 64_000` to `ConversationProperties`:
```java
private int maxContextTokens = 64_000;
public int getMaxContextTokens() { return maxContextTokens; }
public void setMaxContextTokens(int maxContextTokens) { this.maxContextTokens = maxContextTokens; }
```

2. Create `tv1-ai/src/main/java/vn/haui/advisor/ai/conversation/TokenBudgetAuditor.java`:
```java
package vn.haui.advisor.ai.conversation;

import org.springframework.stereotype.Component;
import vn.haui.advisor.ai.rag.service.GroundedContext;

import java.util.List;
import java.util.Map;

/**
 * Giám sát ngân sách token toàn diện trước khi chuyển dữ liệu sang LLM:
 * Tính toán T_total = T_sys + T_hist + T_rag + T_tool + T_user + T_reserve.
 * Từ chối có kiểm soát khi vượt ngưỡng trần, không cắt ngầm tin nhắn.
 */
@Component
public class TokenBudgetAuditor {

    public static final int DEFAULT_MAX_CONTEXT_TOKENS = 64_000;
    public static final int DEFAULT_RESERVED_OUTPUT_TOKENS = 2_048;

    public record AuditResult(
            boolean isAllowed,
            long estimatedTotalTokens,
            long systemTokens,
            long historyTokens,
            long userTokens,
            long ragTokens,
            long toolTokens,
            long reservedOutputTokens,
            long maxLimit,
            String detailMessage
    ) {}

    public AuditResult audit(
            String systemPrompt,
            List<ChatMessageHistoryItem> history,
            String userMessage,
            GroundedContext ragContext,
            Map<String, Object> toolResults,
            Integer configuredMaxOutputTokens,
            Integer configuredMaxContextTokens
    ) {
        long sysTokens = estimate(systemPrompt);
        long histTokens = estimateHistory(history);
        long userTokens = estimate(userMessage);
        long ragTokens = (ragContext != null && ragContext.getFormattedPromptContext() != null)
                ? estimate(ragContext.getFormattedPromptContext()) : 0;
        long toolTokens = estimateToolResults(toolResults);
        long reserveTokens = (configuredMaxOutputTokens != null && configuredMaxOutputTokens > 0)
                ? configuredMaxOutputTokens : DEFAULT_RESERVED_OUTPUT_TOKENS;
        long maxLimit = (configuredMaxContextTokens != null && configuredMaxContextTokens > 0)
                ? configuredMaxContextTokens : DEFAULT_MAX_CONTEXT_TOKENS;

        long totalTokens = sysTokens + histTokens + userTokens + ragTokens + toolTokens + reserveTokens;
        boolean allowed = totalTokens <= maxLimit;

        String message = allowed
                ? String.format("Tokens OK (%d / %d)", totalTokens, maxLimit)
                : String.format("Context limit exceeded: Total required %d tokens exceeds ceiling limit of %d tokens (History: %d, Tools: %d, RAG: %d)",
                totalTokens, maxLimit, histTokens, toolTokens, ragTokens);

        return new AuditResult(
                allowed, totalTokens, sysTokens, histTokens, userTokens,
                ragTokens, toolTokens, reserveTokens, maxLimit, message
        );
    }

    public static long estimate(String text) {
        if (text == null || text.isBlank()) return 0;
        return Math.max(1, (long) Math.ceil(text.length() * 0.38));
    }

    public static long estimateHistory(List<ChatMessageHistoryItem> history) {
        if (history == null || history.isEmpty()) return 0;
        long sum = 0;
        for (ChatMessageHistoryItem item : history) {
            if (item != null && item.getContent() != null) {
                sum += estimate(item.getContent()) + 4;
            }
        }
        return sum;
    }

    public static long estimateToolResults(Map<String, Object> toolResults) {
        if (toolResults == null || toolResults.isEmpty()) return 0;
        return estimate(toolResults.toString());
    }
}
```

3. Register `TokenBudgetAuditor` bean in `AiAutoConfiguration.java`.

- [ ] **Step 4: Run test to verify it passes**

Run: `.\mvnw.cmd test -pl tv1-ai -Dtest=TokenBudgetAuditorTest`
Expected: Tests run: 2, Failures: 0, Errors: 0, Skipped: 0.

- [ ] **Step 5: Commit Task 1**

```bash
git add tv1-ai/src/main/java/vn/haui/advisor/ai/conversation/TokenBudgetAuditor.java tv1-ai/src/test/java/vn/haui/advisor/ai/conversation/TokenBudgetAuditorTest.java tv1-ai/src/main/java/vn/haui/advisor/ai/config/AiProperties.java tv1-ai/src/main/java/vn/haui/advisor/ai/config/AiAutoConfiguration.java
git commit -m "feat(ai): add TokenBudgetAuditor for multi-component context monitoring"
```

---

### Task 2: `ConversationHistoryManager` Full History & Pruning Removal

**Files:**
- Create: `tv1-ai/src/main/java/vn/haui/advisor/ai/conversation/ConversationStorageOverflowException.java`
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/conversation/ConversationHistoryManager.java:65-195`
- Modify: `tv1-ai/src/test/java/vn/haui/advisor/ai/conversation/ConversationHistoryManagerTest.java`

**Interfaces:**
- Produces: `List<ChatMessageHistoryItem> loadFullHistory(String conversationId, String studentId)`
- Produces: `ConversationRecord saveTurn(String conversationId, String studentId, ChatMessageHistoryItem userMsg, ChatMessageHistoryItem assistantMsg, int maxTotalChars)` (with zero silent pruning, throws `ConversationStorageOverflowException` if DB limit exceeded)

- [ ] **Step 1: Write the failing tests in `ConversationHistoryManagerTest`**

Add tests to `tv1-ai/src/test/java/vn/haui/advisor/ai/conversation/ConversationHistoryManagerTest.java`:
```java
@Test
@DisplayName("Should load 100% full history without sliding window truncation when loadFullHistory is called")
void testLoadFullHistoryWithoutTruncation() {
    String convId = "conv-full-" + UUID.randomUUID();
    String studentId = "SV20246001";
    for (int i = 1; i <= 25; i++) {
        historyManager.saveTurn(convId, studentId,
                ChatMessageHistoryItem.ofUser("Câu hỏi " + i, null),
                ChatMessageHistoryItem.ofAssistant("Trả lời " + i, List.of(), List.of(), null, List.of()),
                900_000);
    }

    List<ChatMessageHistoryItem> fullHistory = historyManager.loadFullHistory(convId, studentId);
    assertThat(fullHistory).hasSize(50); // 25 turns * 2 = 50 messages
    assertThat(fullHistory.get(0).getContent()).isEqualTo("Câu hỏi 1");
    assertThat(fullHistory.get(49).getContent()).isEqualTo("Trả lời 25");
}

@Test
@DisplayName("Should throw ConversationStorageOverflowException instead of silently pruning messages when exceeding DB limit")
void testSaveTurnThrowsOnOverflowWithoutPruning() {
    String convId = "conv-overflow-" + UUID.randomUUID();
    String studentId = "SV20246001";
    String hugeContent = "A".repeat(500);

    // Set tight limit of 400 chars
    assertThatThrownBy(() -> historyManager.saveTurn(convId, studentId,
            ChatMessageHistoryItem.ofUser(hugeContent, null),
            ChatMessageHistoryItem.ofAssistant("Ok", List.of(), List.of(), null, List.of()),
            400))
            .isInstanceOf(ConversationStorageOverflowException.class)
            .hasMessageContaining("vượt quá giới hạn lưu trữ");
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.\mvnw.cmd test -pl tv1-ai -Dtest=ConversationHistoryManagerTest`
Expected: Compilation failure because `loadFullHistory` and `ConversationStorageOverflowException` are not defined.

- [ ] **Step 3: Implement `ConversationStorageOverflowException` and update `ConversationHistoryManager`**

1. Create `tv1-ai/src/main/java/vn/haui/advisor/ai/conversation/ConversationStorageOverflowException.java`:
```java
package vn.haui.advisor.ai.conversation;

public class ConversationStorageOverflowException extends RuntimeException {
    public ConversationStorageOverflowException(String message) {
        super(message);
    }
}
```

2. In `tv1-ai/src/main/java/vn/haui/advisor/ai/conversation/ConversationHistoryManager.java`:
- Add `loadFullHistory`:
```java
public List<ChatMessageHistoryItem> loadFullHistory(String conversationId, String studentId) {
    return loadHistory(conversationId, studentId, -1);
}
```
- In `loadHistory`:
```java
if (maxTurns <= 0 || allMessages.size() <= maxTurns) {
    return new ArrayList<>(allMessages);
}
```
- In `saveTurn`:
Replace lines 185-194 (the `while (isSizeExceeded) messages.remove(0);` block) with:
```java
if (isSizeExceeded(json, limit)) {
    throw new ConversationStorageOverflowException(
            "Dung lượng hội thoại (" + json.getBytes(StandardCharsets.UTF_8).length + " bytes) vượt quá giới hạn lưu trữ (" + limit + " bytes). Giao dịch được bảo vệ để không cắt ngầm dữ liệu cũ."
    );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.\mvnw.cmd test -pl tv1-ai -Dtest=ConversationHistoryManagerTest`
Expected: Tests run, Failures: 0, Errors: 0, Skipped: 0.

- [ ] **Step 5: Commit Task 2**

```bash
git add tv1-ai/src/main/java/vn/haui/advisor/ai/conversation/ConversationHistoryManager.java tv1-ai/src/main/java/vn/haui/advisor/ai/conversation/ConversationStorageOverflowException.java tv1-ai/src/test/java/vn/haui/advisor/ai/conversation/ConversationHistoryManagerTest.java
git commit -m "feat(ai): add loadFullHistory and remove silent message pruning in ConversationHistoryManager"
```

---

### Task 3: `LiveAdvisorModel` History Formatting & Anti-Duplication

**Files:**
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/model/LiveAdvisorModel.java:167-208, 902-918`
- Create: `tv1-ai/src/test/java/vn/haui/advisor/ai/model/LiveAdvisorModelHistoryFormattingTest.java`

**Interfaces:**
- `formatGeminiContents(List<ChatMessageHistoryItem> history, String userMessage)`: produces strictly alternating `user`/`model` contents without duplicating `userMessage`.
- `buildPrompt(AdvisorModelInput input)`: places full history in `<conversation_history>` without repeating `userMessage`.

- [ ] **Step 1: Write the failing unit tests for history formatting**

Create `tv1-ai/src/test/java/vn/haui/advisor/ai/model/LiveAdvisorModelHistoryFormattingTest.java`:
```java
package vn.haui.advisor.ai.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.conversation.ChatMessageHistoryItem;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Task 3: LiveAdvisorModel History Formatting & De-duplication Test")
class LiveAdvisorModelHistoryFormattingTest {

    @Test
    @DisplayName("Should preserve 20 turns chronological order and merge consecutive same-role turns")
    void testFormatGeminiContentsPreservesOrderAndMergesRoles() {
        List<ChatMessageHistoryItem> history = List.of(
                ChatMessageHistoryItem.ofUser("Câu 1", null),
                ChatMessageHistoryItem.ofUser("Câu 1 bổ sung", null), // consecutive user
                ChatMessageHistoryItem.ofAssistant("Trả lời 1", List.of(), List.of(), null, List.of()),
                ChatMessageHistoryItem.ofAssistant("Trả lời 1 bổ sung", List.of(), List.of(), null, List.of()) // consecutive model
        );

        List<Map<String, Object>> contents = LiveAdvisorModel.formatGeminiContents(history, "Câu hỏi mới");

        // Expected alternating: [user (merged), model (merged), user ("Câu hỏi mới")]
        assertThat(contents).hasSize(3);
        assertThat(contents.get(0).get("role")).isEqualTo("user");
        assertThat(contents.get(0).get("parts").toString()).contains("Câu 1\n\nCâu 1 bổ sung");
        assertThat(contents.get(1).get("role")).isEqualTo("model");
        assertThat(contents.get(1).get("parts").toString()).contains("Trả lời 1\n\nTrả lời 1 bổ sung");
        assertThat(contents.get(2).get("role")).isEqualTo("user");
        assertThat(contents.get(2).get("parts").toString()).contains("Câu hỏi mới");
    }

    @Test
    @DisplayName("Should not duplicate userMessage if it was already appended to history")
    void testNoDuplicateUserMessage() {
        List<ChatMessageHistoryItem> history = List.of(
                ChatMessageHistoryItem.ofUser("Câu 1", null),
                ChatMessageHistoryItem.ofAssistant("Trả lời 1", List.of(), List.of(), null, List.of()),
                ChatMessageHistoryItem.ofUser("Câu hỏi hiện tại", null) // already in history
        );

        List<Map<String, Object>> contents = LiveAdvisorModel.formatGeminiContents(history, "Câu hỏi hiện tại");

        assertThat(contents).hasSize(3); // user, model, user (not 4!)
        assertThat(contents.get(2).get("parts").toString()).contains("Câu hỏi hiện tại");
    }
}
```

- [ ] **Step 2: Run test to verify it fails or exposes duplicates**

Run: `.\mvnw.cmd test -pl tv1-ai -Dtest=LiveAdvisorModelHistoryFormattingTest`

- [ ] **Step 3: Update `formatGeminiContents` and `buildPrompt` in `LiveAdvisorModel.java`**

Apply the anti-duplication check in `formatGeminiContents` (lines 167-208) and `buildPrompt` (lines 902-918) as specified in the Design Spec.

- [ ] **Step 4: Run test to verify it passes**

Run: `.\mvnw.cmd test -pl tv1-ai -Dtest=LiveAdvisorModelHistoryFormattingTest`
Expected: Tests run: 2, Failures: 0, Errors: 0, Skipped: 0.

- [ ] **Step 5: Commit Task 3**

```bash
git add tv1-ai/src/main/java/vn/haui/advisor/ai/model/LiveAdvisorModel.java tv1-ai/src/test/java/vn/haui/advisor/ai/model/LiveAdvisorModelHistoryFormattingTest.java
git commit -m "fix(ai): ensure full order preservation and zero duplication in LiveAdvisorModel history formatting"
```

---

### Task 4: `DefaultAdvisorFacade` Full History & Token Budget Integration

**Files:**
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/service/DefaultAdvisorFacade.java:35-155, 320-350`
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/config/AiAutoConfiguration.java:260-280`
- Modify: `tv1-ai/src/test/java/vn/haui/advisor/ai/service/AdvisorFacadeTest.java`

**Interfaces:**
- Consumes: `TokenBudgetAuditor.audit`
- Consumes: `ConversationHistoryManager.loadFullHistory`
- Produces: `ChatResponse` with warning `CONTEXT_LIMIT_EXCEEDED` if token budget ceiling is breached.

- [ ] **Step 1: Write the failing test for Full History & Token Budget rejection in `AdvisorFacadeTest`**

Add tests to `tv1-ai/src/test/java/vn/haui/advisor/ai/service/AdvisorFacadeTest.java`:
```java
@Test
@DisplayName("Should reject and return CONTEXT_LIMIT_EXCEEDED when token budget ceiling is breached")
void testChatRejectsWhenBudgetExceeded() {
    TokenBudgetAuditor strictAuditor = mock(TokenBudgetAuditor.class);
    when(strictAuditor.audit(any(), any(), any(), any(), any(), any(), any()))
            .thenReturn(new TokenBudgetAuditor.AuditResult(false, 70000, 2000, 60000, 100, 1000, 1000, 2048, 64000, "Context limit exceeded"));

    DefaultAdvisorFacade facadeWithStrictBudget = new DefaultAdvisorFacade(
            mockAdvisorModel, mockToolAdapter, mockRagService, mockHistoryManager,
            mockIntentClassifier, mockValidator, 2500L, new AiMetricsCollector(), strictAuditor, new AiProperties()
    );

    ChatResponse response = facadeWithStrictBudget.chat(
            new ChatRequest("conv-1", "Hỏi tiếp", null),
            new TrustedStudentContext("SV01", "SV01", "Nguyen Van A", "KTPM", "K16", "REV-1")
    );

    assertThat(response.getWarnings()).anyMatch(w -> w.contains("CONTEXT_LIMIT_EXCEEDED"));
    assertThat(response.getAnswer()).contains("vui lòng mở một cuộc hội thoại mới");
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.\mvnw.cmd test -pl tv1-ai -Dtest=AdvisorFacadeTest`

- [ ] **Step 3: Update `DefaultAdvisorFacade.java` & `AiAutoConfiguration.java`**

1. In `DefaultAdvisorFacade.java`:
- Add field `private final TokenBudgetAuditor tokenBudgetAuditor;` and `private final AiProperties aiProperties;`
- In `chat(ChatRequest request, TrustedStudentContext context)`:
  - Replace line 149 with:
    ```java
    history = conversationHistoryManager.loadFullHistory(conversationId, studentId);
    ```
  - Before calling `LiveAdvisorModel` or `advisorModel.generate`:
    ```java
    TokenBudgetAuditor.AuditResult audit = tokenBudgetAuditor.audit(
            LiveAdvisorModel.SYSTEM_PROMPT, history, userMessage, groundedContext, toolResults,
            aiProperties.getModel().getMaxTokens(), aiProperties.getConversation().getMaxContextTokens()
    );
    if (!audit.isAllowed()) {
        return new ChatResponse(
                "Cuộc hội thoại đã đạt đến dung lượng ngữ cảnh tối đa an toàn. Để bảo đảm tính chính xác học vụ, bạn vui lòng mở một cuộc hội thoại mới.",
                List.of(), List.of(), null, List.of("CONTEXT_LIMIT_EXCEEDED: " + audit.detailMessage())
        );
    }
    ```
2. Update `AiAutoConfiguration.java` to inject `TokenBudgetAuditor` into `DefaultAdvisorFacade`.

- [ ] **Step 4: Run test to verify it passes**

Run: `.\mvnw.cmd test -pl tv1-ai -Dtest=AdvisorFacadeTest`
Expected: Tests pass.

- [ ] **Step 5: Commit Task 4**

```bash
git add tv1-ai/src/main/java/vn/haui/advisor/ai/service/DefaultAdvisorFacade.java tv1-ai/src/main/java/vn/haui/advisor/ai/config/AiAutoConfiguration.java tv1-ai/src/test/java/vn/haui/advisor/ai/service/AdvisorFacadeTest.java
git commit -m "feat(ai): integrate loadFullHistory and TokenBudgetAuditor into DefaultAdvisorFacade"
```

---

### Task 5: `AdvisorStreamingService` Full History & Token Budget Integration

**Files:**
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/service/AdvisorStreamingService.java:30-105`
- Modify: `tv1-ai/src/main/java/vn/haui/advisor/ai/config/AiAutoConfiguration.java:235-255`
- Modify: `tv1-ai/src/test/java/vn/haui/advisor/ai/service/AdvisorStreamingServiceTest.java`

**Interfaces:**
- Consumes: `TokenBudgetAuditor.audit`
- Consumes: `ConversationHistoryManager.loadFullHistory`
- Produces: `ChatStreamEvent.error("CONTEXT_LIMIT_EXCEEDED", ...)` if token budget is breached.

- [ ] **Step 1: Write the failing test for streaming token budget rejection**

Add test to `tv1-ai/src/test/java/vn/haui/advisor/ai/service/AdvisorStreamingServiceTest.java`:
```java
@Test
@DisplayName("Should emit error event CONTEXT_LIMIT_EXCEEDED when token budget ceiling is breached")
void testStreamChatRejectsWhenBudgetExceeded() {
    TokenBudgetAuditor strictAuditor = mock(TokenBudgetAuditor.class);
    when(strictAuditor.audit(any(), any(), any(), any(), any(), any(), any()))
            .thenReturn(new TokenBudgetAuditor.AuditResult(false, 70000, 2000, 60000, 100, 0, 0, 2048, 64000, "Context limit exceeded"));

    AdvisorStreamingService streamingService = new AdvisorStreamingService(
            mockAdvisorModel, mockToolAdapter, mockRagService, mockHistoryManager,
            mockValidator, new AiMetricsCollector(), strictAuditor, new AiProperties()
    );

    List<ChatStreamEvent> events = new ArrayList<>();
    streamingService.streamChat(
            new ChatRequest("conv-1", "Hỏi tiếp", null),
            new TrustedStudentContext("SV01", "SV01", "Nguyen Van A", "KTPM", "K16", "REV-1"),
            events::add
    );

    assertThat(events).anyMatch(e -> e.getEventType() == ChatStreamEvent.EventType.ERROR
            && "CONTEXT_LIMIT_EXCEEDED".equals(e.getCode()));
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.\mvnw.cmd test -pl tv1-ai -Dtest=AdvisorStreamingServiceTest`

- [ ] **Step 3: Update `AdvisorStreamingService.java` & `AiAutoConfiguration.java`**

1. In `AdvisorStreamingService.java`:
- Remove `DEFAULT_MAX_HISTORY_TURNS = 10`.
- Add fields `private final TokenBudgetAuditor tokenBudgetAuditor;` and `private final AiProperties aiProperties;`
- In `streamChat(...)`:
  - Replace line 97 with:
    ```java
    history = conversationHistoryManager.loadFullHistory(conversationId, studentId);
    ```
  - Before starting tool planning:
    ```java
    TokenBudgetAuditor.AuditResult audit = tokenBudgetAuditor.audit(
            LiveAdvisorModel.SYSTEM_PROMPT, history, userMessage, null, null,
            aiProperties.getModel().getMaxTokens(), aiProperties.getConversation().getMaxContextTokens()
    );
    if (!audit.isAllowed()) {
        eventConsumer.accept(ChatStreamEvent.error(
                "CONTEXT_LIMIT_EXCEEDED",
                "Cuộc hội thoại đã đạt đến dung lượng ngữ cảnh tối đa an toàn. Vui lòng mở cuộc hội thoại mới.",
                false
        ));
        return;
    }
    ```
2. Update `AiAutoConfiguration.java` to inject `TokenBudgetAuditor` into `AdvisorStreamingService`.

- [ ] **Step 4: Run test to verify it passes**

Run: `.\mvnw.cmd test -pl tv1-ai -Dtest=AdvisorStreamingServiceTest`
Expected: Tests pass.

- [ ] **Step 5: Commit Task 5**

```bash
git add tv1-ai/src/main/java/vn/haui/advisor/ai/service/AdvisorStreamingService.java tv1-ai/src/main/java/vn/haui/advisor/ai/config/AiAutoConfiguration.java tv1-ai/src/test/java/vn/haui/advisor/ai/service/AdvisorStreamingServiceTest.java
git commit -m "feat(ai): integrate loadFullHistory and TokenBudgetAuditor into AdvisorStreamingService"
```

---

### Task 6: Multi-turn Retention, Goal Shift & Budget Overflow Integration Tests

**Files:**
- Create: `tv1-ai/src/test/java/vn/haui/advisor/ai/conversation/FullHistoryMultiTurnRetentionTest.java`

- [ ] **Step 1: Write integration tests covering all 4 review focus requirements**

Create `tv1-ai/src/test/java/vn/haui/advisor/ai/conversation/FullHistoryMultiTurnRetentionTest.java`:
```java
package vn.haui.advisor.ai.conversation;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.config.AiProperties;
import vn.haui.advisor.ai.grounding.ResponseGroundingValidator;
import vn.haui.advisor.ai.intent.IntentClassifier;
import vn.haui.advisor.ai.model.AdvisorModelInput;
import vn.haui.advisor.ai.model.AdvisorModelOutput;
import vn.haui.advisor.ai.model.LiveAdvisorModel;
import vn.haui.advisor.ai.model.MockAdvisorModel;
import vn.haui.advisor.ai.service.DefaultAdvisorFacade;
import vn.haui.advisor.ai.telemetry.AiMetricsCollector;
import vn.haui.advisor.ai.tools.ToolAdapter;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.fake.InMemoryConversationStore;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("Task 6: Full Conversation History Multi-turn Retention & Goal Shift Integration Test")
public class FullHistoryMultiTurnRetentionTest {

    private InMemoryConversationStore store;
    private ConversationHistoryManager historyManager;
    private TokenBudgetAuditor budgetAuditor;
    private ToolAdapter toolAdapter;
    private DefaultAdvisorFacade advisorFacade;
    private TrustedStudentContext context;
    private AtomicReference<AdvisorModelInput> capturedInput;

    @BeforeEach
    void setUp() {
        store = new InMemoryConversationStore();
        historyManager = new ConversationHistoryManager(store, new ObjectMapper(), false);
        budgetAuditor = new TokenBudgetAuditor();
        toolAdapter = mock(ToolAdapter.class);
        capturedInput = new AtomicReference<>();

        MockAdvisorModel mockModel = new MockAdvisorModel() {
            @Override
            public AdvisorModelOutput generate(AdvisorModelInput input) {
                capturedInput.set(input);
                return new AdvisorModelOutput("Tư vấn mục tiêu CPA mới", List.of(), List.of(), null, List.of());
            }
        };

        advisorFacade = new DefaultAdvisorFacade(
                mockModel,
                toolAdapter,
                null,
                historyManager,
                new IntentClassifier(),
                new ResponseGroundingValidator(),
                2500L,
                new AiMetricsCollector(),
                budgetAuditor,
                new AiProperties()
        );

        context = new TrustedStudentContext("SV2024604757", "SV2024604757", "Nguyen Van An", "KTPM", "K16", "REV-1");
    }

    @Test
    @DisplayName("Should retain context across 15 turns without truncation and resolve Goal Shift")
    void test15TurnsGoalShiftContextRetention() {
        String convId = "conv-retention-15";

        // Pre-populate turns 1 to 14
        for (int i = 1; i <= 14; i++) {
            String userText = i == 2 ? "Mục tiêu ban đầu của em là đạt CPA 3.0 vào kỳ 2026_2"
                    : i == 8 ? "Em muốn đổi mục tiêu thành CPA 3.6"
                    : "Em muốn hỏi thêm về môn học kỳ " + i;
            advisorFacade.chat(new ChatRequest(convId, userText, null), context);
        }

        // At Turn 15, student asks for study plan
        ChatResponse turn15 = advisorFacade.chat(new ChatRequest(convId, "Hãy lập lộ trình cho em theo mục tiêu đó", null), context);

        assertThat(turn15).isNotNull();
        AdvisorModelInput input = capturedInput.get();
        assertThat(input).isNotNull();
        // Full history must contain all 14 previous turns (28 messages: 14 user + 14 assistant)
        assertThat(input.getHistory()).hasSize(28);
        assertThat(input.getHistory().get(2).getContent()).contains("CPA 3.0 vào kỳ 2026_2"); // Turn 2 preserved!
        assertThat(input.getHistory().get(14).getContent()).contains("CPA 3.6"); // Turn 8 preserved!
    }

    @Test
    @DisplayName("Should explicitly reject when simulated conversation exceeds budget ceiling")
    void testExplicitRejectionOnContextCeilingExceeded() {
        String convId = "conv-overflow-rejection";
        AiProperties properties = new AiProperties();
        properties.getConversation().setMaxContextTokens(1000); // Tight limit

        DefaultAdvisorFacade tightFacade = new DefaultAdvisorFacade(
                new MockAdvisorModel(), toolAdapter, null, historyManager,
                new IntentClassifier(), new ResponseGroundingValidator(),
                2500L, new AiMetricsCollector(), budgetAuditor, properties
        );

        // Pre-populate enough text to exceed 1000 tokens
        for (int i = 1; i <= 5; i++) {
            historyManager.saveTurn(convId, context.getStudentId(),
                    ChatMessageHistoryItem.ofUser("Câu hỏi dài chứa nhiều ký tự tiếng Việt ".repeat(30), null),
                    ChatMessageHistoryItem.ofAssistant("Câu trả lời dài tương ứng ".repeat(30), List.of(), List.of(), null, List.of()),
                    900_000);
        }

        ChatResponse response = tightFacade.chat(new ChatRequest(convId, "Hỏi thêm câu nữa", null), context);

        assertThat(response.getWarnings()).anyMatch(w -> w.contains("CONTEXT_LIMIT_EXCEEDED"));
        assertThat(response.getAnswer()).contains("vui lòng mở một cuộc hội thoại mới");
        // Verify database records were NOT truncated
        assertThat(historyManager.loadFullHistory(convId, context.getStudentId())).hasSize(10);
    }
}
```

- [ ] **Step 2: Run test to verify it passes**

Run: `.\mvnw.cmd test -pl tv1-ai -Dtest=FullHistoryMultiTurnRetentionTest`
Expected: Tests run: 2, Failures: 0, Errors: 0, Skipped: 0.

- [ ] **Step 3: Commit Task 6**

```bash
git add tv1-ai/src/test/java/vn/haui/advisor/ai/conversation/FullHistoryMultiTurnRetentionTest.java
git commit -m "test(ai): add multi-turn retention and goal-shift integration tests"
```

---

### Task 7: Full AI Module Regression Suite Run

**Files:**
- Test: All tests in `tv1-ai`

- [ ] **Step 1: Execute full maven test on `tv1-ai`**

Run: `.\mvnw.cmd test -pl tv1-ai`
Expected: All tests pass with 0 failures, 0 errors.

- [ ] **Step 2: Verify git status and create final checkpoint commit**

Run: `git status`
Verify: Clean working tree.

