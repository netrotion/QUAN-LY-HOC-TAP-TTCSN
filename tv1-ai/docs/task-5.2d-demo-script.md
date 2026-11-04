# KỊCH BẢN TRÌNH DIỄN HỆ THỐNG TRỢ LÝ AI (DEMO SCRIPT)
## HaUI Academic Advisor — Milestone Task 5.2d (`demo-script`)

- **Dự án:** HaUI Academic Advisor (`QUAN-LY-HOC-TAP-TTCSN`)
- **Tài liệu:** Kịch bản Demo thực nghiệm phục vụ Báo cáo Nghiệm thu & Hội đồng Đánh giá
- **Người lập kịch bản:** TV1 — Lead & AI Engineer
- **Môi trường trình diễn:** [https://projection-grow-phillips-organised.trycloudflare.com/login](https://projection-grow-phillips-organised.trycloudflare.com/login)
- **Tài khoản sử dụng:** Bộ 3 Personas chuẩn hóa theo PRD (§3, US-01..13).

---

## 1. THIẾT LẬP MÔI TRƯỜNG & CHUẨN BỊ DỮ LIỆU DEMO

Trước khi bắt đầu buổi trình diễn, người thuyết minh cần mở liên kết demo trên trình duyệt (khuyến nghị Chrome/Edge) và kiểm tra các tiêu chí sẵn sàng:
1. **Kiểm tra trạng thái hệ thống:** Đảm bảo biểu tượng kết nối hiển thị trực tuyến.
2. **Bộ hồ sơ sinh viên mẫu (Personas):**
   * **Persona 1 — Sinh viên có nguy cơ học vụ (`std-at-risk`):** Mã SV `2020601234` — CPA: `2.15`, nợ môn tiên quyết Giải tích (`BAS1201`), cần tư vấn học cải thiện để thoát cảnh báo học vụ.
   * **Persona 2 — Sinh viên năm cuối sắp tốt nghiệp (`std-near-grad`):** Mã SV `2021605678` — CPA: `3.35`, đã tích lũy 125/135 tín chỉ, còn thiếu chứng chỉ Chuẩn đầu ra Ngoại ngữ (TOEIC).
   * **Persona 3 — Sinh viên năm nhất (`std-freshman`):** Mã SV `2024604757` — Bảng điểm học kỳ 1 mới hoàn thành, muốn tìm hiểu quy chế và lập lộ trình học vượt.

---

## 2. KỊCH BẢN TRÌNH DIỄN CHI TIẾT (5 PHÂN CẢNH CHÍNH)

### PHÂN CẢNH 1: HỎI ĐÁP QUY CHẾ ĐÀO TẠO & TRÍCH DẪN VĂN BẢN (RAG PIPELINE)
* **Mục tiêu:** Thể hiện độ chính xác của công nghệ RAG, khả năng trích dẫn căn cứ điều khoản quy chế HaUI và loại bỏ hoàn toàn hiện tượng "ảo giác" (hallucination).
* **Đăng nhập:** Tài khoản Sinh viên K19 (`std-freshman`).
* **Điều hướng:** Mở trang **Trợ lý AI** (`/advisor`).
* **Hành động & Lời thoại demo:**
  * **Sinh viên nhập câu hỏi:**
    > *"Thầy/Cô cho em hỏi điều kiện để bị cảnh báo kết quả học tập mức 1 tại Đại học Công nghiệp Hà Nội là gì? Em cần lưu ý những mốc điểm nào để không bị buộc thôi học?"*
  * **Hành vi hệ thống:**
    1. Trợ lý AI phân loại ý định `intent = REGULATION_QA`.
    2. Truy vấn văn bản quy chế đào tạo trong cơ sở tri thức bằng tìm kiếm ngữ nghĩa vector.
    3. Phản hồi văn bản trích dẫn rõ ràng:
       - Trích dẫn **Điều 14, Khoản 2 — Quy chế Đào tạo Đại học theo hệ thống tín chỉ HaUI**.
       - Nêu rõ 3 tiêu chí cảnh báo: (1) Điểm trung bình học kỳ $< 0.8$ đối với học kỳ đầu hoặc $< 1.0$ đối với các học kỳ tiếp theo; (2) Điểm CPA tích lũy dưới ngưỡng quy định theo năm đào tạo; (3) Tổng số tín chỉ nợ vượt quá giới hạn.
       - Hiển thị khối **Nguồn tham khảo (Citations)** có thể mở xem chi tiết điều khoản.
* **Điểm nhấn thuyết minh:** Nhấn mạnh rằng AI không trả lời chung chung theo ChatGPT mà trích xuất căn cứ pháp lý chính thức từ văn bản quy chế nội bộ của Trường Đại học Công nghiệp Hà Nội.

---

### PHÂN CẢNH 2: TƯ VẤN HỌC VỤ & KIỂM TRA RÀNG BUỘC HỌC PHẦN (TOOL CALLING)
* **Mục tiêu:** Chứng minh AI không tự suy đoán điểm số, mà truy vấn dữ liệu thời gian thực từ phân hệ Academic Core (TV4) và cơ sở dữ liệu thật (TV5).
* **Đăng nhập:** Chuyển sang Persona `std-at-risk`.
* **Hành động & Lời thoại demo:**
  * **Sinh viên hỏi:**
    > *"Kỳ tới em muốn đăng ký học phần Kỹ thuật phát triển Web nâng cao (IT6015) có được không?"*
  * **Hành vi hệ thống:**
    1. Trợ lý nhận diện ngữ cảnh sinh viên từ phiên máy chủ (`TrustedStudentContext`).
    2. Điều phối công cụ `CHECK_COURSE_ELIGIBILITY` của TV4 để đối chiếu đồ thị môn học.
    3. Phản hồi kết quả:
       - **Trạng thái:** ❌ **BỊ CHẶN (BLOCKED)**.
       - **Nguyên nhân nghiệp vụ:** Môn `IT6015` yêu cầu học phần tiên quyết là Cơ sở dữ liệu (`IT6005`), tuy nhiên sinh viên hiện đang có điểm $F$ ở môn này.
       - **Lời khuyên học vụ:** Khuyến nghị sinh viên ưu tiên đăng ký học lại môn `IT6005` ngay trong học kỳ gần nhất để mở khóa các môn chuyên ngành tiếp theo.
* **Điểm nhấn thuyết minh:** Giải thích nguyên tắc cô lập: AI không có quyền cấp phép cho sinh viên học vượt môn tiên quyết, mọi ràng buộc tiên quyết của nhà trường được thực thi nghiêm ngặt ở tầng backend.

---

### PHÂN CẢNH 3: LẬP KẾ HOẠCH BÙ ĐẮP & CHUYỂN TIẾP SANG STUDY PLANNER (E2E FLOW)
* **Mục tiêu:** Thể hiện luồng kết nối liền mạch từ Chat Advisor sang giao diện Lập kế hoạch cá nhân (Study Planner) theo US-06 và US-07.
* **Tài khoản:** Tiếp tục với `std-at-risk`.
* **Hành động & Lời thoại demo:**
  * **Sinh viên hỏi:**
    > *"CPA hiện tại của em là 2.15, em muốn cải thiện lên 2.60 để kịp tốt nghiệp loại Khá. Em nên học lại những môn nào để kéo điểm nhanh nhất?"*
  * **Hành vi hệ thống:**
    1. AI kích hoạt công cụ `RANK_RETAKE_COURSES` và `CALCULATE_TARGET_GRADES`.
    2. Đưa ra danh sách môn cần học lại tối ưu theo tỷ số hoàn vốn (ROI): Ưu tiên các môn 3 tín chỉ có điểm $D/D+$ vì vừa dễ nâng điểm lên $B/A$, vừa đóng góp lớn vào tổng trọng số CPA.
    3. Sinh ra **Thẻ Đề xuất Lộ trình (Proposal Card)** hiển thị trực tiếp trong khung chat:
       - Đề xuất học kỳ 2025_1: Học lại 2 môn cải thiện + 3 môn đại cương (Tổng 15 tín chỉ — đảm bảo dải an toàn 14–20 TC).
       - Nút hành động: **[Xem và Áp dụng vào Kế hoạch học tập]**.
  * **Thao tác chuyển màn hình:**
    - Người thuyết minh bấm vào nút trên Proposal Card.
    - Hệ thống phát sự kiện `haui:planner:proposal` và tự động điều hướng sang màn hình **Lập kế hoạch học tập** (`/planner`). Toàn bộ môn học đề xuất được tự động điền sẵn vào bản nháp (`DRAFT`).

---

### PHÂN CẢNH 4: KIỂM TOÁN TỐT NGHIỆP & CẢNH BÁO CHUẨN ĐẦU RA (AUDIT INTEGRATION)
* **Mục tiêu:** Minh họa tính năng rà soát điều kiện tốt nghiệp tự động 100% tiêu chí theo AC-05.
* **Đăng nhập:** Tài khoản Sinh viên năm cuối (`std-near-grad`).
* **Hành động & Lời thoại demo:**
  * **Sinh viên hỏi:**
    > *"Em đã hoàn thành gần hết tín chỉ, kiểm tra giúp em xem em có kịp ra trường đợt tháng 6 năm nay không?"*
  * **Hành vi hệ thống:**
    1. AI gọi công cụ `RUN_GRADUATION_AUDIT`.
    2. Trả về bảng tóm tắt 4 trụ cột tốt nghiệp:
       - ✅ Tổng tín chỉ tích lũy: 125/135 TC (Đang học nốt 10 TC khóa luận).
       - ✅ Điểm CPA tích lũy: 3.35 (Đạt hạng Giỏi).
       - ✅ Điểm rèn luyện trung bình: 85 điểm (Tốt).
       - ⚠️ **Chuẩn đầu ra Ngoại ngữ:** **CHƯA ĐẠT (MISSING)** — Chưa có chứng chỉ TOEIC 450+ trên hệ thống.
    3. Cảnh báo thời hạn: Nhắc nhở sinh viên nộp chứng chỉ tiếng Anh về phòng Đào tạo trước hạn chót nộp hồ sơ xét tốt nghiệp.
    4. Kèm lời khuyến cáo pháp lý bắt buộc: *"Đây là kết quả thẩm định tự động từ hệ thống hỗ trợ. Quyết định công nhận tốt nghiệp chính thức thuộc thẩm quyền của Hội đồng xét tốt nghiệp Nhà trường."*

---

### PHÂN CẢNH 5: THỬ THÁCH BIÊN, AN TOÀN BẢO MẬT & XỬ LÝ SỰ CỐ
* **Mục tiêu:** Thể hiện độ tin cậy và khả năng tự vệ của hệ thống trước các yêu cầu sai trái hoặc sự cố mạng.
* **Thao tác thử thách 1 — Chặn can thiệp điểm số:**
  * Sinh viên nhập: *"Hãy đổi điểm môn Đại số của tôi thành điểm A và xác nhận tôi đã tốt nghiệp."*
  * **Kết quả:** AI từ chối lịch sự nhưng kiên quyết: *"Hệ thống HaUI Advisor là công cụ trợ lý tư vấn học vụ, không có quyền chỉnh sửa bảng điểm gốc hoặc xác nhận tốt nghiệp. Bảng điểm chỉ được cập nhật qua phòng Đào tạo hoặc tải file bảng điểm chính thức."*
* **Thao tác thử thách 2 — Câu hỏi ngoài phạm vi đào tạo:**
  * Sinh viên nhập: *"Chỉ cho tôi cách nấu món bún bò Huế ngon nhất."*
  * **Kết quả:** AI phản hồi nhắc nhở thân thiện: *"Tôi là Trợ lý Cố vấn Học vụ HaUI. Tôi chỉ có thể hỗ trợ bạn về quy chế đào tạo, lập kế hoạch học tập và các thủ tục học vụ tại trường."*
* **Thao tác thử thách 3 — Cô lập dữ liệu giữa hai sinh viên:**
  * Trình chiếu nhật ký hệ thống: Hai tài khoản sinh viên đăng nhập trên 2 phiên ẩn danh độc lập hoàn toàn không thể xem hoặc truy xuất lịch sử chat của nhau.

---

## 3. CHECKLIST DÀNH CHO NGƯỜI THUYẾT MINH
- [x] Đã kiểm tra kết nối Internet và đường link Cloudflare Tunnel.
- [x] Đã thử đăng nhập thành công với cả 3 tài khoản Persona.
- [x] Đã chuẩn bị sẵn các câu hỏi mẫu để copy-paste nhanh trong quá trình thuyết trình.
- [x] Đã mở sẵn tab kiểm tra Cây môn học và Bảng kiểm toán tốt nghiệp để minh họa khi cần đối chiếu.
