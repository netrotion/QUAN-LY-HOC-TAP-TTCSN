# Nghiệm thu response integrity và course grounding — 2026-11-06

## Phạm vi và phiên bản đo

Nhánh `codex/conversational-academic-advisor`, worktree chưa commit, backend cũ ở `localhost:8080` và bản mới ở `localhost:8081` chạy song song để giữ phiên H2 của người dùng. Web thử nghiệm bản mới ở `http://localhost:5174/chat`; web đang mở ở 5173 vẫn trỏ server cũ. Cùng model cấu hình `gemini-3.5-flash-lite`, temperature `0.2`, tài khoản demo `std-warning-real`, 20 lượt/nhánh theo năm hội thoại bốn lượt. Không dùng thời gian giả của UI. CTĐT/quy chế ở local là fixture demo.

## Gate chức năng

| Gate | Bằng chứng | Kết quả |
| --- | --- | --- |
| Gemini multipart/finish reason | `LiveAdvisorModelTest`: 1/2/3 text parts, thought part, `STOP`, `MAX_TOKENS`, `SAFETY`, thiếu candidate/text. 1.000 lần extract cục bộ p95 dưới 5 ms. | Pass. Chỉ nhận text đầy đủ của `STOP`; incomplete thành `MODEL_PROVIDER_ERROR`. |
| Không lưu lỗi provider | `AdvisorChatApiTest.providerErrorIsRetryableAndNothingIsSaved`: 503, không có answer, retry được, không lưu lượt. | Pass. Test này dùng provider fake; không chứng minh mọi biến thể payload Gemini thực. |
| Course grounding | `AcademicSpecV1Test` và `AdvisorChatApiTest`: IT6080 = Lập trình Web bằng Java; tiên quyết `[]`, học trước `[IT6019, IT6020]`; IT6150 = Đồ án chuyên ngành, học trước `[IT6040]`; mã không thuộc CTĐT có metadata null. Follow-up “môn đó” gọi eligibility. | Pass. Cùng `targetCurriculum` với RuleEvaluator, không thêm tool call. |
| UI/runtime | 78 test TV3, build TV2; không còn quick prompt IT6080–Đồ án, runtime mock answer, hay số đo `0.8s`. | Pass. |
| Contract | OpenAPI/DTO/example/generated JS/lock và `node scripts/check-contracts.mjs`. | Pass; `check:contract-consumers` ở chế độ báo cáo còn 23 cảnh báo retired field, chưa xử lý trong đợt này. |
| Guardrail | [Ma trận hai lượt](2026-11-06-guardrail-behavior-matrix.md): PII/Markdown, citation, mã/tên, nhiều CPA; test đỏ–xanh cho nhãn nội bộ và quan hệ học trước bị phủ nhận. | Pass cho ca đã tái hiện; còn lỗ hổng cặp mã/tên khác và lần nhắc CPA thứ hai. |

Lệnh nghiệm thu: `.\mvnw.cmd test` **BUILD SUCCESS** (AI 346 test, 4 skipped; Academic 172; Platform 102), `npm --prefix tv3-planner-ui test` **78/78 pass**, `npm --prefix tv2-web run build` **pass**, `node scripts/check-contracts.mjs` **pass**. Log cục bộ: `full-maven-acceptance.log`, `ui-verified.log`, `web-verified.log`. `LiveAdvisorModelTest` được chạy lại riêng 17/17 sau khi thêm ca 1 part.

## Thực nghiệm live

| Đường | HTTP 200 / 20 | p50 POST | p95 POST | max | Mã/tên sai IT6080 | Câu cụt rõ ràng trong 200 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| JAR cũ 8080 | 19 | 1.329 ms | 3.801 ms | 15.057 ms | 2 câu đầu | 0/19 |
| Bản mới 8081 | 18 | 1.660 ms | 15.007 ms | 15.044 ms | 0 | 0/18 |

Nearest-rank p95 trên n=20 gồm timeout client 15 giây ở bản mới; không dùng chênh lệch này để khẳng định parser làm chậm. Trong 18 phản hồi mới thành công: 0 câu phủ nhận quan hệ IT6020–IT6080, 0 nhãn nội bộ đã đo, 0 câu có cặp mã/tên sai. Hai lượt lỗi là timeout client; không được tính là câu trả lời đạt. Mẫu 20 lượt quá nhỏ để ước lượng lỗi hiếm hay sự khác biệt latency có ý nghĩa thống kê.

Năm hội thoại tổng hợp (mỗi nhóm dùng conversation ID mới, câu theo thứ tự):

1. “Môn IT6080 - Đồ án chuyên ngành cần những môn tiên quyết nào?” → “Vậy môn đó cần học trước môn nào?” → “Mình chưa học IT6020 thì sao?” → “Theo bạn kỳ tới mình nên ưu tiên môn nào?”
2. “Môn IT6150 cần môn học trước nào?” → “Môn đó có tiên quyết không?” → “Nếu không đủ thời gian thì sao?” → “Bạn nghĩ phương án nào hợp lý hơn?”
3. “CPA của mình đang thấp quá, giờ nên làm sao?” → “Mình sợ không tốt nghiệp đúng hạn.” → “Mình đang phân vân giữa học cải thiện và học môn mới.” → “Nhưng nếu mình không đủ thời gian thì sao?”
4. “Theo bạn học kỳ tới mình nên đăng ký bao nhiêu tín?” → “Mình chỉ rảnh khoảng 12 giờ mỗi tuần.” → “Vậy có nên học hè không?” → “Mình nên kiểm tra dữ kiện nào trước khi quyết định?”
5. “Môn IT6080 có đăng ký được không?” → “Môn đó là Đồ án chuyên ngành đúng không?” → “Nếu mình hoàn thành IT6019 thì còn thiếu gì?” → “Tóm lại bước tiếp theo của mình là gì?”

`chat-eval-v1.json` hiện là benchmark đúng **20 canonical cases** chạy với `MockAdvisorModel`; `ChatEvalBenchmarkRunnerTest` kiểm tra `cases.size()==20`. Thêm ca live vào mảng này sẽ làm hỏng benchmark hoặc tạo độ tin cậy giả từ mock. Đợt này giữ benchmark đó nguyên và dùng integration tests cùng bộ 20 lượt live ở trên; không thêm câu trả lời mẫu vào runtime.

Log telemetry bản mới ghi **2 response `STOP` có hai text parts**: `firstTextLength=474`, `totalTextLength=1019` và `firstTextLength=785`, `totalTextLength=1216`. Hai câu trả lời client tương ứng dài **1.019** và **1.216** ký tự, xác nhận phần thứ hai đã tới UI. Không log text, prompt, API key hay mã sinh viên. Với hai lỗi timeout, trạng thái persist của chính các request bị client ngắt chưa được xác minh; gate 503/không lưu đã được kiểm bằng integration test provider error.

Telemetry ghi 26 HTTP attempts tới provider cho 20 lượt, trong đó 20 generation trả 200 và 18 lượt client nhận 200. 6 attempts còn lại là retry/fallback khi provider trả 429/503/404; cơ chế này đã có sẵn, parser và metadata không thêm LLM call trên đường thành công. Tổng `usageMetadata` của 20 generation thành công: **26.977 prompt tokens**, **3.317 output tokens**. JAR cũ không có token telemetry, nên không tính chênh lệch token hoặc tiền API; cũng không coi số attempt này là ước lượng ổn định chi phí dài hạn.

## Giới hạn còn mở

- `ResponseGroundingValidator` còn cho qua câu khẳng định sai cặp mã/tên và lần nhắc CPA thứ hai trong ca tổng hợp. [Việc tiếp theo](../plans/2026-11-06-guardrail-fact-consistency-followup.md) có test/rubric riêng; không gộp một phép thay chữ rộng vào đợt này.
- Guardrail phủ định quan hệ học trước chỉ bắt các cách nói phủ định đã tái hiện; những cách nói khác cần thêm ca đỏ trước khi mở rộng. Khi bắt mâu thuẫn, answer được thay bằng tóm tắt từ cùng Academic Tool, không gọi thêm LLM/RAG.
- Một số câu live vẫn dè dặt nói “cần kiểm tra thêm” dù tool đã có metadata. Đây là giới hạn chất lượng tư vấn còn đo được; không tuyên bố hệ thống đã thành advisor hoàn chỉnh chỉ từ đợt sửa integrity này.
- `generateMockChatResponse` đã bị bỏ khỏi export TV3 vì runtime không được tự sinh dữ liệu học vụ giả; caller bên ngoài monorepo nếu từng dùng helper này phải chuyển sang API thật hoặc tự tiêm fake provider trong test.
- Backend local 8081 dùng H2 demo riêng; restart sẽ xóa hội thoại thử trên cổng đó. Server 8080 và phiên người dùng đang mở không bị restart.
