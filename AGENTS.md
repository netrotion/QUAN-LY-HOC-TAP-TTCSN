# HƯỚNG DẪN DÀNH CHO CÁC CODING AGENTS — HAUI ADVISOR

Tài liệu này xác lập quy tắc phối hợp và ranh giới quyền sở hữu bất khả xâm phạm giữa 5 vai trò thành viên trong toàn bộ dự án HaUI Advisor. Mọi agent khi thực thi task phải tuân thủ nghiêm ngặt các nguyên tắc dưới đây.

---

## 1. Ranh giới quyền sở hữu thư mục (Ownership Boundaries)

Cấu trúc repository được phân chia theo từng folder tương ứng với vai trò chịu trách nhiệm chính:

| Thư mục | Vai trò phụ trách | Trách nhiệm và quyền hạn |
|---|---|---|
| `tv1-ai/` | **TV1 — Lead + AI** | Module AI, RAG, prompt engineering, tool calling adapter, kiểm thử AI. Không phụ thuộc controller/repository của TV5 hoặc implementation của TV4. (`tv1-ai/docs/` là **READ-ONLY**). |
| `tv2-web/` | **TV2 — FE nền tảng/học vụ** | Web host React, layout, navigation/sidebar, design system, UI components và API client dùng chung, các màn hình học vụ và Audit UI. |
| `tv3-planner-ui/` | **TV3 — FE kế hoạch/AI** | Feature package React: Study Planner, AI Advisor Chat UI, What-if simulator, Profile. Export `createStudentRoutes({ api, ui })`. Không dựng layout/auth riêng, không import ngược `tv2-web`. |
| `tv4-academic/` | **TV4 — Academic Tools** | Thư viện Java thuần: `AcademicFacade`, quy tắc học vụ, tính toán điểm số (BigDecimal), thuật toán tối ưu lộ trình. Không chứa HTTP, SQL/Database hoặc LLM. |
| `tv5-platform/` | **TV5 — Backend/DB/DevOps** | Spring Boot runtime (`app/`), hợp đồng giao tiếp (`contracts/`), cơ chế migration (`db/migration/`), hạ tầng Docker/CI (`infra/`), root build files (`pom.xml`, `package.json`, lockfiles, scripts kiểm tra, `AGENTS.md`). |

### Khóa Ranh giới sau khi Gộp Khung (Post-Bootstrap Lock)
- **Ngoại lệ Task 1.2 đã CHẤM DỨT HOÀN TOÀN.**
- Sau mốc gộp khung bootstrap:
  - **TV5** chỉ phụ trách và chỉnh sửa trong: `tv5-platform/` (app, contracts, migration, infra) và các root files (`pom.xml`, `package.json`, `package-lock.json`, `AGENTS.md`, `README.md`, `scripts/`, `.github/`, `.env.example`, `.gitignore`, `.gitattributes`, `.dockerignore`, `.mvn/`, `mvnw*`).
  - **TV5 tuyệt đối không sửa đổi** code hoặc tài liệu trong các folder của vai trò khác (`tv1-ai/`, `tv2-web/`, `tv3-planner-ui/`, `tv4-academic/`).
  - Mỗi agent khi commit/PR phải chạy `npm run check:ownership` để tự động xác thực đường dẫn thay đổi không vượt quá quyền hạn của mình.

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
# Kiểm tra và build Backend reactor (không cần AI key)
./mvnw -B verify                     # Linux / macOS
.\mvnw.cmd -B verify                 # Windows PowerShell

# Cài đặt và kiểm tra Frontend workspaces
npm ci
npm run check:secrets                # Quét và ngăn chặn rò rỉ secrets/credentials
npm run check:ownership              # Kiểm tra ranh giới sở hữu và đường dẫn thay đổi
npm run check:architecture           # Kiểm tra ranh giới phụ thuộc không vòng
npm run check:contracts              # Kiểm tra OpenAPI và JSON fixtures
npm run lint                         # Kiểm tra lint
npm run test                         # Chạy unit tests
npm run build                        # Build cả hai workspace TV3 và TV2

# Smoke check toàn diện hệ thống (tất cả các bước trên)
npm run smoke

# Kiểm tra cấu hình hạ tầng
docker compose --env-file .env -f tv5-platform/infra/compose.yaml config --quiet
```

---

## 4. Tình trạng sau khi Gộp Khung (Post-Bootstrap Status)

Các PR bootstrap nền tảng đã được gộp thành công vào `main`:
- **TV5 (Bootstrap V0 & Lock):** Multi-module reactor, contracts V0, Flyway migrations, smoke check pipeline, ownership & secrets gates.
- **TV1 (Task 1.3c):** AI skeleton, `AdvisorFacade`, Mock Model, ToolAdapter, kịch bản hội thoại và test harness độc lập (chạy mock không cần AI key).
- **TV2 (Task 1.3a):** Web host React, layout, navigation, design tokens, shared UI library V0, singleton API client và mock fixtures.
- **TV3 (Task 1.4 scaffolds):** Study Planner, Chat Advisor, What-if Simulator, Student Profile và routes contract `createStudentRoutes({ api, ui })`.
- **TV4 (Task 1.3b):** Academic Tools, `AcademicFacade`, bộ fixtures học vụ HaUI V0, `GradeCalculator` (BigDecimal), `RuleEvaluator` và test harness nghiêm ngặt.

Từ thời điểm này, mỗi thành viên tiếp tục hoàn thiện nghiệp vụ chi tiết trong phạm vi thư mục của mình, tuyệt đối tuân thủ ranh giới quyền sở hữu.
