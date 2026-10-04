# BÁO CÁO KỸ THUẬT: ĐẶC TẢ HỌC VỤ CHẠY ĐƯỢC BẰNG TEST (ACADEMIC SPEC V1)

> **Người thực hiện:** Thành viên 4 (TV4 — Academic & Recommendation Tools Engineer)  
> **Nhiệm vụ:** Task 2.2c — Viết đặc tả công cụ chạy được bằng test (Academic Spec V1)  
> **Module phụ trách:** `tv4-academic` (Maven module: `haui-academic`)  
> **Bộ dữ liệu thực áp dụng:** Chương trình đào tạo KTPM HaUI (CT1085 - 150 tín chỉ, 120 học phần) & Hồ sơ sinh viên mẫu thực `2024604757`

---

## 1. Mục tiêu và Nguyên tắc Thiết kế

Academic Spec V1 là bộ đặc tả học vụ hoàn chỉnh và có khả năng chạy kiểm thử tự động (Executable Specifications) bằng Java thuần và JUnit 5 cho interface `AcademicFacade`, kết nối trực tiếp với dữ liệu thực từ `data-source/academic-data` và schema hợp đồng `tv5-platform/contracts`.

### 4 Nguyên tắc cốt lõi:
1. **Tách biệt tuyệt đối Ràng buộc cứng (Hard Constraints) và Thang điểm tối ưu (Scoring 40/25/20/15):**
   - **Giai đoạn 1 (Lọc cứng):** Loại bỏ ngay lập tức các môn học vi phạm tiên quyết (Prerequisites), môn học trước (Prior Courses), điều kiện tối thiểu làm đồ án tốt nghiệp ($\ge 85\%$ CTĐT), hoặc vi phạm hạn mức tín chỉ.
   - **Giai đoạn 2 (Chấm điểm tối ưu):** Chỉ áp dụng thang điểm 40/25/20/15 trên tập các môn đã vượt qua Giai đoạn 1.
2. **Kịch bản thực tế phong phú:**
   - Điều kiện học kỳ tương lai (Chained Prerequisites): Giả định môn kỳ $N$ đạt để mở khóa môn kỳ $N+1$.
   - Kế hoạch học vượt (Accelerated Plan): Tối đa 24 tín chỉ/kỳ chính.
   - Học kỳ hè (Summer Semester): Tối đa 12 tín chỉ (REG-HAUI-04).
   - Sinh viên bị cảnh báo học tập: Ràng buộc cứng tối đa 14 tín chỉ/kỳ (REG-HAUI-02).
3. **Chính sách dữ liệu thiếu (Missing Data Strictness):**
   - Bất kỳ trường dữ liệu điểm, GPA, CPA bị thiếu hoặc chưa kết chuyển đều giữ nguyên `null` hoặc gán nhãn `UNKNOWN`.
   - **Tuyệt đối không** tự động gán điểm = 0 hoặc mặc định đánh giá là "Đã đạt".
4. **Minh bạch quy chế:**
   - Toàn bộ các quy tắc, ngưỡng học vụ hoặc công thức chưa đối chiếu văn bản gốc HaUI đều gắn nhãn `"status": "DEMO_UNVERIFIED"`.

---

## 2. Bảng đặc tả 9 Capabilities của AcademicFacade

| # | Capability | Đầu vào (Input) | Đầu ra (Output) | Ràng buộc cứng / Thang điểm | Xử lý Missing Data | File Test tương ứng |
|---|---|---|---|---|---|---|
| **1** | `getAcademicStatus` | `studentId`, `dataRevision` | `AcademicStatusResponse`: GPA, CPA, Tín chỉ tích lũy, Mức rủi ro, Cảnh báo | - CPA < 1.20 (N1), < 1.40 (N2), < 1.60 (N3), < 1.80 (N4+) -> Warning<br>- Nợ > 24 TC -> Warning | GPA/CPA chưa có giữ `null`, không gán = 0. Tín chỉ chưa có giữ `null` | `AcademicSpecV1Test.Capability1AcademicStatusSpec` |
| **2** | `checkCourseEligibility` | `studentId`, `courseCode`, `targetSemester` | `CourseEligibilityResponse`: `eligible` (boolean), `missingPrerequisites`, `warnings` | - Môn tiên quyết: Phải học và ĐẠT<br>- Môn học trước: Phải từng học (attempted)<br>- Khóa luận tốt nghiệp: $\ge 128$ TC ($\ge 85\%$) | Môn tiên quyết có kết quả `null` -> Trả về `eligible = false`, ghi nhận `UNKNOWN` | `AcademicSpecV1Test.Capability2CourseEligibilitySpec` |
| **3** | `generateStudyPlan` | `studentId`, `targetGraduationSemester`, `targetCpa`, `maxCreditsPerSemester`, `includeSummerSemesters` | `GenerateStudyPlanResponse`: Danh sách kỳ học (`semesters`), CPA dự kiến, cảnh báo | - Lọc Hard Constraints trước<br>- Cảnh báo: Capped 14 TC<br>- Kỳ hè: Capped 12 TC<br>- Scoring: 40% Unblock, 25% CTĐT, 20% ROI retake, 15% Workload | Môn chưa rõ tiên quyết bị loại khỏi danh sách lập lịch | `AcademicSpecV1Test.Capability3GenerateStudyPlanSpec` |
| **4** | `validateStudyPlan` | `studentId`, `planId`, danh sách `semesters` | `ValidateStudyPlanResponse`: `valid` (boolean), `status`, `violations`, `warnings` | - Kỳ chính: 10 - 24 TC<br>- Kỳ hè: $\le 12$ TC<br>- Sinh viên cảnh báo: $\le 14$ TC<br>- Kỳ tốt nghiệp: $\ge 1$ TC | Không có dữ liệu kỳ học -> Báo vi phạm | `AcademicSpecV1Test.Capability4ValidateStudyPlanSpec` |
| **5** | `simulateGrades` | `studentId`, danh sách `SimulatedCourseGrade` (môn, TC, điểm giả lập) | `SimulateGradesResponse`: CPA hiện tại, GPA dự kiến, CPA mới, `cpaDifference` | Công thức bình quân gia quyền:<br>$\text{CPA}_{new} = \frac{\text{CPA} \times \text{TC} + \sum (\text{Pts} \times \text{TC})}{\text{TC}_{total}}$ | Điểm kỳ vọng null -> Tra cứu thang điểm letter grade | `AcademicSpecV1Test.Capability5SimulateGradesSpec` |
| **6** | `rankRetakeCourses` | `studentId`, `maxSuggestions` | `RankRetakeCoursesResponse`: Danh sách môn đề xuất cải thiện xếp theo ROI | Chỉ xét môn có điểm D, D+, C. Sắp xếp giảm dần theo $\Delta \text{CPA}$ tiềm năng khi nâng lên điểm A | Môn không có điểm kết chuyển không được đưa vào danh sách | `AcademicSpecV1Test.Capability6RankRetakeCoursesSpec` |
| **7** | `calculateTargetGrades` | `studentId`, `targetCpa`, `targetGraduationSemester` | `CalculateTargetGradesResponse`: CPA hiện tại, CPA mục tiêu, TC còn lại, GPA yêu cầu | $\text{GPA}_{req} = \frac{\text{CPA}_{target} \times \text{TC}_{all} - \text{CPA} \times \text{TC}}{\text{TC}_{remain}}$<br>Nếu $\text{GPA}_{req} > 4.00$: Cảnh báo bất khả thi | TC còn lại = 0 hoặc $\text{CPA}$ mục tiêu bất khả thi đều phát warning | `AcademicSpecV1Test.Capability7CalculateTargetGradesSpec` |
| **8** | `runGraduationAudit` | `studentId` | `GraduationAuditResponse`: `eligibleForGraduation`, %, checklist, `pendingActions` | - Tích lũy đủ 150 TC CT1085<br>- CPA $\ge 2.00$<br>- Đạt đủ 4 chuẩn phi tín chỉ (TOEIC, MOS, GDQP, GDTC) | Chuẩn phi tín chỉ thiếu được bóc tách thành action riêng, không tính là môn học | `AcademicSpecV1Test.Capability8GraduationAuditSpec` |
| **9** | `reconcileStudyPlan` | `planId`, `studentId`, `completedSemester` | `ReconcileStudyPlanResponse`: `onTrack` (boolean), môn đã đạt, môn trượt, điều chỉnh | - Phát hiện môn điểm F trong kỳ đã hoàn thành -> `onTrack = false`<br>- Tự động gợi ý bổ sung môn nợ vào kỳ kế | Bỏ qua các môn chưa có điểm kết chuyển | `AcademicSpecV1Test.Capability9ReconcileStudyPlanSpec` |

---

## 3. Kiến trúc Động cơ Lập lịch (StudyPlanScheduler)

Động cơ lập lịch được tổ chức thành 2 giai đoạn riêng biệt:

```
[Danh sách 120 học phần CT1085]
              │
              ▼
   ┌────────────────────────────────────────┐
   │ GIAI ĐOẠN 1: HARD CONSTRAINTS FILTER   │
   │ 1. Tiên quyết (Prerequisites) đạt      │
   │ 2. Môn học trước (Prior Courses) học   │
   │ 3. Đồ án tốt nghiệp (>= 128 TC / 85%)  │
   │ 4. Không học lại môn đã đạt (trừ retake)│
   └────────────────────────────────────────┘
              │ (Các môn hợp lệ)
              ▼
   ┌────────────────────────────────────────┐
   │ GIAI ĐOẠN 2: SCORING ENGINE            │
   │ 40% Unblock Prerequisites              │
   │ 25% Standard Curriculum Progression   │
   │ 20% Retake ROI (Xóa điểm F, cải thiện) │
   │ 15% Workload Balance (Tín chỉ / Độ khó)│
   └────────────────────────────────────────┘
              │ (Sắp xếp theo Total Score)
              ▼
   ┌────────────────────────────────────────┐
   │ THAM LAM CHỌN THEO TRẦN TÍN CHỈ KỲ     │
   │ - Kỳ chính: 10 - 24 TC (Thường)        │
   │ - Kỳ chính: Max 14 TC (Cảnh báo)       │
   │ - Kỳ hè: Max 12 TC                     │
   │ - Giả định môn đạt -> Mở khóa kỳ sau  │
   └────────────────────────────────────────┘
```

---

## 4. Báo cáo Kết quả Kiểm thử (Test Verification)

Toàn bộ **45 bài test** (20 test từ V0 + 25 test đặc tả V1) đã chạy thành công 100% trên Maven module `haui-academic`:

```text
[INFO] -------------------------------------------------------
[INFO]  T E S T S
[INFO] -------------------------------------------------------
[INFO] Running vn.haui.advisor.academic.AcademicFacadeHarnessTest
[INFO] Tests run: 11, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.384 s
[INFO] Running vn.haui.advisor.academic.AcademicFixturesSchemaTest
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.011 s
[INFO] Running vn.haui.advisor.academic.AcademicModulePlaceholderTest
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.003 s
[INFO] Running vn.haui.advisor.academic.AcademicSpecV1Test
[INFO] Tests run: 25, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.115 s
[INFO] Running vn.haui.advisor.academic.MissingDataStrictnessTest
[INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.009 s
[INFO] Running vn.haui.advisor.academic.PolicyDemoVerificationTest
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.007 s
[INFO] 
[INFO] Results:
[INFO] Tests run: 45, Failures: 0, Errors: 0, Skipped: 0
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
```

---

## 5. Ranh giới Kỹ thuật và Không gian Sở hữu

- **Ranh giới sở hữu:** 100% mã nguồn, fixture và tài liệu đặc tả nằm trọn vẹn trong thư mục `tv4-academic/`.
- **Ràng buộc công nghệ:**
  - Không chứa Spring Data, JPA, Hibernate hay bất kỳ kết nối cơ sở dữ liệu SQL nào.
  - Không chứa REST Controller, HTTP Client hay Spring Web annotations.
  - Không tích hợp bất kỳ LLM, OpenAI, LangChain hay AI SDK nào.
  - Hoàn toàn độc lập, sử dụng Java thuần (POJO, Collections, Jackson) và JUnit 5 / AssertJ.
