# Tính đúng và độ tin cậy của HaUI Advisor

## Phạm vi

Áp dụng cho chat thường, chat SSE và What-if. Nguồn quy chế và chương trình đào tạo hiện có là căn cứ cho kiểm thử. Các phép tính học vụ thuộc engine học vụ, còn Gemini diễn giải kết quả.

## 1. Dữ liệu học vụ

Hai đường chat dùng cùng bộ điều phối công cụ Gemini, bao gồm bảng điểm và cây chương trình đào tạo. Tên công cụ trên giao thức Gemini giữ nguyên. Bộ hậu kiểm đọc được kết quả từ cả đường gọi Gemini và đường điều phối hiện có. Kết quả công cụ thiếu hoặc lỗi được ghi nhận rõ ràng. Khi mô phỏng một mã môn có trong chương trình đào tạo, engine lấy số tín chỉ từ chương trình. Môn giả định ngoài chương trình cần số tín chỉ do người dùng cung cấp rõ ràng.

Nghiệm thu bằng ca mô hình trả CPA sai và ca mô phỏng hai môn có số tín chỉ khác nhau. Cùng dữ liệu phải cho cùng kết quả qua chat và What-if.

## 2. Quy chế qua nhiều lượt

Khi câu hỏi nối tiếp tham chiếu quy chế ở lượt trước, dùng câu hỏi trước để bổ sung truy vấn. Truy xuất nguồn cho lượt hiện tại trước khi trả lời, kể cả khi Gemini định trả lời trực tiếp. Thiếu bằng chứng thì báo chưa xác minh được. Câu hỏi chuyển chủ đề không kế thừa nguồn cũ.

Nghiệm thu bằng câu hỏi giới hạn tín chỉ kỳ chính, sau đó hỏi “Kỳ hè thì sao?”. Lượt hai phải trả giới hạn 12 tín chỉ với nguồn của lượt hiện tại.

## 3. Giao thức SSE và lưu hội thoại

SSE phát trạng thái xử lý trong lúc chờ. Nội dung trả lời chỉ được gửi sau khi hậu kiểm. `DONE` xác nhận lượt đã lưu thành công. Nếu lưu lỗi, ghi xung đột hoặc luồng kết thúc thiếu sự kiện kết thúc, UI báo lỗi rõ ràng. Việc gửi lại cùng lượt sau gián đoạn dùng lại định danh của yêu cầu để tránh ghi trùng. Hai lượt gửi độc lập có thể chứa cùng nội dung.

Client hiện tại giữ nguyên `clientTimestamp` khi gửi lại. Server nhận diện lượt đã lưu bằng hội thoại, nội dung và timestamp ISO. Cơ chế này áp dụng cho các lượt còn trong lịch sử. Client cũ có thể tiếp tục gửi yêu cầu thiếu timestamp.

Nghiệm thu bằng mô hình giả lập phát số sai, lỗi lưu, mất `DONE` và gửi lại sau gián đoạn. Lịch sử hội thoại cũ vẫn đọc được.

## 4. Điều kiện trước khi triển khai

Chạy kiểm thử Java, JavaScript, contracts và kiến trúc. Trên môi trường dùng PostgreSQL và Gemini live, kiểm tra luồng web từ đăng nhập đến xem lại lịch sử, hỏi quy chế nhiều lượt, mô phỏng điểm và phản hồi khi quá tải. Ghi rõ cấu hình RAG, bằng chứng trích dẫn và độ trễ đo được. Việc mở cho sinh viên phụ thuộc vào kết quả kiểm chứng trên môi trường triển khai. Khi demo, ghi rõ dữ liệu và mô hình nào được giả lập.

### Kết quả kiểm chứng cục bộ

- Spring Boot và PostgreSQL 16.15 chạy trên loopback, đăng nhập bằng tài khoản demo. Gemini live chạy với cấu hình RAG mặc định dùng embedding `FAKE` và vector store `IN_MEMORY`.
- Hai lượt SSE trả đúng 24 tín chỉ cho kỳ chính và 12 tín chỉ cho kỳ hè, có trích dẫn ở cả hai lượt. Tổng thời gian lần lượt là 20,72 và 17,03 giây.
- Gửi lại cùng lượt trả `TURN_ALREADY_SAVED` trong 0,01 giây. PostgreSQL giữ đúng hai cặp tin nhắn hỏi và đáp. What-if với hai môn 5 và 3 tín chỉ trả GPA 3,63 dù client gửi 1 tín chỉ mỗi môn.
- Các phép đo trên là smoke test bằng HTTP. Cần đo chất lượng truy xuất, tải thực và trải nghiệm trên trình duyệt trong môi trường triển khai trước khi mở cho sinh viên.
