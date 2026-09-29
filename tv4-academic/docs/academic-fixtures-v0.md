# TÀI LIỆU BÀN GIAO TASK 1.3b — FIXTURE VÀ TEST HARNESS HỌC VỤ (TV4)

**Vai trò thực hiện:** TV4 — Academic & Recommendation Tools Engineer  
**Thư mục phụ trách:** `tv4-academic/`  
**Phiên bản:** `0.0.1-v0` (`fixtures-harness-v0`)  
**Đối tượng sử dụng bàn giao:** TV1 (Lead + AI — Task 1.3c), TV5 (Backend/DB/DevOps)

---

## 1. Mục tiêu và phạm vi Task 1.3b

Task 1.3b cung cấp nền tảng dữ liệu mẫu (fixtures) và bộ khung kiểm thử (test harness) chuẩn mực cho toàn bộ các phép toán, quy tắc học vụ của hệ thống HaUI Advisor:
1. **Tuân thủ ranh giới sở hữu (Ownership Boundary):** Toàn bộ mã nguồn, cấu hình và fixtures được tạo lập duy nhất trong thư mục `tv4-academic/`. Không chỉnh sửa bất kỳ file nào thuộc quyền sở hữu của các vai trò khác (`tv1-ai`, `tv2-web`, `tv3-planner-ui`, `tv5-platform`) hoặc gốc repository.
2. **Quy chuẩn dữ liệu quy chế:** Toàn bộ quy tắc, ngưỡng điểm và trọng số thuật toán trích xuất từ PRD mang nhãn `"status": "DEMO_UNVERIFIED"` nhằm phản ánh đúng tính chất demo chưa kiểm chứng chính thức với nhà trường.
3. **Ràng buộc xử lý missing data nghiêm ngặt:** Đối với dữ liệu thiếu hoặc chưa rõ ràng (`null`, `UNKNOWN`), hệ thống **TUYỆT ĐỐI KHÔNG** tự động gán điểm = `0.0` hoặc mặc định đánh giá là "Đã đạt".
4. **Không phụ thuộc ngoại lai:** Thư viện Java thuần túy, không sử dụng Spring Data/JPA/PostgreSQL, không gọi HTTP API, không tích hợp LLM/AI SDK.

---

## 2. Danh mục Fixtures V0

Các fixtures được lưu trữ đồng thời tại `tv4-academic/fixtures/` và `tv4-academic/src/main/resources/fixtures/`:

| Fixture File | Mục đích và mô tả dữ liệu | Trạng thái kiểm chứng |
|---|---|---|
| `policy-demo.json` | Chứa quy định thang điểm 4 (A..F), hạn mức tín chỉ (10-24 TC kỳ chính, 12 TC kỳ hè), ngưỡng cảnh báo học vụ (CPA < 1.20 năm 1, < 1.40 năm 2, < 1.60 năm 3), quy tắc học cải thiện (D, D+, C), điều kiện tốt nghiệp (135 TC, CPA >= 2.00, chuẩn đầu ra phi tín chỉ) và trọng số thuật toán xếp lịch (40% mở khóa tiên quyết, 25% tiến độ CTĐT, 20% ROI CPA, 15% cân bằng tải). | `DEMO_UNVERIFIED` (bắt buộc cho toàn bộ 100% mục) |
| `curriculum-it-v0.json` | Chương trình đào tạo ngành Công nghệ Thông tin (135 tín chỉ) chia thành 4 khối kiến thức: Đại cương, Cơ sở ngành, Chuyên ngành, Đồ án tốt nghiệp; cùng quan hệ tiên quyết chi tiết (`MATH1002` là tiên quyết của `IT6001`, `IT6002`; `IT1001` là tiên quyết của `IT2001`,...). | `DEMO_UNVERIFIED` |
| `student-profiles-v0.json` | 4 bộ hồ sơ sinh viên mẫu đại diện cho các kịch bản học vụ cốt lõi: <br>• `std-2026-001`: Sinh viên năm 2 bị cảnh báo học vụ mức 1 do nợ môn Toán rời rạc (F), CPA 2.45, GPA kỳ hiện tại là `null`. <br>• `std-2026-002`: Sinh viên tiến độ chuẩn, CPA 3.25, không nợ môn, học lực bình thường (NORMAL). <br>• `std-2026-003`: Sinh viên năm 4 gần tốt nghiệp (112/135 TC), đã có TOEIC 550, còn nợ chứng chỉ MOS Tin học. <br>• `std-2026-missing`: Sinh viên có dữ liệu chưa kết chuyển điểm (GPA=null, CPA=null, điểm môn học mang giá trị `null` hoặc `UNKNOWN`). | `DEMO_UNVERIFIED` |

---

## 3. Kiến trúc Harness và các Engine triển khai

```text
tv4-academic/
├── fixtures/
│   ├── policy-demo.json
│   ├── curriculum-it-v0.json
│   └── student-profiles-v0.json
├── src/main/
│   ├── java/vn/haui/advisor/academic/
│   │   ├── engine/
│   │   │   ├── GradeCalculator.java       # Tính điểm GPA/CPA bằng BigDecimal, scale 2, RoundingMode.HALF_UP; xử lý an toàn null/UNKNOWN
│   │   │   └── RuleEvaluator.java         # Đánh giá môn tiên quyết, giới hạn tải tín chỉ, rủi ro học vụ và checklist audit
│   │   ├── fixture/
│   │   │   ├── AcademicFixtureLoader.java # Tiện ích nạp JSON từ classpath/filesystem
│   │   │   └── AcademicFixtures.java      # Singleton truy xuất fixtures đã nạp
│   │   ├── model/
│   │   │   ├── PolicyDemo.java            # POJO mapping quy chế và trọng số
│   │   │   ├── CurriculumFixture.java     # POJO mapping CTĐT
│   │   │   └── StudentProfileFixture.java # POJO mapping hồ sơ sinh viên
│   │   └── service/
│   │       └── DefaultAcademicFacade.java # Triển khai thuần Java của interface AcademicFacade (9 capability)
│   └── resources/fixtures/                # Bản sao classpath của các fixtures JSON
└── src/test/java/vn/haui/advisor/academic/
    ├── AcademicFacadeHarnessTest.java     # Kiểm thử toàn diện 9 phương thức của AcademicFacade
    ├── MissingDataStrictnessTest.java     # Kiểm thử nghiêm ngặt tính an toàn khi thiếu dữ liệu (Missing/Unknown)
    ├── PolicyDemoVerificationTest.java    # Xác minh 100% nhãn DEMO_UNVERIFIED và tổng trọng số 100%
    └── AcademicFixturesSchemaTest.java    # Xác minh tính toàn vẹn của schema dữ liệu mẫu
```

---

## 4. Kết quả kiểm thử (Test Harness Execution)

Toàn bộ các test suite đã được thực thi và vượt qua 100%:

```text
[INFO] Running vn.haui.advisor.academic.AcademicFacadeHarnessTest
[INFO] Tests run: 11, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running vn.haui.advisor.academic.MissingDataStrictnessTest
[INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running vn.haui.advisor.academic.PolicyDemoVerificationTest
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running vn.haui.advisor.academic.AcademicFixturesSchemaTest
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running vn.haui.advisor.academic.AcademicModulePlaceholderTest
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS (Total tests: 20, Failures: 0, Errors: 0)
```

### Các bảo đảm kỹ thuật được xác minh qua Test:
1. `GPA/CPA` khi chưa có dữ liệu luôn trả về `null`, không bao giờ âm thầm gán thành `0.0`.
2. Môn học tiên quyết có điểm là `null` hoặc `UNKNOWN` sẽ khiến sinh viên không đủ điều kiện đăng ký (`isEligible() == false`) và kèm cảnh báo rõ ràng; không bao giờ mặc định là "Đã đạt".
3. Chứng chỉ tốt nghiệp chưa nộp hoặc `UNKNOWN` được biểu diễn thành `AuditCertificateAction` cần hoàn thành (action), tuyệt đối không biến thành môn có tín chỉ học phần.
4. Trọng số PRD §13.1 được cấu hình chính xác: 40% (môn nợ tiên quyết), 25% (tiến độ CTĐT), 20% (học cải thiện ROI), 15% (cân bằng tải).

---

## 5. Hướng dẫn sử dụng cho TV1 và TV5

### Dành cho TV1 (Lead + AI — Task 1.3c):
TV1 có thể khởi tạo trực tiếp `DefaultAcademicFacade` để làm engine tính toán thật hoặc stub tool adapter:
```java
AcademicFacade academicFacade = new DefaultAcademicFacade();
AcademicStatusResponse status = academicFacade.getAcademicStatus(new AcademicStatusRequest("std-2026-001", "rev-1001"));
```

### Dành cho TV5 (Backend/Platform):
TV5 có thể sử dụng trực tiếp các file JSON trong `tv4-academic/fixtures/` làm nguồn seed dữ liệu cho Database hoặc đăng ký `DefaultAcademicFacade` vào Spring application context làm Service Bean.
