package vn.haui.advisor.ai.eval;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.model.LiveAdvisorModel;
import vn.haui.advisor.ai.rag.service.GroundedContext;
import vn.haui.advisor.ai.rag.service.RagAdvisorService;
import vn.haui.advisor.ai.service.DefaultAdvisorFacade;
import vn.haui.advisor.ai.tools.ToolAdapter;
import vn.haui.advisor.contracts.dto.*;

import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class NaturalLanguageToolCallingTest {

    private final TrustedStudentContext context = new TrustedStudentContext(
            "2024604757", "SV001", "Nguyễn Văn A", "KTPM", "K19", "REV-1"
    );

    @Test
    @DisplayName("Colloquial prompt: 'm còn thiếu bao nhiêu tín chỉ để ra trường?' triggers run_graduation_audit")
    void shouldHandleColloquialGraduationAuditPrompt() {
        String turn1Response = """
                {
                  "candidates": [
                    {
                      "content": {
                        "parts": [
                          {
                            "functionCall": {
                              "name": "run_graduation_audit",
                              "args": {}
                            }
                          }
                        ],
                        "role": "model"
                      },
                      "finishReason": "STOP"
                    }
                  ]
                }
                """;
        String turn2Response = """
                {
                  "candidates": [
                    {
                      "content": {
                        "parts": [
                          {
                            "text": "Bạn đã hoàn thành 59/150 tín chỉ. Bạn còn thiếu 91 tín chỉ để đủ điều kiện tốt nghiệp."
                          }
                        ],
                        "role": "model"
                      },
                      "finishReason": "STOP"
                    }
                  ]
                }
                """;

        AtomicBoolean isTurn1 = new AtomicBoolean(true);
        LiveAdvisorModel liveModel = new LiveAdvisorModel(req -> isTurn1.getAndSet(false) ? turn1Response : turn2Response);
        ToolAdapter toolAdapter = mock(ToolAdapter.class);
        GraduationAuditResponse auditResponse = new GraduationAuditResponse(
                "2024604757", false, 39, 59, 150, List.of(), List.of(), "REV-1"
        );
        when(toolAdapter.runGraduationAudit(any())).thenReturn(auditResponse);

        DefaultAdvisorFacade facade = new DefaultAdvisorFacade(liveModel, toolAdapter);
        ChatRequest request = new ChatRequest("conv-nl-1", "m còn thiếu bao nhiêu tín chỉ để ra trường?", "2026-11-08T00:00:00Z");

        ChatResponse response = facade.chat(request, context);

        verify(toolAdapter, times(1)).runGraduationAudit(eq(context));
        assertThat(response.getAnswer()).contains("59/150 tín chỉ");
    }

    @Test
    @DisplayName("Colloquial prompt: 'kỳ tới e đăng ký IT6080 đc ko?' triggers check_course_eligibility with IT6080")
    void shouldHandleColloquialCourseEligibilityPrompt() {
        String turn1Response = """
                {
                  "candidates": [
                    {
                      "content": {
                        "parts": [
                          {
                            "functionCall": {
                              "name": "check_course_eligibility",
                              "args": {
                                "course_code": "IT6080",
                                "semester": "2024_2025_2"
                              }
                            }
                          }
                        ],
                        "role": "model"
                      },
                      "finishReason": "STOP"
                    }
                  ]
                }
                """;
        String turn2Response = """
                {
                  "candidates": [
                    {
                      "content": {
                        "parts": [
                          {
                            "text": "Môn học IT6080 (Kiến trúc phần mềm) bạn hoàn toàn đủ điều kiện đăng ký trong học kỳ tới vì đã đạt môn tiên quyết IT6015."
                          }
                        ],
                        "role": "model"
                      },
                      "finishReason": "STOP"
                    }
                  ]
                }
                """;

        AtomicBoolean isTurn1 = new AtomicBoolean(true);
        LiveAdvisorModel liveModel = new LiveAdvisorModel(req -> isTurn1.getAndSet(false) ? turn1Response : turn2Response);
        ToolAdapter toolAdapter = mock(ToolAdapter.class);
        CourseEligibilityResponse eligibilityResponse = new CourseEligibilityResponse(
                "IT6080", true, List.of(), List.of(), "REV-1"
        );
        when(toolAdapter.checkCourseEligibility(any(), eq("IT6080"), any())).thenReturn(eligibilityResponse);

        DefaultAdvisorFacade facade = new DefaultAdvisorFacade(liveModel, toolAdapter);
        ChatRequest request = new ChatRequest("conv-nl-2", "kỳ tới e đăng ký IT6080 đc ko?", "2026-11-08T00:00:00Z");

        ChatResponse response = facade.chat(request, context);

        verify(toolAdapter, times(1)).checkCourseEligibility(eq(context), eq("IT6080"), any());
        assertThat(response.getAnswer()).contains("IT6080");
        assertThat(response.getAnswer()).contains("đủ điều kiện");
    }

    @Test
    @DisplayName("Colloquial prompt: 'quy định cảnh báo học vụ mức 1' triggers search_regulations")
    void shouldHandleRegulationSearchPrompt() {
        String turn1Response = """
                {
                  "candidates": [
                    {
                      "content": {
                        "parts": [
                          {
                            "functionCall": {
                              "name": "search_regulations",
                              "args": {
                                "query": "cảnh báo học vụ mức 1"
                              }
                            }
                          }
                        ],
                        "role": "model"
                      },
                      "finishReason": "STOP"
                    }
                  ]
                }
                """;
        String turn2Response = """
                {
                  "candidates": [
                    {
                      "content": {
                        "parts": [
                          {
                            "text": "Theo Điều 14 quy chế đào tạo tại [REG-HAUI-01], sinh viên bị cảnh báo học vụ mức 1 nếu CPA dưới 1.20."
                          }
                        ],
                        "role": "model"
                      },
                      "finishReason": "STOP"
                    }
                  ]
                }
                """;

        AtomicBoolean isTurn1 = new AtomicBoolean(true);
        LiveAdvisorModel liveModel = new LiveAdvisorModel(req -> isTurn1.getAndSet(false) ? turn1Response : turn2Response);
        ToolAdapter toolAdapter = mock(ToolAdapter.class);
        RagAdvisorService ragService = mock(RagAdvisorService.class);
        ChatSourceItem citation = new ChatSourceItem("REG-HAUI-01", "Quy chế đào tạo", "Điều 14", "2024", "/rules");
        GroundedContext groundedContext = new GroundedContext(
                "cảnh báo học vụ mức 1", List.of(), List.of(citation), "Điều 14: Cảnh báo học vụ mức 1 khi CPA < 1.20", true, List.of()
        );
        when(ragService.retrieveAndGround(anyString(), anyInt(), anyDouble())).thenReturn(groundedContext);

        DefaultAdvisorFacade facade = new DefaultAdvisorFacade(liveModel, toolAdapter, ragService);
        ChatRequest request = new ChatRequest("conv-nl-3", "quy định cảnh báo học vụ mức 1", "2026-11-08T00:00:00Z");

        ChatResponse response = facade.chat(request, context);

        verify(ragService, times(1)).retrieveAndGround(eq("cảnh báo học vụ mức 1"), anyInt(), anyDouble());
        assertThat(response.getAnswer()).contains("[REG-HAUI-01]");
    }

    @Test
    @DisplayName("Chitchat prompt: 'chào bạn' returns direct answer without invoking any tool")
    void shouldHandleDirectChitchatPromptWithoutTools() {
        String directResponse = """
                {
                  "candidates": [
                    {
                      "content": {
                        "parts": [
                          {
                            "text": "Chào bạn! Mình là HaUI Advisor, trợ lý học vụ thông minh của Đại học Công nghiệp Hà Nội. Mình có thể hỗ trợ gì cho bạn hôm nay?"
                          }
                        ],
                        "role": "model"
                      },
                      "finishReason": "STOP"
                    }
                  ]
                }
                """;

        LiveAdvisorModel liveModel = new LiveAdvisorModel(req -> directResponse);
        ToolAdapter toolAdapter = mock(ToolAdapter.class);
        RagAdvisorService ragService = mock(RagAdvisorService.class);

        DefaultAdvisorFacade facade = new DefaultAdvisorFacade(liveModel, toolAdapter, ragService);
        ChatRequest request = new ChatRequest("conv-nl-4", "chào bạn", "2026-11-08T00:00:00Z");

        ChatResponse response = facade.chat(request, context);

        verifyNoInteractions(toolAdapter);
        verifyNoInteractions(ragService);
        assertThat(response.getAnswer()).contains("HaUI Advisor");
    }
}
