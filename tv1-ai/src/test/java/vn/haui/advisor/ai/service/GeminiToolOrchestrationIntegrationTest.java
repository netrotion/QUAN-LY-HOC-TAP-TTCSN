package vn.haui.advisor.ai.service;

import org.junit.jupiter.api.Test;
import vn.haui.advisor.ai.model.LiveAdvisorModel;
import vn.haui.advisor.ai.rag.service.GroundedContext;
import vn.haui.advisor.ai.rag.service.RagAdvisorService;
import vn.haui.advisor.ai.tools.ToolAdapter;
import vn.haui.advisor.contracts.dto.*;

import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class GeminiToolOrchestrationIntegrationTest {

    @Test
    void shouldOrchestrateGraduationAuditViaNativeFunctionCalling() {
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
                            "text": "Bạn đã tích lũy được 59/150 tín chỉ và còn thiếu 91 tín chỉ."
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
        LiveAdvisorModel liveModel = new LiveAdvisorModel(req -> {
            if (isTurn1.getAndSet(false)) {
                return turn1Response;
            }
            return turn2Response;
        });

        ToolAdapter toolAdapter = mock(ToolAdapter.class);
        GraduationAuditResponse auditResponse = new GraduationAuditResponse(
                "2024604757", false, 39, 59, 150, List.of(), List.of(), "REV-1"
        );
        when(toolAdapter.runGraduationAudit(any())).thenReturn(auditResponse);

        DefaultAdvisorFacade facade = new DefaultAdvisorFacade(liveModel, toolAdapter);
        TrustedStudentContext context = new TrustedStudentContext("2024604757", "SV001", "Nguyễn Văn A", "KTPM", "K19", "REV-1");
        ChatRequest request = new ChatRequest("conv-1", "m còn thiếu bao nhiêu tín chỉ để ra trường?", "2026-11-08T00:00:00Z");

        ChatResponse response = facade.chat(request, context);

        verify(toolAdapter, times(1)).runGraduationAudit(any());
        assertThat(response.getAnswer()).contains("59/150 tín chỉ");
    }

    @Test
    void shouldOrchestrateRegulationSearchViaNativeFunctionCalling() {
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
                            "text": "Theo quy định tại [REG-HAUI-01], cảnh báo học vụ mức 1 áp dụng khi điểm CPA dưới 1.20."
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
        LiveAdvisorModel liveModel = new LiveAdvisorModel(req -> {
            if (isTurn1.getAndSet(false)) {
                return turn1Response;
            }
            return turn2Response;
        });

        ToolAdapter toolAdapter = mock(ToolAdapter.class);
        RagAdvisorService ragService = mock(RagAdvisorService.class);
        ChatSourceItem citation = new ChatSourceItem("REG-HAUI-01", "Quy chế đào tạo", "Điều 14", "2024", "/rules");
        GroundedContext groundedContext = new GroundedContext(
                "cảnh báo học vụ mức 1", List.of(), List.of(citation), "Điều 14: Cảnh báo học vụ", true, List.of()
        );
        when(ragService.retrieveAndGround(anyString(), anyInt(), anyDouble())).thenReturn(groundedContext);

        DefaultAdvisorFacade facade = new DefaultAdvisorFacade(liveModel, toolAdapter, ragService);
        TrustedStudentContext context = new TrustedStudentContext("2024604757", "SV001", "Nguyễn Văn A", "KTPM", "K19", "REV-1");
        ChatRequest request = new ChatRequest("conv-1", "quy định cảnh báo học vụ mức 1", "2026-11-08T00:00:00Z");

        ChatResponse response = facade.chat(request, context);

        verify(ragService, times(1)).retrieveAndGround(eq("cảnh báo học vụ mức 1"), anyInt(), anyDouble());
        assertThat(response.getAnswer()).contains("[REG-HAUI-01]");
    }

    @Test
    void shouldEnforceToolBudgetWhenGeminiRequestsMoreThanThreeTools() {
        String turn1Response = """
                {
                  "candidates": [
                    {
                      "content": {
                        "parts": [
                          { "functionCall": { "name": "get_academic_status", "args": {} } },
                          { "functionCall": { "name": "run_graduation_audit", "args": {} } },
                          { "functionCall": { "name": "rank_retake_courses", "args": {} } },
                          { "functionCall": { "name": "check_course_eligibility", "args": { "course_code": "IT6080" } } }
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
                          { "text": "Tổng hợp kết quả học vụ cho bạn." }
                        ],
                        "role": "model"
                      },
                      "finishReason": "STOP"
                    }
                  ]
                }
                """;

        AtomicBoolean isTurn1 = new AtomicBoolean(true);
        LiveAdvisorModel liveModel = new LiveAdvisorModel(req -> {
            if (isTurn1.getAndSet(false)) {
                return turn1Response;
            }
            return turn2Response;
        });

        ToolAdapter toolAdapter = mock(ToolAdapter.class);
        DefaultAdvisorFacade facade = new DefaultAdvisorFacade(liveModel, toolAdapter);
        TrustedStudentContext context = new TrustedStudentContext("2024604757", "SV001", "Nguyễn Văn A", "KTPM", "K19", "REV-1");
        ChatRequest request = new ChatRequest("conv-1", "tổng hợp tình hình học tập và môn IT6080", "2026-11-08T00:00:00Z");

        facade.chat(request, context);

        // First 3 should be called, 4th (checkCourseEligibility) should NOT be called due to budget limit = 3
        verify(toolAdapter, times(1)).getAcademicStatus(any());
        verify(toolAdapter, times(1)).runGraduationAudit(any());
        verify(toolAdapter, times(1)).rankRetakeCourses(any(), any());
        verify(toolAdapter, never()).checkCourseEligibility(any(), any(), any());
    }
}
