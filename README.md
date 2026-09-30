# HaUI Advisor — Hệ thống Trợ lý ảo Tư vấn Lộ trình Học tập HaUI

Dự án phát triển hệ thống trợ lý học vụ thông minh cho sinh viên Trường Đại học Công nghiệp Hà Nội (HaUI).  
Giai đoạn hiện tại: **Gộp khung Bootstrap và Khóa Ownership (Post-Bootstrap Lock)**.

---

## 1. Cấu trúc dự án và Phân công vai trò

Dự án áp dụng kiến trúc đơn runtime chia module theo 5 vai trò thành viên:

```text
haui-advisor/
├── tv1-ai/                # TV1: Module AI, RAG, prompt & tool adapter (Maven library)
├── tv2-web/               # TV2: Web host React, layout, UI/client dùng chung
├── tv3-planner-ui/        # TV3: Feature package Planner/Chat/What-if UI
├── tv4-academic/          # TV4: Module quy tắc học vụ & công cụ đề xuất (Maven library)
├── tv5-platform/          # TV5: Platform Boot runtime, contracts, migration, hạ tầng & CI
│   ├── contracts/        # Java DTO/ports, OpenAPI V0, JSON fixtures mẫu
│   ├── app/              # Spring Boot main runtime, Flyway migrations, Security & REST APIs
│   ├── infra/            # Docker Compose, Dockerfiles & migrations
│   └── docs/             # Báo cáo kỹ thuật bootstrap & lock
├── pom.xml               # Root Maven multi-module aggregator
├── package.json          # Root npm workspaces configuration
├── scripts/              # Quality gates: ownership, secrets, architecture, contracts, smoke
├── AGENTS.md             # Quy tắc phối hợp và ranh giới ownership bất khả xâm phạm
└── README.md             # Hướng dẫn khởi chạy và kiểm thử dự án
```

---

## 2. Yêu cầu môi trường

- **Java Development Kit (JDK):** Phiên bản **21** (Temurin/Eclipse OpenJDK khuyến nghị).
- **Node.js:** Phiên bản **20.x** hoặc **22.x** (kèm npm 10+).
- **Docker & Docker Compose:** Docker version 24+ và Compose v2.20+ (tùy chọn cho local database & container stack).

*Lưu ý quan trọng:* **KHÔNG CẦN AI API key** để chạy kiểm thử và build toàn bộ dự án. Mọi test đều chạy độc lập trên bộ Mock/Fixture (`aiMode=MOCK`).

---

## 3. Hướng dẫn Fresh Checkout (Khởi động từ repo sạch)

Dành cho người mới clone hoặc checkout repository lần đầu:

### Bước 1: Sao chép tệp cấu hình môi trường
```bash
# PowerShell (Windows)
Copy-Item .env.example .env

# Bash (Linux / macOS)
cp .env.example .env
```

### Bước 2: Cài đặt dependencies Frontend
Tại thư mục gốc:
```bash
npm install
```

### Bước 3: Chạy Smoke Check toàn diện
Kiểm tra toàn bộ hệ thống từ ranh giới ownership, secrets, contracts, lint, unit tests đến build:
```bash
npm run smoke
```

### Bước 4: Build và kiểm thử Backend reactor
```bash
# PowerShell (Windows)
.\mvnw.cmd test

# Bash (Linux / macOS)
./mvnw test
```

### Bước 5: Khởi chạy Frontend Dev Server
```bash
npm run dev
# Mở trình duyệt tại: http://localhost:5173
```

---

## 4. Các bộ lệnh kiểm tra chi tiết

### 4.1. Bộ kiểm tra chất lượng Frontend & Ranh giới (Node.js)
```bash
# Quét và ngăn chặn rò rỉ secrets, API keys, private keys
npm run check:secrets

# Kiểm tra đường dẫn thay đổi theo ranh giới sở hữu (hoặc --role tv5)
npm run check:ownership

# Kiểm tra ranh giới kiến trúc và chống vòng phụ thuộc
npm run check:architecture

# Kiểm tra hợp đồng OpenAPI và JSON fixtures mẫu
npm run check:contracts

# Kiểm tra cú pháp linter
npm run lint

# Chạy unit tests cho các workspace TV2 và TV3
npm run test

# Build production cho các gói frontend
npm run build
```

### 4.2. Bộ kiểm tra Backend (Java / Maven)
```bash
# Chạy toàn bộ test suites của 4 module (Contracts, AI Mock, Academic, Platform App)
.\mvnw.cmd test                     # Windows
./mvnw test                         # Linux / macOS

# Build và đóng gói ứng dụng
.\mvnw.cmd clean package            # Windows
./mvnw clean package                # Linux / macOS

# Khởi chạy Spring Boot Backend
.\mvnw.cmd -pl tv5-platform/app spring-boot:run     # Windows
./mvnw -pl tv5-platform/app spring-boot:run         # Linux / macOS
# Backend API lắng nghe tại: http://localhost:8080
```

### 4.3. Khởi chạy toàn bộ hệ thống bằng Docker Compose
```bash
# Khởi chạy PostgreSQL (pgvector + Flyway init migration), Spring Boot backend và Web host
docker compose --env-file .env -f tv5-platform/infra/compose.yaml up -d --build

# Xem logs hoạt động
docker compose --env-file .env -f tv5-platform/infra/compose.yaml logs -f

# Dừng hệ thống (bảo toàn volume dữ liệu)
docker compose --env-file .env -f tv5-platform/infra/compose.yaml down
```

---

## 5. Điểm kiểm tra kỹ thuật (Endpoints V0)

- **Thông tin Bootstrap:** `GET http://localhost:8080/api/v1/system/bootstrap`
- **Health Check:** `GET http://localhost:8080/api/v1/system/health`
- **Frontend Technical Shell & Màn hình demo UI:** `http://localhost:5173`

---

## 6. Quy định khóa sở hữu (Xem chi tiết tại [AGENTS.md](AGENTS.md))
- Giai đoạn gộp khung đã hoàn tất: ranh giới sở hữu được khóa bất khả xâm phạm.
- **TV5** chỉ phụ trách `tv5-platform/` (app, contracts, migration, infra) và các root files (`pom.xml`, `package.json`, scripts kiểm tra...).
- Tuyệt đối không sửa đổi file trong folder của vai trò khác (`tv1-ai/`, `tv2-web/`, `tv3-planner-ui/`, `tv4-academic/`).
- Thư mục `tv1-ai/docs/` là **READ-ONLY** vĩnh viễn.