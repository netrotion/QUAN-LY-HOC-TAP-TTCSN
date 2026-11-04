# TASK 5.1 — TRIỂN KHAI BẢN ỨNG VIÊN & VẬN HÀNH DEMO (`deploy-candidate`)

> **Người thực hiện:** TV5 — Backend/DB/DevOps  
> **Phạm vi:** `tv5-platform/` (infra, scripts, compose, docs), `README.md`  
> **Chờ:** Task 4.5 (`5b3e7ec` — nghiệm thu liên phân hệ TV1), `f4e58ec` (chuẩn hóa fixtures CTĐT), đồng bộ HeroUI v3 và live API wiring (`26a2d40`).  
> **Bàn giao:** URL demo + build commit + hướng dẫn vận hành + kịch bản backup/restore + báo cáo nghiệm thu TV5.  
> **Tiêu chí nghiệm thu:** Fresh start, health check, kịch bản backup/restore hoạt động, reverse proxy HTTPS an toàn, secrets không xuất hiện trong bundle/log.  

---

## 1. Tóm tắt bàn giao

| Hạng mục | Kết quả thực tế |
|---|---|
| **Môi trường Demo trực tuyến** | **URL chính thức:** [https://projection-grow-phillips-organised.trycloudflare.com/login](https://projection-grow-phillips-organised.trycloudflare.com/login) <br> Thiết lập reverse proxy an toàn qua Cloudflare Tunnel (HTTPS/TLS tự động), trỏ trực tiếp đến cổng Nginx SPA (`haui-web:5173`). |
| **Commit cơ sở (Build Commit)** | `26a2d40` (Tích hợp trọn vẹn HeroUI v3, live backend API authentication, quản lý hồ sơ sinh viên và lịch sử chat). |
| **Kiến trúc Container** | Khởi chạy qua Docker Compose đa dịch vụ cô lập: <br> • `haui-db`: PostgreSQL 16 tích hợp extension `pgvector`. <br> • `haui-backend`: Spring Boot 3.3.4 (Java 21 Temurin) đa module. <br> • `haui-web`: Nginx Alpine phục vụ React SPA và reverse proxy API `/api/` với `client_max_body_size 6m`. |
| **Sao lưu & Phục hồi (Backup / Restore)** | Cung cấp bộ công cụ tự động hóa đa nền tảng tại `tv5-platform/infra/scripts/`: <br> • Bash: `backup.sh`, `restore.sh` <br> • PowerShell: `backup.ps1`, `restore.ps1`. |
| **Bảo mật & Secrets** | `check:secrets` quét sạch 100%; không chứa API key bí mật trong Dockerfile, compose hoặc client bundles; cookie session bảo mật `SameSite=Lax`. |
| **Trạng thái kiểm thử** | 134/134 bài test frontend PASS; Reactor Backend Maven biên dịch hoàn tất `BUILD SUCCESS`. |

---

## 2. Thông tin môi trường Demo và Cấu hình Hạ tầng

### 2.1. Địa chỉ dịch vụ
* **Cổng giao diện Sinh viên:** `https://projection-grow-phillips-organised.trycloudflare.com/login`
* **API Gateway / Proxy nội bộ:** Nginx lắng nghe cổng 5173, tự động chuyển tiếp các truy vấn `/api/*` về Spring Boot Backend `http://backend:8080/api/`.
* **Giới hạn tải lên bảng điểm:** Đã cấu hình `client_max_body_size 6m;` cho phép tải lên bảng điểm PDF dung lượng tối đa 6 MB (khớp với cấu hình 5 MB của backend).

### 2.2. Kiểm thử sức khỏe (Health & Readiness)
* **API Auth Session:** `GET /api/auth/session` → Trả về HTTP 401 `UNAUTHENTICATED` (chuẩn contract bảo vệ endpoint, không bị crash hay fallback).
* **Spring Boot Actuator:** `GET /actuator/health` → `UP` (Database kết nối thành công, Disk space đầy đủ).
* **Console Browser:** 0 lỗi JavaScript runtime; các trang chuyển hướng SPA mượt mà qua React Router 6.

---

## 3. Kịch bản Sao lưu & Phục hồi Dữ liệu (Backup & Restore)

Nhằm đảm bảo an toàn dữ liệu và phục vụ việc khôi phục môi trường kiểm thử/demo, TV5 đã đóng gói bộ scripts tại `tv5-platform/infra/scripts/`:

### 3.1. Sao lưu Cơ sở dữ liệu
* **Trên Linux / macOS (Bash):**
  ```bash
  cd tv5-platform/infra/scripts
  chmod +x backup.sh
  ./backup.sh
  ```
* **Trên Windows (PowerShell):**
  ```powershell
  cd tv5-platform/infra/scripts
  .\backup.ps1
  ```
* Tệp sao lưu sẽ được xuất tự động vào thư mục `tv5-platform/infra/backups/` theo định dạng `haui_advisor_backup_YYYYMMDD_HHMMSS.sql` (thư mục này đã được cấu hình loại trừ trong `.gitignore`).

### 3.2. Phục hồi Cơ sở dữ liệu
* **Trên Linux / macOS (Bash):**
  ```bash
  ./restore.sh ../backups/haui_advisor_backup_YYYYMMDD_HHMMSS.sql
  ```
* **Trên Windows (PowerShell):**
  ```powershell
  .\restore.ps1 -BackupPath "..\backups\haui_advisor_backup_YYYYMMDD_HHMMSS.sql" -Force
  ```

---

## 4. Hướng dẫn Vận hành Hệ thống

### 4.1. Khởi động toàn bộ cụm dịch vụ
```bash
# Khởi chạy ngầm với build mới nhất
docker compose --env-file .env -f tv5-platform/infra/compose.yaml up -d --build
```

### 4.2. Kiểm tra nhật ký hoạt động (Logs)
```bash
# Xem log toàn bộ hệ thống
docker compose --env-file .env -f tv5-platform/infra/compose.yaml logs -f

# Xem riêng backend hoặc database
docker compose --env-file .env -f tv5-platform/infra/compose.yaml logs -f backend
docker compose --env-file .env -f tv5-platform/infra/compose.yaml logs -f db
```

### 4.3. Dừng hệ thống (Bảo toàn dữ liệu Volume)
```bash
docker compose --env-file .env -f tv5-platform/infra/compose.yaml down
```

---

## 5. Kết luận & Sẵn sàng Chuyển giao sang Task 5.2

Hạ tầng triển khai ứng viên đã đáp ứng đầy đủ và toàn diện các tiêu chí của **Task 5.1**:
1. Đã có cụm container Docker Compose hoàn chỉnh.
2. Đã có URL demo trực tiếp bảo mật HTTPS sẵn sàng cho kiểm thử người dùng thực tế.
3. Đã có kịch bản sao lưu/phục hồi dữ liệu được kiểm thử.
4. Đã ban hành tài liệu bàn giao kỹ thuật của TV5.

**Trạng thái bàn giao:** `deploy-candidate-ready`.  
**Kích hoạt giai đoạn tiếp theo:** Toàn nhóm (TV1, TV2, TV3, TV4) chính thức bước vào **Task 5.2 (Smoke testing và lập báo cáo chuyên sâu)** trên môi trường demo dùng chung.
