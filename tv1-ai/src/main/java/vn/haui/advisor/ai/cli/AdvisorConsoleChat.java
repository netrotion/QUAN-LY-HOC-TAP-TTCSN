package vn.haui.advisor.ai.cli;

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

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Scanner;

/**
 * Ứng dụng Console tương tác trực tiếp (Interactive Terminal Chat) cho HaUI Advisor.
 * Cho phép người dùng trò chuyện trực tiếp qua Terminal với Google Gemini (Live Mode)
 * hoặc Deterministic Knowledge Engine (Mock Mode).
 */
public class AdvisorConsoleChat {

    public static void main(String[] args) {
        // Thiết lập mã hóa UTF-8 cho console
        try {
            System.setOut(new java.io.PrintStream(System.out, true, StandardCharsets.UTF_8));
        } catch (Exception ignored) {
        }

        Scanner scanner = new Scanner(System.in, StandardCharsets.UTF_8);

        printBanner();

        // 1. Kiểm tra và tiếp nhận API Key từ Environment hoặc file .env
        var dotEnv = LiveAdvisorModel.loadDotEnv();
        String apiKey = System.getenv("GEMINI_API_KEY");
        if (apiKey == null || apiKey.isBlank()) {
            apiKey = System.getProperty("gemini.api.key");
        }
        if (apiKey == null || apiKey.isBlank()) {
            apiKey = dotEnv.get("GEMINI_API_KEY");
        }

        boolean isLiveMode = false;
        if (apiKey != null && !apiKey.isBlank()) {
            isLiveMode = true;
            System.setProperty("gemini.api.key", apiKey);
            System.out.println("[✓] Đã nạp GEMINI_API_KEY thành công (từ biến môi trường hoặc file .env).");
        } else {
            System.out.println("┌────────────────────────────────────────────────────────────────────────┐");
            System.out.println("│ [?] Bạn chưa thiết lập GEMINI_API_KEY trong môi trường hoặc file .env. │");
            System.out.println("│                                                                        │");
            System.out.println("│ 👉 Hãy dán Google Gemini API Key của bạn vào bên dưới để chat thật:    │");
            System.out.println("│    (Hoặc chỉ cần nhấn [ENTER] để dùng MOCK Mode offline miễn phí)      │");
            System.out.println("└────────────────────────────────────────────────────────────────────────┘");
            System.out.print("👉 Nhập GEMINI_API_KEY (hoặc Enter để bỏ qua): ");
            String inputKey = scanner.nextLine().trim();
            if (inputKey.equalsIgnoreCase("exit") || inputKey.equalsIgnoreCase("quit")) {
                System.out.println("\n👋 Đã thoát.");
                return;
            }
            if (!inputKey.isBlank()) {
                apiKey = inputKey;
                System.setProperty("gemini.api.key", apiKey);
                isLiveMode = true;
                System.out.println("[✓] Đã thiết lập API Key thành công!");
            } else {
                System.out.println("[i] Bạn chọn chế độ MOCK (Offline Deterministic Knowledge Engine).");
            }
        }

        // 2. Khởi tạo hạ tầng dịch vụ RAG và Academic Tools
        System.out.print("\n[⏳] Đang khởi tạo cơ sở tri thức RAG và dữ liệu học vụ HaUI... ");
        RagAdvisorService ragAdvisorService = new RagAdvisorService();
        ragAdvisorService.initializeCatalogIndex();

        MockAcademicFacade mockAcademicFacade = new MockAcademicFacade();
        DefaultToolAdapter toolAdapter = new DefaultToolAdapter(mockAcademicFacade);
        ConversationHistoryManager historyManager = new ConversationHistoryManager(new InMemoryConversationStore());
        IntentClassifier intentClassifier = new IntentClassifier();
        ResponseGroundingValidator groundingValidator = new ResponseGroundingValidator();

        // 3. Khởi tạo mô hình AI
        AdvisorModel model;
        String modelName = System.getenv("GEMINI_MODEL");
        if (modelName == null || modelName.isBlank()) {
            modelName = System.getProperty("gemini.model");
        }
        if (modelName == null || modelName.isBlank()) {
            String aiMode = System.getenv("AI_MODE");
            if (aiMode != null && aiMode.toLowerCase().startsWith("gemini-")) {
                modelName = aiMode;
            }
        }
        if (modelName == null || modelName.isBlank()) {
            if (dotEnv.containsKey("GEMINI_MODEL")) {
                modelName = dotEnv.get("GEMINI_MODEL");
            } else if (dotEnv.containsKey("AI_MODE") && dotEnv.get("AI_MODE").toLowerCase().startsWith("gemini-")) {
                modelName = dotEnv.get("AI_MODE");
            }
        }
        if (modelName == null || modelName.isBlank() || "gemini-1.5-flash-8b".equals(modelName) || "gemini-1.5-flash".equals(modelName) || "gemini-2.5-flash-lite".equalsIgnoreCase(modelName)) {
            modelName = "gemini-3.5-flash-lite";
        }
        System.setProperty("gemini.model", modelName);

        if (isLiveMode) {
            model = new LiveAdvisorModel(groundingValidator);
            System.out.println("Hoàn tất!");
            System.out.println("[🤖 CHẾ ĐỘ]: LIVE AI (Google Gemini)");
            System.out.println("[🎯 MÔ HÌNH]: " + modelName + " (Model thấp nhất, tốc độ cao & tiết kiệm nhất)");
            System.out.println("              (Nếu tài khoản của bạn chưa hỗ trợ 8b, hệ thống sẽ tự động chuyển sang gemini-1.5-flash)");
        } else {
            model = new MockAdvisorModel(ragAdvisorService);
            System.out.println("Hoàn tất!");
            System.out.println("[🤖 CHẾ ĐỘ]: MOCK ENGINE (Không cần kết nối mạng)");
        }

        AdvisorFacade facade = new DefaultAdvisorFacade(
                model, toolAdapter, ragAdvisorService, historyManager, intentClassifier, groundingValidator
        );

        // 4. Ngữ cảnh sinh viên mặc định
        TrustedStudentContext studentContext = new TrustedStudentContext(
                "STU-2024604757",
                "2024604757",
                "Nguyễn Văn An",
                "Công nghệ thông tin",
                "K16",
                "REV-2024-V1"
        );

        String conversationId = "CONV-TERMINAL-" + System.currentTimeMillis();

        printHelpGuide(studentContext);

        // 5. Vòng lặp hội thoại tương tác (Interactive Loop)
        int turn = 1;
        while (true) {
            System.out.print("\n[Lượt " + turn + "] Sinh viên > ");
            String userInput;
            try {
                if (!scanner.hasNextLine()) {
                    break;
                }
                userInput = scanner.nextLine().trim();
            } catch (Exception e) {
                break;
            }

            if (userInput.isBlank()) {
                continue;
            }

            // Xử lý các lệnh điều khiển đặc biệt
            if (userInput.equalsIgnoreCase("exit") || userInput.equalsIgnoreCase("quit")) {
                System.out.println("\n👋 Cảm ơn bạn đã sử dụng Cố vấn học vụ HaUI Advisor. Chúc bạn học tập tốt!");
                break;
            }

            if (userInput.equalsIgnoreCase("clear") || userInput.equalsIgnoreCase("reset")) {
                conversationId = "CONV-TERMINAL-" + System.currentTimeMillis();
                turn = 1;
                System.out.println("[✓] Đã tạo phiên hội thoại mới (ID: " + conversationId + "). Lịch sử đã được làm mới.");
                continue;
            }

            if (userInput.equalsIgnoreCase("help")) {
                printHelpGuide(studentContext);
                continue;
            }

            if (userInput.equalsIgnoreCase("model")) {
                System.out.println("\n[ℹ️ Thông tin mô hình]:");
                System.out.println(" - Chế độ: " + (isLiveMode ? "LIVE (Gemini)" : "MOCK"));
                System.out.println(" - Model hiện tại: " + modelName);
                System.out.println(" - Bạn có thể đổi model bằng cách gõ: :setmodel <tên_model> (ví dụ: :setmodel gemini-1.5-flash hoặc :setmodel gemini-2.0-flash-lite)");
                continue;
            }

            if (userInput.toLowerCase().startsWith(":setmodel ")) {
                String newModel = userInput.substring(10).trim();
                if (!newModel.isBlank()) {
                    System.setProperty("gemini.model", newModel);
                    modelName = newModel;
                    System.out.println("[✓] Đã đổi model sang: " + newModel);
                }
                continue;
            }

            // Thực thi tư vấn qua DefaultAdvisorFacade
            System.out.println("[⏳ HaUI Advisor đang suy nghĩ và tra cứu quy chế...]");
            long startTime = System.currentTimeMillis();
            try {
                ChatRequest request = new ChatRequest(conversationId, userInput, Instant.now().toString());
                ChatResponse response = facade.chat(request, studentContext);
                long elapsed = System.currentTimeMillis() - startTime;

                printResponse(response, elapsed);
                turn++;
            } catch (Exception e) {
                System.err.println("\n[❌ Lỗi xử lý]: " + e.getMessage());
            }
        }

        scanner.close();
    }

    private static void printBanner() {
        System.out.println("================================================================================");
        System.out.println("  🎓 TRỢ LÝ CỐ VẤN HỌC VỤ THÔNG MINH HAUI (HaUI Academic Advisor CLI)");
        System.out.println("  Trường Đại học Công nghiệp Hà Nội (HaUI)");
        System.out.println("  Tích hợp RAG Quy chế, Kiểm tra Học vụ Tức thì & Lập Kế hoạch Cá nhân hóa");
        System.out.println("================================================================================");
    }

    private static void printHelpGuide(TrustedStudentContext studentContext) {
        System.out.println("\n┌────────────────────────────────────────────────────────────────────────┐");
        System.out.println("│ 👤 SINH VIÊN HIỆN TẠI: " + padRight(studentContext.getFullName() + " (" + studentContext.getStudentCode() + ")", 48) + "│");
        System.out.println("│ 📚 CHUYÊN NGÀNH:       " + padRight(studentContext.getMajorCode() + " - Khóa " + studentContext.getCohort(), 48) + "│");
        System.out.println("├────────────────────────────────────────────────────────────────────────┤");
        System.out.println("│ ⌨️  LỆNH HỆ THỐNG:                                                     │");
        System.out.println("│    • exit / quit     : Kết thúc trò chuyện                             │");
        System.out.println("│    • reset / clear   : Làm mới phiên trò chuyện                        │");
        System.out.println("│    • model           : Xem hoặc đổi mô hình Gemini                     │");
        System.out.println("│    • help            : Xem lại gợi ý câu hỏi                           │");
        System.out.println("├────────────────────────────────────────────────────────────────────────┤");
        System.out.println("│ 💡 GỢI Ý CÂU HỎI THỰC TẾ:                                              │");
        System.out.println("│  1. 'Tôi đang nợ môn nào và quy định học lại ra sao?'                  │");
        System.out.println("│  2. 'Lập kế hoạch học tập giúp mình đạt CPA 3.5 trước kỳ 8'            │");
        System.out.println("│  3. 'Quy định cảnh báo học vụ và xét buộc thôi học tại HaUI thế nào?'  │");
        System.out.println("│  4. 'Nếu kỳ tới tôi đạt 18 tín chỉ điểm B+ thì CPA tăng thành bao nhiêu?'│");
        System.out.println("│  5. 'Kiểm tra điều kiện tốt nghiệp của tôi còn thiếu những gì?'        │");
        System.out.println("│  6. 'Học vượt để ra trường sớm thì cần điều kiện gì?'                  │");
        System.out.println("└────────────────────────────────────────────────────────────────────────┘");
    }

    private static void printResponse(ChatResponse response, long elapsedMs) {
        System.out.println("\n--------------------------------------------------------------------------------");
        System.out.println("🤖 HaUI Advisor (" + elapsedMs + "ms):");
        System.out.println(response.getAnswer());

        // Hiển thị nguồn trích dẫn
        if (response.getSources() != null && !response.getSources().isEmpty()) {
            System.out.println("\n📚 [Tài liệu Quy chế tham chiếu]:");
            for (ChatSourceItem source : response.getSources()) {
                System.out.println("   • [" + source.getSourceId() + "] " + source.getTitle()
                        + " (" + source.getSection() + ") -> " + (source.getReferenceUrl() != null ? source.getReferenceUrl() : "HaUI Academic Portal"));
            }
        }

        // Hiển thị hành động gợi ý
        if (response.getActions() != null && !response.getActions().isEmpty()) {
            System.out.println("\n⚡ [Hành động nhanh]:");
            for (ChatActionItem action : response.getActions()) {
                System.out.println("   • [" + action.getActionType() + "] " + action.getLabel() + " -> Tuyến đường: " + action.getTargetRoute());
            }
        }

        // Hiển thị kế hoạch học tập nếu có
        if (response.getPlanProposal() != null) {
            ChatPlanProposal plan = response.getPlanProposal();
            System.out.println("\n📋 [Đề xuất Kế hoạch Học tập]:");
            System.out.println("   • Tóm tắt: " + plan.getSummary());
            System.out.println("   • CPA dự kiến: " + plan.getProjectedCpa());
            if (plan.getProposalId() != null) {
                System.out.println("   • Mã dự thảo: " + plan.getProposalId());
            }
            if (plan.getSemesters() != null && !plan.getSemesters().isEmpty()) {
                System.out.println("   • Lộ trình gồm " + plan.getSemesters().size() + " học kỳ:");
                for (PlannedSemesterItem sem : plan.getSemesters()) {
                    System.out.println("     + Kỳ " + sem.getSemesterCode() + ": " + sem.getTotalCredits() + " tín chỉ");
                }
            }
        }

        // Cảnh báo nếu có
        if (response.getWarnings() != null && !response.getWarnings().isEmpty()) {
            System.out.println("\n⚠️ [Ghi chú / Cảnh báo]:");
            for (String warning : response.getWarnings()) {
                System.out.println("   • " + warning);
            }
        }
        System.out.println("--------------------------------------------------------------------------------");
    }

    private static String padRight(String s, int n) {
        if (s == null) s = "";
        if (s.length() >= n) return s.substring(0, n);
        return String.format("%-" + n + "s", s);
    }
}
