# Hướng dẫn Thiết kế & Bàn giao mốc `design-base-v1` — HaUI Advisor

- **Tác giả:** TV2 — Frontend Platform & Academic Engineer
- **Bên tiếp nhận:** TV3 — Feature Package Developer (Study Planner, AI Chatbot, What-if Simulator, Student Profile)
- **Phiên bản:** `1.0.0` (Mốc bàn giao Phase 2: `design-base-v1`)
- **Tệp token nguồn:**
  - CSS Variables: `tv2-web/src/styles/tokens.css`
  - JSON Machine-Readable: `tv2-web/design/tokens.json`
- **Giao diện mẫu tham chiếu:** Dashboard Học tập tương tác tại `/` (kèm State Switcher Toolbar)

---

## 1. Triết lý Thiết kế (Design Philosophy)

Hệ thống thiết kế HaUI Advisor được xây dựng trên triết lý:
**"Clinical Blueprint on Frosted Paper" (Bản vẽ kỹ thuật lâm sàng trên nền giấy mờ)**

1. **Monochromatic Developer-Tool Aesthetic (Phong cách công cụ kỹ sư phần mềm):**
   - Lấy cảm hứng từ chuẩn mực giao diện Geist (Vercel) và shadcn/ui.
   - Màu nền sáng trung tính, đường viền mảnh (hairline 1px `#e5e5e5`), độ tương phản chữ cao (ink `#0a0a0a`).
   - Đổ bóng nhẹ dạng "whisper-quiet" (chỉ 1–3px blur kèm 1px viền subtle), loại bỏ bóng mờ lòe loẹt.

2. **Bản sắc Học thuật HaUI (HaUI Academic Identity):**
   - **HaUI Academic Navy Blue (`#0052cc`):** Điểm nhấn chính cho nút hành động, liên kết, thanh tiến độ và chỉ số tích cực.
   - **HaUI Amber Gold (`#d97706`):** Màu sắc cảnh báo học vụ sớm, môn học được AI đề xuất hoặc tiệm cận ngưỡng điểm.
   - **Destructive Ember (`#e7000b` / `#dc2626`):** Dành riêng cho môn trượt (điểm F), nợ học phần tiên quyết cốt lõi và lỗi hệ thống.

3. **Quy tắc Phân cấp Bo góc bất biến (Radius Hierarchy):**
   - **`--radius-buttons: 18px` / `--radius-badges: 18px` / `--radius-inputs: 18px`:**
     - Mọi phần tử tương tác (Buttons, Badges, Search triggers, State Pills, Input controls) **BẮT BUỘC** sử dụng hình học bo tròn mềm mại (pill geometry 18px).
   - **`--radius-cards: 24px`:**
     - Các container lớn (Card, Modal shell, Major panel) **BẮT BUỘC** sử dụng bo góc lớn 24px để tạo khung bao bọc vững chãi.
   - **`--radius-nested: 10px`:**
     - Các khối nhỏ lồng bên trong Card (sub-containers, callout items).
   - **`--radius-small: 6px`:**
     - Checkbox, micro-indicators.

---

## 2. Bảng Tra cứu Design Tokens (`tokens.css` & `tokens.json`)

### A. Surface & Canvas Colors (Three-tone Surface Stack)

| Biến CSS | Giá trị HEX | Mục đích sử dụng |
|---|---|---|
| `--color-canvas` / `--color-bg-app` | `#f5f5f5` | Nền toàn bộ trang ứng dụng |
| `--color-paper` / `--color-bg-surface` | `#ffffff` | Bề mặt Card, Modal, Dropdown popup |
| `--color-surface-alt` / `--color-bg-muted` | `#fafafa` | Vùng đệm phụ, bảng biểu xen kẽ, container lồng |
| `--color-bg-subtle` | `#f0f0f0` | Phân cách mảng màu không cần đường viền |
| `--color-bg-code` | `#0a0a0a` | Khung hiển thị code / JSON phản hồi |
| `--color-hairline` / `--color-border` | `#e5e5e5` | Đường viền tóc chuẩn 1px |
| `--color-border-strong` | `#d4d4d4` | Viền nút bấm phụ, input khi hover |

### B. Typography & Ink Scale

| Biến CSS | Kích thước / Chiều cao dòng | Mục đích sử dụng |
|---|---|---|
| `--font-sans` | `'Geist', 'Inter', system-ui, sans-serif` | Phông chữ chính cho toàn bộ giao diện |
| `--font-mono` | `'JetBrains Mono', Consolas, monospace` | Mã môn học (`MATH1002`), số tín chỉ, JSON |
| `--text-caption` | `12px` (line-height: `1.33`) | Nhãn phụ, badge, metadata |
| `--text-body` | `14px` (line-height: `1.43`) | Văn bản nội dung chuẩn, dòng bảng biểu |
| `--text-body-lg` | `16px` (line-height: `1.5`) | Tiêu đề card nhỏ, đoạn văn giới thiệu |
| `--text-subheading` | `18px` (line-height: `1.56`) | Tiêu đề khối chức năng, modal header |
| `--text-heading-sm` | `24px` (line-height: `1.33`) | Giá trị KPI (Số tín chỉ, GPA kỳ) |
| `--text-heading` | `30px` (line-height: `1.2`) | Giá trị CPA tổng quan (`2.45 / 4.0`) |
| `--text-display` | `48px` (line-height: `1.1`) | Tiêu đề trang trọng, banner chính |

### C. HaUI Primary & Slate Palette (50–900 Scale)

- **HaUI Primary Scale:**
  - `50`: `#eff6ff` &bull; `100`: `#dbeafe` &bull; `200`: `#bfdbfe` &bull; `300`: `#93c5fd`
  - `400`: `#60a5fa` &bull; `500`: `#3b82f6` &bull; **`600`: `#0052cc` (Primary)** &bull; `700`: `#1d4ed8`
  - `800`: `#1e40af` &bull; `900`: `#1e3a8a` &bull; `950`: `#172554`
- **Slate / Neutral Scale:**
  - `50`: `#f8fafc` &bull; `100`: `#f1f5f9` &bull; `200`: `#e2e8f0` &bull; `300`: `#cbd5e1`
  - `400`: `#94a3b8` &bull; `500`: `#64748b` &bull; `600`: `#475569` &bull; `700`: `#334155`
  - `800`: `#1e293b` &bull; `900`: `#0f172a` &bull; `950`: `#020617`

### D. Status & Academic Colors

| Trạng thái | Nền (`-bg`) | Viền (`-border`) | Chữ (`-text`) | Ý nghĩa học vụ |
|---|---|---|---|---|
| **Success / Passed** | `#f0fdf4` | `#bbf7d0` | `#166534` | Môn đã đạt (Passed), CPA Giỏi/Xuất sắc |
| **Warning / At-risk** | `#fffbeb` | `#fde68a` | `#92400e` | Cảnh báo học vụ sớm, CPA Trung bình, điểm D/D+ |
| **Danger / Failed** | `#fef2f2` | `#fecaca` | `#991b1b` | Môn trượt (F), nợ môn tiên quyết, lỗi mạng |
| **Info** | `#f0f9ff` | `#bae6fd` | `#075985` | Thông tin chỉ số, môn AI gợi ý |

### E. Stitch / Interactive Mockup Wireframe Reference
- **Local Interactive Prototype:** [http://localhost:5173/](http://localhost:5173/)
- **Live State Switcher:** Cung cấp 4 chế độ hiển thị thực tế (`Loaded`, `Skeleton Shimmer`, `Empty State`, `Error Banner`) giúp TV3 xem trực quan cách các widget ứng xử trước khi bắt đầu dựng giao diện.

---

## 3. UI Shell: Sidebar, Topbar và Điểm gắn Route TV3

### A. Cấu trúc Layout Tổng thể (`MainLayout`)
- Toàn bộ ứng dụng được bọc bởi `MainLayout`:
  - Bên trái: `Sidebar` (cố định độ cao 100vh).
  - Bên phải: `Topbar` (chiều cao 64px) và vùng nội dung chính `<main className="haui-content">` tự co giãn (max-width: 1280px).
- TV3 **tuyệt đối không tự tạo Layout hoặc Sidebar riêng**; các màn hình của TV3 chỉ cần render nội dung bên trong component page của mình.

### B. Cơ chế Thu gọn Sidebar (Collapsible 72px $\leftrightarrow$ 268px)
- Sidebar hỗ trợ 2 trạng thái:
  - **Mở rộng (268px):** Hiển thị đầy đủ logo, tên dự án, nhãn nhóm menu, tiêu đề trang và huy hiệu tag (`Màn 1`, `TV3`, `100%`).
  - **Thu gọn (72px):** Tự động ẩn văn bản, chuyển logo và các icon về chính giữa, hiển thị tooltip nhãn khi hover chuột.
- Chuyển đổi trạng thái bằng nút bấm `⇤ / ☰` trên Header Topbar; trạng thái được tự động ghi nhớ vào `localStorage.getItem('haui_sidebar_collapsed')`.

### C. Danh mục 7 Màn hình Học vụ chuẩn
Sidebar đã được cấu hình sẵn 7 đường dẫn chuẩn theo đặc tả Task 2.1:
1. `Dashboard (Tổng quan học tập)` &rarr; `/` (Màn hình 1 — TV2)
2. `Bảng điểm & Học vụ` &rarr; `/progress` hoặc `/academic` (Hồ sơ cá nhân — TV2)
3. `CTĐT & Cây môn học` &rarr; `/curriculum` (Màn hình 4 — TV2)
4. `Kế hoạch học tập (Study Planner)` &rarr; `/planner` (Màn hình 5 — TV3)
5. `Cố vấn AI (AI Chatbot)` &rarr; `/chat` (Màn hình 2 — TV3)
6. `Mô phỏng & Cải thiện điểm (What-if)` &rarr; `/what-if` (Màn hình 6, 7, 8 — TV3)
7. `Kiểm toán tốt nghiệp (Graduation Audit)` &rarr; `/audit` (Màn hình 9 — TV2/TV3)
*(Kèm mục Demo UI & Mock API V0 tại `/demo-ui` phục vụ kiểm thử)*.

---

## 4. Đặc tả 4 Trạng thái Giao diện chuẩn (Component States)

TV3 khi phát triển các màn hình (`StudyPlannerPage`, `ChatAdvisorPage`, `WhatIfSimulatorPage`, `StudentProfilePage`) cần tuân thủ 4 trạng thái giao diện chuẩn đã được kiểm chứng trên Dashboard:

### 1. Trạng thái Đầy đủ Dữ liệu (Loaded State)
- Hiển thị đầy đủ dữ liệu người dùng, các thẻ Card có Header/Body/Footer rõ ràng.
- Sử dụng font monospaced cho mã môn học và điểm số.
- Các nút bấm hành động dùng chuẩn `variant="primary"` (xanh navy) hoặc `variant="secondary"` (viền mảnh).

### 2. Trạng thái Đang tải (Loading Skeleton State)
- **Không sử dụng spinner đơn độc xoay giữa màn hình trắng xóa.**
- Sử dụng Skeleton Shimmer blocks (`.haui-skeleton-box` hoặc `.haui-skeleton-line`) mô phỏng đúng cấu trúc các thẻ Metric, bảng biểu và dòng chữ chuẩn bị xuất hiện.
- Giúp giảm thiểu Cumulative Layout Shift (CLS) và tạo cảm giác phản hồi tức thì cho người dùng.

### 3. Trạng thái Trống (Empty State)
- Áp dụng khi sinh viên chưa tạo kế hoạch học tập, chưa có lịch sử chat hoặc chưa nhập bảng điểm.
- Sử dụng component `ui.EmptyState` được truyền từ TV2:
  ```jsx
  <ui.EmptyState
    title="Chưa có kế hoạch học kỳ tới"
    description="Bạn chưa tạo danh sách môn học cho học kỳ 4. Hãy nhờ Cố vấn AI hoặc chọn từ cây môn học để bắt đầu."
    actionLabel="Tạo kế hoạch mới"
    onAction={() => handleCreatePlan()}
  />
  ```

### 4. Trạng thái Báo lỗi (Error State)
- Áp dụng khi API backend trả về lỗi (4xx, 5xx) hoặc mất kết nối mạng:
  ```jsx
  <ui.Error
    title="Không thể tạo lộ trình học tập"
    message={error.message}
    code={error.code || 'PLANNER_GENERATION_FAILED'}
    requestId={error.requestId}
    onRetry={() => handleRetry()}
    retryLabel="Thử lại (Retry)"
  />
  ```

---

## 5. Quy tắc Nghiệp vụ Học vụ HaUI & Bảo toàn Dữ liệu

Khi xây dựng các tính năng kế hoạch và giả lập điểm, TV3 cần ghi nhớ các nguyên tắc bất khả xâm phạm từ `AGENTS.md` và PRD:

1. **Bảo toàn Dữ liệu Khuyết (Quy tắc 5 AGENTS.md):**
   - Học kỳ chưa có điểm hoặc môn đang học phải hiển thị `null` hoặc `UNKNOWN`.
   - **Tuyệt đối không gán mặc định thành 0 hoặc "đạt"**.
2. **Khung Giới hạn Tín chỉ theo Học chế Tín chỉ HaUI (BR-03 & BR-04):**
   - Số tín chỉ tối thiểu mỗi kỳ chính: **10 Tín chỉ**.
   - Số tín chỉ tối đa mỗi kỳ chính: **24 Tín chỉ** (chỉ cho phép đăng ký đến 24 TC nếu CPA kỳ trước $\ge 2.00$).
   - Nếu kế hoạch của sinh viên $< 10$ TC hoặc $> 24$ TC, hệ thống phải chặn xác nhận và cảnh báo đỏ.
3. **Danh tính Sinh viên & Bảo mật (Quy tắc 6 AGENTS.md):**
   - Danh tính sinh viên (`studentId`) được quản lý bởi Session Context từ server.
   - Client API tự động lọc bỏ `studentId` gửi từ request body của form để ngăn chặn giả mạo ID người khác.
4. **Không Gọi Trực tiếp SDK LLM ở Frontend:**
   - Mọi truy vấn hỏi đáp AI, sinh kế hoạch phải thông qua `api.advisor.chat()` hoặc `api.advisor.recommend()`.
   - Không cài đặt hay import `@google/generative-ai`, `openai`, `anthropic` vào code frontend.

---

## 6. Hướng dẫn TV3 Khởi động Code

1. TV3 nhận dependencies qua props của `createStudentRoutes({ api, ui })`.
2. Sử dụng các component sẵn có từ `ui`:
   - `ui.Button`: Hỗ trợ `variant="primary|secondary|danger|ghost"`, `size="sm|md|lg"`, `loading`, `disabled`.
   - `ui.Card`: Bọc widget có `title`, `subtitle`, `headerAction`, `variant="default|status-info|status-success|status-warning|status-error"`.
   - `ui.Table`: Hiển thị bảng danh sách môn học có `columns` và `data`.
   - `ui.Modal`: Hộp thoại popup chọn môn học, xem chi tiết môn tiên quyết.
   - `ui.EmptyState`, `ui.Loading`, `ui.Error`: Đảm bảo đủ các trạng thái giao diện.
3. Sử dụng các biến CSS tokens đã khai báo trong `tokens.css`:
   - Dùng `var(--color-primary)`, `var(--radius-buttons)`, `var(--radius-cards)`, `var(--space-4)`, `var(--font-mono)`.
   - Không hardcode các mã màu lạ hoặc bo góc không đồng bộ ngoài hệ thống token.

---
*Tài liệu thuộc mốc bàn giao `design-base-v1` — Dự án HaUI Advisor.*
