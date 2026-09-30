# BÁO CÁO KỸ THUẬT: GỘP KHUNG VÀ KHÓA OWNERSHIP (TASK 1.5 / POST-BOOTSTRAP LOCK)

**Dự án:** HaUI Advisor  
**Task:** 1.5 — Gộp khung Bootstrap, Khóa Ownership & Thiết lập Quality Gates  
**Vai trò thực thi:** TV5 — Backend/Database/DevOps  
**Phạm vi thư mục:** `tv5-platform/` và root files  
**Ngày hoàn thành:** 2026-09-30  
**Trạng thái bàn giao:** `TASK_1_5_COMPLETED_AND_LOCKED`  

---

## 1. Tóm tắt kết quả thực hiện

1. **Gộp khung Bootstrap:**
   - Đã gộp và tích hợp đầy đủ các nhánh/PR bootstrap vào `main`:
     - **TV1 (Task 1.3c):** `tv1-ai` skeleton, `AdvisorFacade`, Mock Model, ToolAdapter và test harness (chạy không cần AI API key).
     - **TV2 (Task 1.3a):** `tv2-web` Web host, design tokens, shared UI library V0, singleton API client và mock fixtures.
     - **TV3 (Task 1.4 scaffolds):** `tv3-planner-ui` feature components (Planner, Chat, What-if, Profile) và route contracts.
     - **TV4 (Task 1.3b):** `tv4-academic` Academic Tools, `AcademicFacade`, quy tắc học vụ HaUI, `GradeCalculator` (BigDecimal) và test harness.
     - **TV5 (Bootstrap V0):** Multi-module reactor, contracts V0, OpenAPI spec, samples, infra Docker Compose.

2. **Khóa ranh giới sở hữu (Ownership Lock):**
   - Từ mốc này, ngoại lệ scaffold của TV5 tại Task 1.2 đã **CHẤM DỨT HOÀN TOÀN**.
   - TV5 chỉ chịu trách nhiệm và chỉnh sửa trong:
     - `tv5-platform/` (`app/`, `contracts/`, `infra/`, `docs/`, `db/migration/`).
     - Root build & config files (`pom.xml`, `package.json`, `package-lock.json`, `AGENTS.md`, `README.md`, `scripts/`, `.github/`, `.env.example`, `.gitignore`, `.gitattributes`, `.dockerignore`, `.mvn/`, `mvnw*`).
   - Tuyệt đối không can thiệp vào các folder của thành viên khác (`tv1-ai/`, `tv2-web/`, `tv3-planner-ui/`, `tv4-academic/`).
   - Thư mục `tv1-ai/docs/` được bảo toàn và là **READ-ONLY** vĩnh viễn đối với mọi vai trò.

3. **Công cụ kiểm tra đường dẫn thay đổi (`scripts/check-ownership.mjs`):**
   - Tự động phát hiện vi phạm ranh giới sở hữu qua git status / git diff hoặc danh sách tệp.
   - Hỗ trợ tham số `--role <tv1|tv2|tv3|tv4|tv5>` để kiểm tra quyền hạn của từng vai trò cụ thể.
   - Ngăn chặn mọi hành vi sửa đổi tài liệu `tv1-ai/docs/` hoặc sửa chéo folder nghiệp vụ.

4. **Công cụ quét và loại bỏ secrets (`scripts/check-secrets.mjs`):**
   - Quét mã nguồn tự động phát hiện API keys (OpenAI, Anthropic, Google/Gemini), Private keys, GitHub PATs, AWS keys, Slack tokens, JWT tokens và hardcoded credentials.
   - Kiểm tra đảm bảo `.env` không bị commit vào git index và luôn được khai báo trong `.gitignore`.

5. **Cơ chế Database Migration cho Platform:**
   - Tích hợp Flyway migration vào `tv5-platform/app`: `V1__init_platform_schema.sql`.
   - Tạo init script tương thích cho Docker Compose: `tv5-platform/infra/migrations/01_init_schema.sql`.
   - Thiết kế schema ban đầu: `system_settings`, `audit_logs`, `student_records`, `conversations`, `conversation_messages`, `study_plans`.
   - Cấu hình an toàn: Chạy test ở profile `test` không cần kết nối database thực tế (`spring.flyway.enabled=false`), cho phép kiểm thử offline hoàn hảo.

6. **Hệ thống Smoke Check và Nối Scripts (`scripts/smoke-check.mjs`):**
   - Nối toàn bộ pipeline vào các script tiêu chuẩn trong `package.json`:
     - `npm run check:secrets`
     - `npm run check:ownership`
     - `npm run check:architecture`
     - `npm run check:contracts`
     - `npm run lint`
     - `npm run test`
     - `npm run build`
     - `npm run smoke`
     - `npm run verify:all`
   - Cập nhật GitHub Actions CI workflow (`.github/workflows/ci.yaml`).

---

## 2. Kết quả kiểm thử thực tế

| Nội dung kiểm tra | Lệnh thực thi | Kết quả | Ghi chú |
|---|---|:---:|---|
| **Secret Scanner** | `npm run check:secrets` | **PASS** | 0 secrets, không có API key hay file `.env` bị lộ. |
| **Ownership Checker** | `npm run check:ownership` | **PASS** | Tất cả các thay đổi tuân thủ 100% ranh giới TV5. |
| **Architecture Boundaries** | `npm run check:architecture` | **PASS** | Không có phụ thuộc vòng hay import ngược TV3 $\rightarrow$ TV2. |
| **Contracts & Fixtures** | `npm run check:contracts` | **PASS** | OpenAPI 3.0.3 và 11 fixture capabilities hợp lệ. |
| **Frontend Linter** | `npm run lint` | **PASS** | Không có lỗi cú pháp hoặc debug statement. |
| **Frontend Unit Tests** | `npm run test` | **PASS** | 13/13 tests pass (TV2 API client, UI flows, TV3 routes contract). |
| **Frontend Build** | `npm run build` | **PASS** | Build thành công `@haui/planner-ui` và `@haui/web` (Vite dist). |
| **Backend Reactor Tests** | `.\mvnw.cmd test` | **PASS** | 50/50 tests pass: Contracts (12), AI Mock (15), Academic (20), Platform App (3). Không cần AI key. |
| **Platform Migration Schema** | Tự động kiểm tra file DDL | **PASS** | Schema V1 và Docker Compose migration có mặt đầy đủ. |
| **System Smoke Check** | `npm run smoke` | **PASS** | Toàn bộ 10/10 tiêu chí kiểm tra hệ thống đạt loại Giỏi. |

---

## 3. Hướng dẫn dành cho Fresh Checkout

Một lập trình viên hoặc CI runner mới hoàn toàn có thể sao chép kho mã nguồn và chạy thành công mà không gặp bất kỳ rào cản nào:

```bash
# 1. Tạo tệp môi trường
cp .env.example .env

# 2. Cài đặt npm workspaces
npm install

# 3. Chạy smoke check toàn diện
npm run smoke

# 4. Kiểm thử Backend reactor
.\mvnw.cmd test       # Windows
./mvnw test           # Linux / macOS

# 5. Khởi chạy dev server Frontend
npm run dev           # Truy cập http://localhost:5173
```
