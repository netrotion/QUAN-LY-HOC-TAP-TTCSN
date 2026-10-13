package vn.haui.advisor.ai.cli;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.conversation.ConversationHistoryManager;
import vn.haui.advisor.ai.grounding.ResponseGroundingValidator;
import vn.haui.advisor.ai.intent.IntentClassifier;
import vn.haui.advisor.ai.mock.MockAcademicFacade;
import vn.haui.advisor.ai.model.AdvisorModel;
import vn.haui.advisor.ai.model.LiveAdvisorModel;
import vn.haui.advisor.ai.model.MockAdvisorModel;
import vn.haui.advisor.ai.rag.service.RagAdvisorService;
import vn.haui.advisor.ai.service.DefaultAdvisorFacade;
import vn.haui.advisor.ai.tools.DefaultToolAdapter;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.fake.InMemoryConversationStore;
import vn.haui.advisor.contracts.ports.AdvisorFacade;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Runner kiểm thử tương tác (Interactive Chat Runner) cho HaUI Advisor:
 * Có thể chạy kiểm thử tức thì cả ở chế độ MOCK (không cần API key) lẫn chế độ LIVE (với Gemini API key).
 *
 * Cách chạy từ Terminal / PowerShell:
 * 1. Chạy với Mock Model (offline, miễn phí):
 *    ./mvnw -pl tv1-ai test -Dtest=InteractiveAdvisorChatRunner -Dquery="Tôi nợ những môn nào?"
 *
 * 2. Chạy với Live Gemini Model:
 *    $env:GEMINI_API_KEY="AIzaSy..."
 *    ./mvnw -pl tv1-ai test -Dtest=InteractiveAdvisorChatRunner -Dlive=true -Dquery="Quy định đăng ký tín chỉ ra sao?"
 */
@DisplayName("Interactive Advisor Chat Runner (CLI Demonstration)")
public class InteractiveAdvisorChatRunner {

    @Test
    @DisplayName("Execute Interactive / Live Chat Query")
    void testExecuteQuery() {
        String query = System.getProperty("query");
        boolean isLiveRequested = Boolean.parseBoolean(System.getProperty("live", "false"))
                || System.getenv("GEMINI_API_KEY") != null && !System.getenv("GEMINI_API_KEY").isBlank();

        // 1. Khởi tạo hạ tầng RAG và Tool Adapter
        RagAdvisorService ragAdvisorService = new RagAdvisorService();
        ragAdvisorService.initializeCatalogIndex();

        MockAcademicFacade mockAcademicFacade = new MockAcademicFacade();
        DefaultToolAdapter toolAdapter = new DefaultToolAdapter(mockAcademicFacade);
        ConversationHistoryManager historyManager = new ConversationHistoryManager(new InMemoryConversationStore());
        IntentClassifier intentClassifier = new IntentClassifier();
        ResponseGroundingValidator groundingValidator = new ResponseGroundingValidator();

        // 2. Lựa chọn Model: LIVE nếu có yêu cầu/key, ngược lại MOCK
        AdvisorModel model;
        String modeName;
        if (isLiveRequested) {
            model = new LiveAdvisorModel(groundingValidator);
            modeName = "LIVE (Gemini API)";
        } else {
            model = new MockAdvisorModel(ragAdvisorService);
            modeName = "MOCK (Deterministic Knowledge Engine)";
        }

        AdvisorFacade facade = new DefaultAdvisorFacade(
                model, toolAdapter, ragAdvisorService, historyManager, intentClassifier, groundingValidator
        );

        TrustedStudentContext studentContext = new TrustedStudentContext(
                "STU-2024604757",
                "2024604757",
                "Nguyễn Văn An",
                "Công nghệ thông tin",
                "K16",
                "REV-2024-V1"
        );

        // 3. Nếu không truyền query từ terminal, chạy kịch bản mẫu
        List<String> queriesToRun = (query != null && !query.isBlank())
                ? List.of(query)
                : List.of(
                        "Hiện tại tôi đang nợ môn nào và quy định học lại môn đó ra sao?",
                        "Lập kế hoạch học tập giúp mình đạt CPA 3.5 trước kỳ 8"
                );

        String convId = "CONV-DEMO-" + System.currentTimeMillis();

        System.out.println("\n=======================================================");
        System.out.println("  HAUI ADVISOR INTERACTIVE CHAT DEMONSTRATION");
        System.out.println("  Mode: " + modeName);
        System.out.println("  Sinh viên: " + studentContext.getFullName() + " (" + studentContext.getStudentCode() + ")");
        System.out.println("=======================================================\n");

        for (int i = 0; i < queriesToRun.size(); i++) {
            String userPrompt = queriesToRun.get(i);
            System.out.println(">>> [LƯỢT " + (i + 1) + "] NGƯỜI DÙNG: " + userPrompt);

            ChatRequest request = new ChatRequest(convId, userPrompt, Instant.now().toString());
            ChatResponse response = facade.chat(request, studentContext);

            assertThat(response).isNotNull();
            assertThat(response.getAnswer()).isNotBlank();

            System.out.println("\n<<< [HAUI ADVISOR PHẢN HỒI]:");
            System.out.println(response.getAnswer());

            if (response.getSources() != null && !response.getSources().isEmpty()) {
                System.out.println("\n[NGUỒN TRÍCH DẪN QUY CHẾ]:");
                for (ChatSourceItem src : response.getSources()) {
                    System.out.println("  * [" + src.getSourceId() + "] " + src.getTitle() + " - " + src.getSection());
                }
            }

            if (response.getActions() != null && !response.getActions().isEmpty()) {
                System.out.println("\n[HÀNH ĐỘNG GỢI Ý (ACTIONS)]: ");
                for (ChatActionItem act : response.getActions()) {
                    System.out.println("  -> [" + act.getActionType() + "] " + act.getLabel() + " (Route: " + act.getTargetRoute() + ")");
                }
            }

            if (response.getPlanProposal() != null) {
                System.out.println("\n[DỰ THẢO KẾ HOẠCH HỌC TẬP]: " + response.getPlanProposal().getSummary());
                System.out.println("  CPA dự kiến: " + response.getPlanProposal().getProjectedCpa());
            }

            if (response.getWarnings() != null && !response.getWarnings().isEmpty()) {
                System.out.println("\n[CẢNH BÁO HỌC VỤ / HỆ THỐNG]: " + response.getWarnings());
            }

            System.out.println("\n-------------------------------------------------------\n");
        }
    }
}
