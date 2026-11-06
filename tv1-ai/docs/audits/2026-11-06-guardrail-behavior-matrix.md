# Ma trận guardrail hai lượt — 2026-11-06

Test tái hiện: `ResponseGroundingValidatorTest.diagnosticTwoPassMatrixRecordsWhatTheCurrentGuardrailActuallyChanges`, dữ liệu tổng hợp; sau ba ca bổ sung, chạy 22/22 test pass. Đường live gọi `validate()` tại [LiveAdvisorModel.java](../../src/main/java/vn/haui/advisor/ai/model/LiveAdvisorModel.java) rồi gọi lần nữa tại [DefaultAdvisorFacade.java](../../src/main/java/vn/haui/advisor/ai/service/DefaultAdvisorFacade.java).

| Ca | Raw → validate lần 1 | Lần 2 | Source / PII / Markdown |
| --- | --- | --- | --- |
| Lời tư vấn không citation | Giữ nguyên | Giữ nguyên | Không nguồn; Markdown giữ nguyên |
| Mã sinh viên không được hỏi | Xóa mã, giữ đoạn tư vấn | Không đổi | 0 rò mã trong ca test; list giữ nguyên |
| Citation đã có evidence | Giữ citation và câu | Giữ nguyên | 1 source hợp lệ |
| Citation không có evidence | Thay toàn bộ câu bằng fallback an toàn | Không đổi | 0 source; phần lời khuyên hữu ích cũng mất |
| `IT6080` gắn sai tên `Đồ án chuyên ngành` | Giữ nguyên dù tool có `courseName=Lập trình Web bằng Java` | Không đổi | Cặp mã/tên sai lọt qua; `validateCourseCodes` chỉ kiểm tra mã |
| Hai lần nhắc CPA sai trong Markdown | Sửa lần đầu về số engine, giữ lần thứ hai sai | Không đổi | Cấu trúc list giữ; numerical integrity dùng `Matcher.find()` một lần |

**Kết luận đã chứng minh:** double validation là idempotent ở sáu ca trên, nên không giải thích câu cụt; nguồn không neo có thể làm mất cả câu, và guardrail hiện không bảo đảm cặp mã/tên hay mọi lần nhắc CPA. Đây là khoảng trống bảo vệ dữ kiện, không phải bằng chứng nó gây ra hai câu cụt đã lưu trước đây. Xem [ResponseGroundingValidator.java](../../src/main/java/vn/haui/advisor/ai/grounding/ResponseGroundingValidator.java) tại `containsUnsupportedPolicyId`, `validateCourseCodes`, `enforceNumericalIntegrity`.

**Quyết định:** Giữ fail-closed đối với citation không có nguồn vì chỉ bỏ mã nguồn có thể để lại khẳng định quy chế sai. Giữ PII redaction. Mẫu live sau sửa đã lộ nhãn nội bộ `[academic_tool_results]` và các tên trường trong ngoặc; thêm test đỏ rồi xóa đúng các nhãn quan sát được khỏi answer, giữ Markdown và idempotence. Prompt cũng yêu cầu diễn giải thành lời thay vì nhắc tên trường. Một mẫu live khác phủ nhận sai IT6020 thuộc quan hệ học trước; test đỏ cho phát biểu mâu thuẫn và câu phủ định hợp lệ, rồi guardrail chỉ thay câu mâu thuẫn bằng tóm tắt từ cùng Academic Tool (không gọi thêm model). [Việc guardrail tiếp theo](../plans/2026-11-06-guardrail-fact-consistency-followup.md) xử lý cặp mã/tên, nhiều lần nhắc CPA và các cách nói phủ định quan hệ chưa được đo. Ma trận này không chứng minh tần suất lỗi trên lưu lượng thực.
