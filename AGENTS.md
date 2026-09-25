# HƯỚNG DẪN DÀNH CHO CÁC CODING AGENTS — HAUI ADVISOR

Tài liệu này xác lập quy tắc phối hợp và ranh giới quyền sở hữu bất khả xâm phạm giữa 5 vai trò thành viên trong toàn bộ dự án HaUI Advisor. Mọi agent khi thực thi task phải tuân thủ nghiêm ngặt các nguyên tắc dưới đây.

---

## 1. Ranh giới quyền sở hữu thư mục (Ownership Boundaries)

Cấu trúc repository được phân chia theo từng folder tương ứng với vai trò chịu trách nhiệm chính:

| Thư mục | Vai trò phụ trách | Trách nhiệm và quyền hạn |
|---|---|---|
| `tv1-ai/` | **TV1 — Lead + AI** | Module AI, RAG, prompt engineering, tool calling adapter, kiểm thử AI. Không phụ thuộc controller/repository của TV5 hoặc implementation của TV4. |
| `tv2-web/` | **TV2 — FE nền tảng/học vụ** | Web host React, layout, navigation/sidebar, design system, UI components và API client dùng chung, các màn hình học vụ và Audit UI. |
| `tv3-planner-ui/` | **TV3 — FE kế hoạch/AI** | Feature package React: Study Planner, AI Advisor Chat UI, What-if simulator, Profile. Export `createStudentRoutes({ api, ui })`. Không dựng layout/auth riêng, không import ngược `tv2-web`. |
| `tv4-academic/` | **TV4 — Academic Tools** | Thư viện Java thuần: `AcademicFacade`, quy tắc học vụ, tính toán điểm số (BigDecimal), thuật toán tối ưu lộ trình. Không chứa HTTP, SQL/Database hoặc LLM. |
| `tv5-platform/` | **TV5 — Backend/DB/DevOps** | Spring Boot runtime (`app/`), hợp đồng giao tiếp (`contracts/`), hạ tầng Docker/CI (`infra/`), root build files (`pom.xml`, `package.json`, lockfiles, `AGENTS.md`). |

### Ngoại lệ duy nhất tại Task 1.2
- **TV5** được phép scaffold cấu trúc khung ban đầu (skeletons) cho cả 5 folder tại Task 1.2 mà không làm thay đổi nội dung sẵn có của `tv1-ai/docs/`.
- **Sau Task 1.2:** Ngoại lệ này **CHẤM DỨT HOÀN TOÀN**. Mỗi agent chỉ được ghi code trong đúng folder thuộc quyền sở hữu của vai trò được phân công.

---

## 2. Nguyên tắc phối hợp và ràng buộc kỹ thuật

1. **Một agent — Một working tree:**
   - Mỗi thời điểm chỉ có 1 agent ghi vào cùng một thư mục làm việc.
   - Không được phép sửa đổi file thuộc quyền sở hữu của thành viên khác để làm code của mình chạy được.

2. **Quản lý Hợp đồng giao tiếp (Contracts):**
   - Hợp đồng DTO/ports nằm tại `tv5-platform/contracts/`.
   - `tv1-ai` và `tv4-academic` chỉ phụ thuộc `contracts`, tuyệt đối không phụ thuộc chéo lẫn nhau.
   - Mọi đề xuất thay đổi schema/contract phải thông qua Pull Request có sự tham gia review của các bên sử dụng (consumers).

3. **Bảo toàn dữ liệu nguồn và tài liệu Task 1.1:**
   - Thư mục `tv1-ai/docs/` là **READ-ONLY**. Không tự ý chỉnh sửa solution, biên bản review cũ, manifest, các file nguồn hay tick PASS các tiêu chí P01–P13.

4. **Sử dụng Mock và Fake:**
   - Mock/Fake chỉ được sử dụng cho mục đích phát triển cục bộ và test có gắn nhãn rõ ràng (`FIXTURE_ONLY` hoặc profile `test`).
   - Tuyệt đối không âm thầm fallback về mock khi chạy môi trường live/production.

5. **Quy chế học vụ:**
   - Không tự ý bịa đặt quy chế học vụ HaUI; các tham số chưa kiểm chứng phải gắn nhãn `DEMO_UNVERIFIED`.
   - Missing data phải thể hiện trạng thái `null` hoặc `UNKNOWN`, không mặc định thành 0 hoặc "đạt".

6. **Bảo mật và Danh tính:**
   - Không lấy `studentId` từ request body/LLM làm định danh tin cậy. Danh tính sinh viên được server trích xuất từ session context.
   - Không đưa secrets, API keys thật vào source code hoặc log.

7. **Quy trình Git:**
   - Không tự ý `git init`, `reset --hard`, commit, push hoặc merge vào main trừ khi có chỉ thị rõ ràng trong prompt được giao.

---

## 3. Lệnh kiểm thử và xây dựng tiêu chuẩn

Các lệnh tiêu chuẩn được thực hiện từ thư mục gốc repository:

```bash
# Kiểm tra và build Backend reactor
./mvnw -B verify                     # Linux / macOS
.\mvnw.cmd -B verify                 # Windows PowerShell

# Cài đặt và kiểm tra Frontend workspaces
npm ci
npm run check:architecture           # Kiểm tra ranh giới phụ thuộc không vòng
npm run check:contracts              # Kiểm tra OpenAPI và JSON fixtures
npm run lint                         # Kiểm tra lint
npm run test                         # Chạy unit tests
npm run build                        # Build cả hai workspace TV3 và TV2

# Kiểm tra cấu hình hạ tầng
docker compose --env-file .env -f tv5-platform/infra/compose.yaml config --quiet
```

---

## 4. Hướng dẫn bắt đầu sau khi bàn giao Task 1.2

Sau khi TV5 hoàn tất và bàn giao Task 1.2 (`bootstrap-v0`), các vai trò tiếp theo sẽ bắt đầu làm việc trong folder của mình:
- **TV2 (Task 1.3a):** Bắt đầu code Web host, UI components dùng chung và API client duy nhất trong `tv2-web/`.
- **TV4 (Task 1.3b):** Bắt đầu xây dựng bộ fixture học vụ mẫu và test harness cho `AcademicFacade` trong `tv4-academic/`.
- **TV1 (Task 1.3c):** Bắt đầu dựng khung `AdvisorFacade`, ToolAdapter và RAG trong `tv1-ai/`.
- **TV3:** Chờ TV2 hoàn thành task 1.3a và bàn giao `ui-api-v0` trước khi bắt đầu Task 1.4 trong `tv3-planner-ui/`.
