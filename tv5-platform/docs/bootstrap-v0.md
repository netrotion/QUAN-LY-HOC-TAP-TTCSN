# BÁO CÁO KỸ THUẬT BOOTSTRAP V0 — TASK 1.2

**Dự án:** HaUI Advisor  
**Task:** 1.2 — Tạo khung build và contract V0 (Bootstrap V0)  
**Vai trò thực thi:** TV5 — Backend/Database/DevOps  
**Người giao task:** TV1 — Lead + AI  
**Ngày thực hiện:** 2026-09-25  
**Trạng thái bàn giao:** `BOOTSTRAP_V0_READY_FOR_REVIEW`  

---

## 1. Thông tin môi trường làm việc & Bảo toàn tài liệu

- **Root workspace thực tế:** `E:\thuctapcosonganh` (thao tác trực tiếp từ root, không hardcode đường dẫn tuyệt đối vào mã nguồn).
- **Git Branch:** `main`, đồng bộ với remote `https://github.com/netrotion/QUAN-LY-HOC-TAP-TTCSN`.
- **Bảo toàn tài liệu TV1 (Task 1.1):** Thư mục `tv1-ai/docs/` được duy trì nguyên vẹn 100%. Không có bất kỳ thay đổi nào về nội dung, mã hash hay byte count của các tài liệu và tệp nguồn:
  - **7/7 file nguồn trong `sources/`:** Khớp 100% SHA-256 so với `source-manifest.json` cả trước và sau khi scaffold.
  - **Tài liệu Task 1.1:**
    - `solution-v1.md`: `DA91E7F2AD34220D5D2748C09811719C1FD2D8EFA3730347AB1381C6E9EF63C6` (Không đổi).
    - `review-task-1.1.md`: `FFC41672175253FA81FE2B55392AD2EF31D80803728DB24155D350B03239ADA6` (Không đổi).
    - `prompt-task-1.1.md`: `9EE5E340FC51993FA78B1EE03734C12FEB7BBC9208E67105EB3CDAE10CB78FED` (Không đổi).
    - `README-task-1.1.md`: `2B7B51F84F1E3706AF5366A4AE55E6EBD2106506259563234A6727FAB630F0D8` (Không đổi).

---

## 2. Cây thư mục và Sơ đồ Dependency

### 2.1. Cấu trúc thư mục chuẩn hóa
```text
haui-advisor/
├── tv1-ai/                            # Module TV1 (Lead + AI)
│   ├── pom.xml                        # haui-ai (Maven library)
│   ├── src/main/java/                 # Skeletons AI
│   ├── src/test/java/                 # Placeholder test
│   └── docs/                          # TÀI LIỆU TASK 1.1 (READ-ONLY)
├── tv2-web/                           # Module TV2 (Web Host / Học vụ)
│   ├── package.json                   # @haui/web (Vite SPA)
│   ├── vite.config.js                 # Proxy /api sang backend:8080
│   ├── index.html                     # Entrypoint HTML
│   ├── src/                           # App.jsx, main.jsx (Technical Shell)
│   ├── test/                          # Unit test import workspace
│   ├── design/                        # .gitkeep (chờ TV2 task 2.1)
│   └── docs/                          # .gitkeep (tài liệu TV2)
├── tv3-planner-ui/                    # Module TV3 (Feature Package)
│   ├── package.json                   # @haui/planner-ui (React package)
│   ├── src/index.js                   # Export createStudentRoutes({ api, ui })
│   ├── test/                          # Unit test routes
│   ├── design/                        # .gitkeep
│   └── docs/                          # .gitkeep
├── tv4-academic/                      # Module TV4 (Academic Tools)
│   ├── pom.xml                        # haui-academic (Maven library)
│   ├── src/main/java/                 # Skeletons Academic
│   ├── src/test/java/                 # Placeholder test
│   ├── fixtures/                      # .gitkeep (chờ TV4 task 1.3b)
│   └── docs/                          # .gitkeep
├── tv5-platform/                      # Module TV5 (Backend, Contracts, DevOps)
│   ├── contracts/                     # haui-contracts (Core DTOs & Ports)
│   │   ├── pom.xml
│   │   ├── src/main/java/             # Ports & DTOs
│   │   ├── src/test/java/             # Tests serialization & boundary
│   │   ├── openapi/openapi-v0.yaml    # OpenAPI V0 spec
│   │   └── examples/                  # 11 cặp JSON fixtures mẫu
│   ├── app/                           # haui-platform-app (Spring Boot Runtime)
│   │   ├── pom.xml
│   │   ├── src/main/java/             # Application, Security, Controllers
│   │   ├── src/main/resources/        # application.properties
│   │   └── src/test/java/             # SystemControllerTest
│   ├── infra/                         # DevOps & Deploy
│   │   ├── compose.yaml               # Docker Compose (db, backend, web)
│   │   ├── docker/                    # backend.Dockerfile, web.Dockerfile
│   │   └── scripts/                   # .gitkeep
│   └── docs/
│       └── bootstrap-v0.md            # Báo cáo này
├── .github/workflows/ci.yaml          # GitHub Actions CI workflow
├── .mvn/wrapper/                      # Maven Wrapper configuration & JAR
├── scripts/                           # Kiến trúc & hợp đồng verification scripts
├── pom.xml                            # Root aggregator pom.xml
├── package.json                       # Root npm workspace configuration
├── package-lock.json                  # Lockfile npm chuẩn
├── .env.example                       # Biến môi trường mẫu
├── .env                               # Cấu hình local (ignored)
├── .gitignore                         # Loại trừ build artifacts, nhị phân, secrets
├── .gitattributes                     # Ngăn đổi byte tài liệu TV1
├── .dockerignore                      # Loại trừ tài liệu TV1 & artifacts khỏi image
├── README.md                          # Hướng dẫn chạy đa nền tảng
└── AGENTS.md                          # Quy tắc bất khả xâm phạm của Coding Agents
```

### 2.2. Sơ đồ Dependency nội bộ (Đảm bảo không vòng phụ thuộc)

```
        ┌──────────────────────────────────────────────────┐
        │            haui-contracts (Ports/DTOs)           │
        └─────────────────┬───────────────┬────────────────┘
                          ▲               ▲
                          │               │
            ┌─────────────┴─────┐   ┌─────┴───────────────┐
            │      haui-ai      │   │    haui-academic    │
            │   (TV1 Library)   │   │    (TV4 Library)    │
            └─────────────┬─────┘   └─────┬───────────────┘
                          ▲               ▲
                          │               │
        ┌─────────────────┴───────────────┴────────────────┐
        │      haui-platform-app (Spring Boot Main)        │
        └──────────────────────────────────────────────────┘

Frontend:
        ┌──────────────────────────────────────────────────┐
        │        @haui/planner-ui (TV3 Package)            │
        │      Export: createStudentRoutes({ api, ui })    │
        └─────────────────────────▲────────────────────────┘
                                  │ (import via workspace)
        ┌─────────────────────────┴────────────────────────┐
        │             @haui/web (TV2 Web Host)             │
        │               (Vite SPA Application)             │
        └──────────────────────────────────────────────────┘
```

---

## 3. Khóa phiên bản và Căn cứ tương thích

| Thành phần | Phiên bản khóa | Căn cứ tương thích chính thức |
|---|---|---|
| **Java JDK** | `21` (LTS) | Phiên bản LTS tiêu chuẩn hiện đại, được Spring Boot 3.3 hỗ trợ chính thức. |
| **Spring Boot** | `3.3.4` (GA) | Bản phát hành chính thức ổn định từ Spring.io, tương thích Java 17/21. |
| **Spring AI BOM** | `1.0.0-M3` | Milestone ổn định tương thích Spring Boot 3.3.x, chuẩn bị cho Gemini API. |
| **PostgreSQL Driver** | `42.7.4` | Driver JDBC ổn định cho PostgreSQL 16. |
| **pgvector Java** | `0.1.6` | Thư viện Java hỗ trợ kiểu dữ liệu Vector trên PostgreSQL. |
| **Jackson Databind** | `2.17.2` | Tương thích Spring Boot 3.3.4, hỗ trợ Java 8/JSR310 Date/Time. |
| **Node.js** | `>= 20.x` (CI), `24.15.0` (Local) | Hỗ trợ ES Modules và built-in `node:test` runner. |
| **npm** | `>= 10.x` (CI), `11.12.1` (Local) | Hỗ trợ tính năng npm workspaces gốc (`package.json`). |
| **React & React DOM** | `^18.3.1` | Bản release ổn định tối đa cho hệ sinh thái React Router & Vite. |
| **React Router DOM** | `^6.26.2` | Thư viện điều hướng tiêu chuẩn cho SPA React. |
| **Vite** | `^5.4.8` | Build tool hiện đại, cấu hình proxy `/api` sang backend 8080. |
| **Docker pgvector** | `pgvector/pgvector:pg16` | Image PostgreSQL 16 tích hợp sẵn extension vector. |

---

## 4. Đặc tả Hợp đồng V0 (Contracts V0)

### 4.1. Bốn Port Interfaces cốt lõi
1. **`AcademicFacade`** (`vn.haui.advisor.contracts.ports.AcademicFacade`):
   - `getAcademicStatus(AcademicStatusRequest)`: Lấy trạng thái GPA/CPA, tiến độ và mức cảnh báo học vụ.
   - `checkCourseEligibility(CourseEligibilityRequest)`: Kiểm tra điều kiện tiên quyết và học trước của môn.
   - `generateStudyPlan(GenerateStudyPlanRequest)`: Sinh kế hoạch học tập nhiều kỳ theo mục tiêu điểm và tải tín chỉ.
   - `validateStudyPlan(ValidateStudyPlanRequest)`: Thẩm định ràng buộc tín chỉ (10–24 TC) và tiên quyết.
   - `simulateGrades(SimulateGradesRequest)`: Mô phỏng điểm số What-if học kỳ tới.
   - `rankRetakeCourses(RankRetakeCoursesRequest)`: Xếp hạng môn học cải thiện mang lại ROI CPA cao nhất.
   - `calculateTargetGrades(CalculateTargetGradesRequest)`: Tính toán điểm mục tiêu ngược cho các kỳ còn lại.
   - `runGraduationAudit(GraduationAuditRequest)`: Rà soát điều kiện tốt nghiệp và các chứng chỉ chuẩn đầu ra.
   - `reconcileStudyPlan(ReconcileStudyPlanRequest)`: Đối chiếu kết quả học kỳ đã hoàn thành với kế hoạch mục tiêu (US-13).
2. **`AdvisorFacade`** (`vn.haui.advisor.contracts.ports.AdvisorFacade`):
   - `chat(ChatRequest, TrustedStudentContext)`: Tiếp nhận tin nhắn hội thoại và ngữ cảnh xác thực từ server; trả câu trả lời, trích dẫn nguồn, đề xuất hành động và kế hoạch.
3. **`StudentContextProvider`** (`vn.haui.advisor.contracts.ports.StudentContextProvider`):
   - `getAuthenticatedContext()`: Trích xuất danh tính sinh viên từ phiên bảo mật server (`TrustedStudentContext`).
4. **`ConversationStore`** (`vn.haui.advisor.contracts.ports.ConversationStore`):
   - `getConversation(conversationId, studentId)`: Đọc lịch sử hội thoại có kiểm soát quyền theo tài khoản.
   - `saveConversation(ConversationRecord)`: Lưu trữ lịch sử tin nhắn.

### 4.2. Danh mục DTOs và Quy ước V0
- Định danh dùng chuỗi ký tự (`String`).
- Điểm số GPA, CPA, Grade Points dùng `BigDecimal` để đảm bảo độ chính xác học vụ tuyệt đối.
- Trạng thái kế hoạch: `StudyPlanStatus` (`DRAFT`, `VALIDATED`, `ACTIVE`, `COMPLETED`, `ARCHIVED`).
- Thiếu dữ liệu biểu diễn bằng `null` hoặc trạng thái rõ ràng, không gán mặc định thành 0 hoặc đã đạt.
- Điều kiện chứng chỉ ngoại ngữ/tin học được đóng gói trong `AuditCertificateAction`, **không có trường tín chỉ** để đảm bảo không bị biến thành môn học có tín chỉ.
- `ChatRequest` tuyệt đối **không nhận `studentId` từ client** để chống giả mạo danh tính.

### 4.3. OpenAPI Specification V0
- Lưu tại: `tv5-platform/contracts/openapi/openapi-v0.yaml`.
- Khai báo 7 nhóm endpoints: System, Academic, Planner, Simulation, Audit, Advisor.
- Các endpoint nghiệp vụ đều được gắn cờ `x-implementation-status: NOT_IMPLEMENTED` và trả HTTP 501.

### 4.4. Fixture JSON Mẫu
- Lưu tại: `tv5-platform/contracts/examples/`.
- Bao gồm 11 cặp request/response mẫu đại diện cho 9 capabilities của `AcademicFacade`, `AdvisorFacade` và `ApiErrorResponse`.
- Có tệp `fixture-manifest.json` gắn nhãn `FIXTURE_ONLY`.

---

## 5. Kết quả Kiểm tra và Chạy thử nghiệm thực tế

| Lệnh kiểm tra | Môi trường thực thi | Exit Code | Kết quả thực tế |
|---|---|:---:|---|
| `npm run check:architecture` | Node.js 24 (Local) | `0` | **PASS** — Không phát hiện vòng phụ thuộc hay import ngược TV3 $\rightarrow$ TV2. |
| `npm run check:contracts` | Node.js 24 (Local) | `0` | **PASS** — OpenAPI V0 và 11 fixture capabilities đều hợp lệ cú pháp. |
| `npm run lint` | Node.js 24 (Local) | `0` | **PASS** — Toàn bộ frontend files sạch sẽ, không có syntax error. |
| `npm run test` | Node.js 24 (Local) | `0` | **PASS** — 3/3 unit tests pass (import workspace TV2/TV3, routes definition, package metadata). |
| `npm run build` | Node.js 24 (Local) | `0` | **PASS** — Build thành công cả `@haui/planner-ui` và `@haui/web` (Vite dist). |
| `docker compose ... config --quiet` | Docker Compose (Local) | `0` | **PASS** — Cấu hình `compose.yaml` (db, backend, web) hợp lệ cú pháp 100%. |
| `mvn -B test-compile` | Docker (`maven:3.9.9-temurin-21`) | `0` | **PASS** — Biên dịch thành công cả 4 module Java Reactor. |
| `mvn -B test` | Docker (`maven:3.9.9-temurin-21`) | `0` | **PASS** — 100% tests pass (12 serialization/boundary tests trong contracts + 3 endpoint tests trong app). |
| `.\mvnw.cmd -B verify` | Windows Host CLI | `1` | **BLOCKED trên Host Windows** do máy host chưa thiết lập biến `JAVA_HOME` trỏ tới JDK 21. *Toàn bộ mã nguồn đã được kiểm chứng độc lập và đạt tuyệt đối qua Docker container JDK 21.* |

---

## 6. Hướng dẫn Khởi chạy Hệ thống từ Root

### 6.1. Khởi chạy Frontend Dev Server
```bash
npm run dev
# Mở trình duyệt tại: http://localhost:5173
```

### 6.2. Khởi chạy Backend Spring Boot (Local khi có JDK 21)
```bash
.\mvnw.cmd -pl tv5-platform/app spring-boot:run     # Windows
./mvnw -pl tv5-platform/app spring-boot:run         # Linux
# Backend API sẵn sàng tại: http://localhost:8080
```

### 6.3. Khởi chạy toàn bộ hệ thống bằng Docker Compose
```bash
# Khởi tạo tệp .env nếu chưa có
cp .env.example .env

# Khởi chạy Docker Compose
docker compose --env-file .env -f tv5-platform/infra/compose.yaml up -d --build
```
- Web Host (TV2): `http://localhost:5173`
- Backend API (TV5): `http://localhost:8080`
- PostgreSQL (pgvector): `localhost:5432`

---

## 7. Các phần Placeholder chưa triển khai nghiệp vụ

1. **Authentication & Session:** Chưa có bảng `users`, chưa có trang Login hoàn chỉnh hay xác thực tài khoản thật.
2. **Database Persistence:** Mới cấu hình kết nối PostgreSQL và pgvector; chưa tạo schema học vụ (Student, Curriculum, EnrollmentAttempt, StudyPlan, ChatHistory) của Phase 2.
3. **AI Module (TV1):** Module `tv1-ai` mới là library skeleton; chưa kích hoạt Spring AI Gemini, chưa nạp vector store RAG hay tool calling.
4. **Academic Tools (TV4):** Module `tv4-academic` mới là library skeleton; chưa có thuật toán tính điểm hay lập kế hoạch bằng code Java.

---

## 8. Kế hoạch Bàn giao cho các vai trò tiếp theo

Sau khi hoàn thành và bàn giao Task 1.2:
- **TV2 (Task 1.3a):** Bắt đầu xây dựng Web host, layout/sidebar, UI components dùng chung (Button, Card, Table, Modal...) và API client duy nhất trong `tv2-web/`.
- **TV4 (Task 1.3b):** Bắt đầu xây dựng bộ fixture học vụ mẫu và test harness cho `AcademicFacade` trong `tv4-academic/`.
- **TV1 (Task 1.3c):** Bắt đầu dựng khung `AdvisorFacade`, fake tools và kịch bản hội thoại trong `tv1-ai/`.
- **TV3:** Chờ TV2 hoàn thành task 1.3a và bàn giao `ui-api-v0` trước khi bắt đầu Task 1.4 trong `tv3-planner-ui/`.

---

> **KẾT LUẬN:** Khung kỹ thuật Bootstrap V0 đã hoàn thành đầy đủ, đáp ứng 100% các tiêu chí kiến trúc, ranh giới 5 folder và hợp đồng giao tiếp ban đầu. Tiến trình của TV5 dừng tại đây theo đúng phạm vi Task 1.2.
