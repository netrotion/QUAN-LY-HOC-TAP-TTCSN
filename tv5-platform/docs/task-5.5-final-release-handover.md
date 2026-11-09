# BÁO CÁO BÀN GIAO BẢN PHÁT HÀNH CUỐI & GẮN TAG PHIÊN BẢN (RELEASE HANDOVER)
## HaUI Academic Advisor — Milestone Task 5.5 (`release-tag-handover`)

- **Dự án:** HaUI Academic Advisor (`QUAN-LY-HOC-TAP-TTCSN`)
- **Mã nhiệm vụ:** Task 5.5 — TV5 Backend/DB/DevOps: Gắn tag và bàn giao bản cuối (Phase 5: Triển khai & Bàn giao)
- **Thành viên chịu trách nhiệm:** TV5 — Platform, Database & DevOps Lead
- **Thư mục phân quyền:** `tv5-platform/`
- **Tiền đề phụ thuộc:** Task 5.4 (TV1 Lead đã phê chuẩn nghiệm thu bản ứng viên — `RELEASE_CANDIDATE_APPROVED`)
- **Nhánh Git triển khai:** `feature/tv5-task-5.5`
- **Thẻ phiên bản phát hành chính thức (Release Tag):** `v1.0.0`
- **Mã Commit gốc được duyệt (Approved Base Commit):** `dccdd66` (gộp nghiệm thu Task 5.4 trên `0f271a7`)
- **Căn cứ kỹ thuật:** `HaUI_Advisor_Solution_va_Prompt_theo_Phase.md` (dòng 600–610), PRD §3–10, Solution §10 (P01..P13), Open Contract 1.5.0, AGENTS.md.

---

## 1. TỔNG QUAN BÀN GIAO PHÁT HÀNH (EXECUTIVE HANDOVER SUMMARY)

TV5 — Platform, Database & DevOps Lead, trân trọng công bố việc hoàn tất đóng gói, kiểm tra sức khỏe hạ tầng lần cuối và gắn nhãn phiên bản chính thức (**Git Release Tag `v1.0.0`**) cho toàn bộ hệ thống Cố vấn Học vụ Thông minh HaUI.

```
========================================================================================
                          GÓI PHÁT HÀNH CHÍNH THỨC (FINAL RELEASE)
                              PHIÊN BẢN CHÍNH THỨC: v1.0.0
                          COMMIT ĐƯỢC DUYỆT: dccdd66 / 86e4e59
               MÔI TRƯỜNG VẬN HÀNH: DOCKER COMPOSE + POSTGRESQL 16 + PGVECTOR
========================================================================================
```

### Các hạng mục bàn giao trọng tâm:
1. **Gắn Git Tag Release `v1.0.0`:** Đã khởi tạo và đẩy thẻ tag `v1.0.0` lên repository GitHub chính thức của dự án tại commit đã được TV1 Lead ký duyệt tại Task 5.4.
2. **Kiểm tra Sức khỏe Hệ thống (Health & Readiness):**
   - Endpoint Spring Boot Actuator `/actuator/health` trả về `{"status":"UP"}` với đầy đủ chỉ số Database và Disk Space.
   - Endpoint xác thực phiên `/api/auth/session` thực thi đúng chuẩn bảo mật, cookie `JSESSIONID` thiết lập cờ `SameSite=Lax`.
3. **Cấu hình Mẫu An toàn Tuyệt đối:** File `.env.example` ở thư mục gốc hoàn toàn sạch mã bí mật (zero secrets), các trường nhạy cảm như `GEMINI_API_KEY` được để trống có hướng dẫn chi tiết.
4. **Bộ công cụ Sao lưu & Phục hồi Đa nền tảng:** Cung cấp đầy đủ scripts tự động hóa sao lưu và phục hồi dữ liệu cơ sở dữ liệu (`backup.ps1`/`restore.ps1` trên Windows và `backup.sh`/`restore.sh` trên Linux).
5. **Đồng bộ Phiên bản Báo cáo & Deployed Commit:** 100% tài liệu báo cáo của 5 phân hệ (TV1..TV5), Open Contract v1.5.0, mã nguồn và Docker image đều đồng nhất tại mốc phiên bản `v1.0.0`.

---

## 2. THÔNG TIN MÔI TRƯỜNG & ĐỊA CHỈ TRUY CẬP HỆ THỐNG

| Hạng mục | Thông số kỹ thuật | Ghi chú vận hành |
| :--- | :--- | :--- |
| **Phiên bản phát hành (Tag)** | `v1.0.0` | Thẻ tag chính thức trên nhánh `main`. |
| **Môi trường Demo Trực tuyến** | `https://projection-grow-phillips-organised.trycloudflare.com` | Cloudflare Zero Trust Tunnel bảo mật HTTPS, trỏ vào cụm Nginx SPA. |
| **Cổng Giao diện Sinh viên** | `/login` &rarr; `/dashboard` &rarr; `/curriculum` &rarr; `/audit` &rarr; `/planner` &rarr; `/chat` | Hỗ trợ 3 personas mẫu (`std-warning-real`, `std-excellent-real`, `std-average-real`). |
| **Spring Boot Actuator Health** | `/actuator/health` | `HTTP 200 OK` &rarr; `{"status":"UP"}` |
| **API Session Endpoint** | `/api/auth/session` | `HTTP 401 UNAUTHENTICATED` khi chưa đăng nhập, `HTTP 200` kèm DTO sinh viên khi phiên hợp lệ. |
| **Cơ sở dữ liệu Quan hệ & Vector** | PostgreSQL 16 + `pgvector` 0.7+ | Volume riêng biệt `pgdata`, port nội bộ 5432, quản lý 6 Flyway migrations. |
| **Máy chủ Ứng dụng Backend** | Spring Boot 3.3.4 (Java 21 LTS Temurin) | Maven reactor multi-module, port 8080. |
| **Máy chủ Web Giao diện** | Nginx 1.25 Alpine + React 18 SPA | Port 5173, reverse proxy `/api/*` về backend kèm cấu hình tải file 6MB. |

---

## 3. DANH MỤC GÓI BÀN GIAO SẢN PHẨM (RELEASE ARTIFACTS INVENTORY)

Toàn bộ gói bàn giao bao gồm các thành phần mã nguồn, tài liệu và công cụ vận hành:

### 3.1. Mã nguồn & Cấu hình Đóng gói
- **Kho lưu trữ chính:** `QUAN-LY-HOC-TAP-TTCSN` (GitHub).
- **Thư mục phân hệ:**
  - `tv1-ai/`: Thư viện AI, RAG pipeline, Grounding Validator, Gemini Tool Calling.
  - `tv2-web/`: Nền tảng giao diện Web Shell, layout Clinical Blueprint, sơ đồ cây môn học, phân hệ kiểm toán tốt nghiệp.
  - `tv3-planner-ui/`: Feature module Kế hoạch học tập nhiều kỳ, What-if simulator, Chatbot cố vấn.
  - `tv4-academic/`: Động cơ tính điểm và kiểm tra quy chế học vụ thuần Java (`haui-academic`).
  - `tv5-platform/`: Nền tảng Spring Boot 3 runtime, OpenAPI contracts, Flyway migrations, hạ tầng Docker.
- **Tệp cấu hình môi trường mẫu:** `.env.example` (loại bỏ 100% secret thực tế).
- **Tệp cấu hình Docker Compose:** `tv5-platform/infra/compose.yaml`.
- **Tệp Dockerfiles sản xuất:**
  - `tv5-platform/infra/docker/backend.Dockerfile`: Multi-stage build biên dịch Spring Boot bằng Eclipse Temurin JDK 21.
  - `tv5-platform/infra/docker/web.Dockerfile`: Multi-stage build biên dịch Vite React và phân phối qua Nginx Alpine.

### 3.2. Bộ Công cụ Sao lưu & Phục hồi CSDL
- **Vị trí:** `tv5-platform/infra/scripts/`
  - `backup.ps1` / `restore.ps1`: Tự động hóa trên môi trường Windows PowerShell.
  - `backup.sh` / `restore.sh`: Tự động hóa trên môi trường Linux / macOS Bash.
- **Thư mục lưu trữ sao lưu:** `tv5-platform/infra/backups/` (đã loại trừ trong `.gitignore`).

### 3.3. Hệ thống Báo cáo Tổng kết Nghiệm thu (Phase 5 Complete)
1. **Báo cáo Triển khai Hạ tầng TV5 (Task 5.1):** [`tv5-platform/docs/task-5.1-deploy-report.md`](file:///E:/thuctapcosonganh/tv5-platform/docs/task-5.1-deploy-report.md)
2. **Báo cáo Nghiệm thu Frontend Học vụ TV2 (Task 5.2a):** [`tv2-web/docs/report/task-5.2a-academic-fe-report.md`](file:///E:/thuctapcosonganh/tv2-web/docs/report/task-5.2a-academic-fe-report.md)
3. **Hướng dẫn Sử dụng Hệ thống TV2 (Task 5.2a):** [`tv2-web/docs/report/task-5.2a-user-guide.md`](file:///E:/thuctapcosonganh/tv2-web/docs/report/task-5.2a-user-guide.md)
4. **Báo cáo Smoke Test TV3 (Task 5.2b):** [`tv3-planner-ui/docs/smoke-report/BAO_CAO_SMOKE_TEST_TV3.md`](file:///E:/thuctapcosonganh/tv3-planner-ui/docs/smoke-report/BAO_CAO_SMOKE_TEST_TV3.md)
5. **Hướng dẫn Lưu/Hủy/Mở lại TV3 (Task 5.2b):** [`tv3-planner-ui/docs/smoke-report/HUONG_DAN_LUU_HUY_MO_LAI.md`](file:///E:/thuctapcosonganh/tv3-planner-ui/docs/smoke-report/HUONG_DAN_LUU_HUY_MO_LAI.md)
6. **Báo cáo Thuật toán & Kiểm thử TV4 (Task 5.2c):** [`tv4-academic/docs/task-5.2c-academic-report.md`](file:///E:/thuctapcosonganh/tv4-academic/docs/task-5.2c-academic-report.md)
7. **Báo cáo Kiến trúc Trợ lý AI TV1 (Task 5.2d):** [`tv1-ai/docs/task-5.2d-ai-report.md`](file:///E:/thuctapcosonganh/tv1-ai/docs/task-5.2d-ai-report.md)
8. **Hồ sơ Rà soát Kỹ thuật Hợp nhất TV2 (Task 5.3):** [`tv2-web/docs/report/final/task-5.3-consolidation-dossier.md`](file:///E:/thuctapcosonganh/tv2-web/docs/report/final/task-5.3-consolidation-dossier.md)
9. **Biên bản Nghiệm thu Chốt Commit TV1 Lead (Task 5.4):** [`tv1-ai/docs/task-5.4-release-acceptance.md`](file:///E:/thuctapcosonganh/tv1-ai/docs/task-5.4-release-acceptance.md)
10. **Biên bản Gắn Tag & Bàn giao Bản cuối TV5 (Task 5.5):** [`tv5-platform/docs/task-5.5-final-release-handover.md`](file:///E:/thuctapcosonganh/tv5-platform/docs/task-5.5-final-release-handover.md) *(Tài liệu hiện tại)*

---

## 4. HƯỚNG DẪN KHỞI CHẠY & VẬN HÀNH TỪ GÓI PHÁT HÀNH (OPERATIONAL RUNBOOK)

### 4.1. Khởi động từ mã nguồn sạch (Fresh Runbook)
Dành cho cán bộ quản trị hoặc người chấm bài tập lớn:

```bash
# 1. Clone repository tại thẻ phiên bản v1.0.0
git clone --branch v1.0.0 https://github.com/netrotion/QUAN-LY-HOC-TAP-TTCSN.git
cd QUAN-LY-HOC-TAP-TTCSN

# 2. Tạo tệp cấu hình môi trường từ mẫu
# Trên Windows PowerShell:
Copy-Item .env.example .env
# Trên Linux/macOS:
cp .env.example .env

# 3. Khởi chạy toàn bộ cụm dịch vụ bằng Docker Compose
docker compose --env-file .env -f tv5-platform/infra/compose.yaml up -d --build
```

### 4.2. Kiểm tra trạng thái hoạt động (Health Verification)
```bash
# Kiểm tra log khởi động backend
docker compose --env-file .env -f tv5-platform/infra/compose.yaml logs -f backend

# Kiểm tra sức khỏe hệ thống
curl -i http://localhost:8080/actuator/health
# Kết quả kỳ vọng: HTTP 200 OK {"status":"UP"}
```
Truy cập giao diện Web người dùng tại: `http://localhost:5173/login`.

### 4.3. Quy trình Sao lưu & Phục hồi Dữ liệu Định kỳ
```powershell
# Sao lưu CSDL (Windows PowerShell):
cd tv5-platform/infra/scripts
.\backup.ps1

# Phục hồi CSDL từ bản sao lưu:
.\restore.ps1 -BackupPath "..\backups\haui_advisor_backup_YYYYMMDD_HHMMSS.sql" -Force
```

---

## 5. KẾT LUẬN & HOÀN TẤT DỰ ÁN

Task 5.5 đánh dấu **cột mốc hoàn thành toàn diện 100% kế hoạch phát triển của dự án HaUI Academic Advisor (từ Phase 1 đến Phase 5)**.

Toàn bộ hệ thống đã được kiểm thử hồi quy nghiêm ngặt, đóng gói tự động hóa, kiểm tra bảo mật sạch sẽ, gắn tag phát hành chuẩn mực và sẵn sàng đưa vào vận hành thực nghiệm hoặc phục vụ bảo vệ đồ án/bài tập lớn.

---
*Biên bản được lập và công bố bởi TV5 — Platform, Database & DevOps Lead — Ngày 09/11/2026.*

