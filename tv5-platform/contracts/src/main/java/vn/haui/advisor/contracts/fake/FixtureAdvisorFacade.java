package vn.haui.advisor.contracts.fake;

import vn.haui.advisor.contracts.dto.ChatRequest;
import vn.haui.advisor.contracts.dto.ChatResponse;
import vn.haui.advisor.contracts.dto.TrustedStudentContext;
import vn.haui.advisor.contracts.ports.AdvisorFacade;

/**
 * AdvisorFacade giả lập trả chat-response fixture; dùng cho platform/FE khi chưa ghép module AI.
 */
public class FixtureAdvisorFacade implements AdvisorFacade {

    @Override
    public ChatResponse chat(ChatRequest request, TrustedStudentContext context) {
        return ContractFixtures.load("chat-response.sample.json", ChatResponse.class);
    }
}
