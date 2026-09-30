# HaUI Advisor — Hệ thống Trợ lý ảo Tư vấn Lộ trình Học tập HaUI

Dự án phát triển hệ thống trợ lý học vụ thông minh cho sinh viên Trường Đại học Công nghiệp Hà Nội (HaUI).  
Giai đoạn hiện tại: **Task 1.2 — Khởi tạo nền tảng chung (Bootstrap V0)**.

---

## 1. Cấu trúc dự án và Phân công vai trò

Dự án áp dụng kiến trúc đơn runtime chia module theo 5 vai trò thành viên:

```text
haui-advisor/
├── tv1-ai/                # TV1: Module AI, RAG, prompt & tool adapter (Maven library)
├── tv2-web/               # TV2: Web host React, layout, UI/client dùng chung
├── tv3-planner-ui/        # TV3: Feature package Planner/Chat/What-if UI
├── tv4-academic/          # TV4: Module quy tắc học vụ & công cụ đề xuất (Maven library)
├── tv5-platform/          # TV5: Platform Boot runtime, contracts, hạ tầng & CI
│   ├── contracts/        # Java DTO/ports, OpenAPI V0, JSON fixtures mẫu
│   ├── app/              # Spring Boot main runtime, Security & REST APIs
│   ├── infra/            # Docker Compose, Dockerfiles & scripts
│   └── docs/             # Báo cáo kỹ thuật bootstrap-v0
├── pom.xml               # Root Maven multi-module aggregator
├── package.json          # Root npm workspaces configuration
├── AGENTS.md             # Quy tắc phối hợp và ownership dành cho coding agents
└── README.md             # Hướng dẫn khởi chạy và kiểm thử dự án
```

---

## 2. Yêu cầu môi trường

- **Java Development Kit (JDK):** Phiên bản **21** (Temurin/Eclipse OpenJDK khuyến nghị).
- **Node.js:** Phiên bản **20.x** hoặc **22.x** (kèm npm 10+).
- **Docker & Docker Compose:** Docker version 24+ và Compose v2.20+ (tùy chọn cho local database & container stack).

---

## 3. Hướng dẫn cài đặt và Chạy thử nghiệm

### 3.1. Thiết lập biến môi trường
Sao chép tệp cấu hình mẫu ở thư mục gốc:

```bash
# PowerShell (Windows)
Copy-Item .env.example .env

# Bash (Linux / macOS)
cp .env.example .env
```

### 3.2. Chạy kiểm tra chất lượng và build Frontend (Node / npm)
Tại thư mục gốc dự án:

```bash
# Cài đặt dependencies qua npm
npm install

# Kiểm tra ranh giới kiến trúc không vòng phụ thuộc
npm run check:architecture

# Kiểm tra hợp đồng OpenAPI và JSON fixtures
npm run check:contracts

# Kiểm tra linter
npm run lint

# Chạy unit tests cho các workspace
npm run test

# Build production cho các gói frontend
npm run build
```

Khởi chạy máy chủ phát triển Web Host (TV2):
```bash
npm run dev
# Ứng dụng web hiển thị tại: http://localhost:5173
```

### 3.3. Build và kiểm thử Backend (Java / Maven)
Sử dụng Maven Wrapper tại thư mục gốc để đảm bảo tính nhất quán:

```bash
# PowerShell (Windows)
.\mvnw.cmd -B clean verify

# Bash (Linux / macOS)
./mvnw -B clean verify
```

Khởi chạy ứng dụng Spring Boot Backend sau khi đã build xong reactor libraries:
```bash
# PowerShell (Windows)
.\mvnw.cmd -pl tv5-platform/app spring-boot:run

# Bash (Linux / macOS)
./mvnw -pl tv5-platform/app spring-boot:run
# Backend API lắng nghe tại: http://localhost:8080
```

*Lưu ý: Luôn chỉ định `-pl tv5-platform/app` khi chạy `spring-boot:run` để tránh chạy nhầm plugin lên root aggregator.*

### 3.4. Khởi chạy toàn bộ hệ thống bằng Docker Compose

```bash
# Khởi chạy PostgreSQL (pgvector), Spring Boot backend và Web host
docker compose --env-file .env -f tv5-platform/infra/compose.yaml up -d --build

# Xem logs hoạt động
docker compose --env-file .env -f tv5-platform/infra/compose.yaml logs -f

# Dừng hệ thống (bảo toàn volume dữ liệu)
docker compose --env-file .env -f tv5-platform/infra/compose.yaml down
```

---

## 4. Các điểm kiểm tra kỹ thuật (Endpoints V0)

- **Thông tin Bootstrap:** `GET http://localhost:8080/api/v1/system/bootstrap`
- **Health Check:** `GET http://localhost:8080/api/v1/system/health`
- **Frontend Technical Shell:** `http://localhost:5173`

---

## 5. Quy định phối hợp (Xem chi tiết tại [AGENTS.md](AGENTS.md))
- Mỗi thành viên chỉ làm việc trong folder được phân công.
- Hợp đồng DTO/ports do TV5 quản lý tại `tv5-platform/contracts/`.
- Không tự ý sửa đổi `tv1-ai/docs/` hoặc các nguồn đã được bảo toàn.