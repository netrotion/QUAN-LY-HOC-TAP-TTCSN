# Tài liệu Bàn giao Hợp đồng `ui-api-v0` (TV2 &rarr; TV3)

- **Mã nhiệm vụ:** Task 1.3a (Phase 1 — HaUI Advisor)
- **Đơn vị bàn giao:** TV2 — Frontend Platform & Academic Engineer (`tv2-web/`)
- **Đơn vị tiếp nhận:** TV3 — Frontend Planner & AI Engineer (`tv3-planner-ui/`)

---

## 1. Kiến trúc Không vòng Phụ thuộc (Acyclic Dependency Injection)

Để tuân thủ `AGENTS.md` và `scripts/check-architecture.mjs`:
- Gói `tv3-planner-ui` **TUYỆT ĐỐI KHÔNG** import ngược từ `@haui/web` (`tv2-web`).
- Thay vào đó, Web Host (`tv2-web`) khởi tạo singleton `api` và bộ component `ui` V0, sau đó truyền trực tiếp vào hàm `createStudentRoutes({ api, ui })` do `tv3-planner-ui` xuất khẩu:

```js
// Bên trong tv3-planner-ui/src/index.js (Task 1.4)
export function createStudentRoutes({ api, ui }) {
  const { Button, Card, Table, Modal, Loading, Error, EmptyState } = ui;

  return [
    {
      path: '/planner',
      name: 'StudyPlanner',
      status: 'READY',
      Component: () => <StudyPlannerPage api={api} ui={ui} />
    },
    // /recommendations, /what-if, /chat
  ];
}
```

Khi TV3 chưa triển khai xong các màn hình thực tế (hoặc route có `status: 'NOT_IMPLEMENTED'`), `mountStudentRoutes` của TV2 tự động kích hoạt `Tv3FallbackPage` cho `/planner`, `/recommendations`, `/what-if`, `/chat` để router không bị gãy.

---

## 2. Danh mục Shared UI Library V0 (`ui`)

| Component | Props chính | Mô tả |
|---|---|---|
| `Button` | `variant` (`primary`, `secondary`, `danger`, `ghost`), `size` (`sm`, `md`, `lg`), `loading`, `disabled`, `fullWidth`, `leftIcon`, `rightIcon`, `onClick` | Nút bấm tiêu chuẩn có spinner khi `loading=true`. |
| `Card` | `title`, `subtitle`, `header`, `headerAction`, `footer`, `variant` (`default`, `elevated`, `status-info`, `status-success`, `status-warning`, `status-error`), `padding` (`none`, `sm`, `md`, `lg`) | Khung nội dung chuẩn hóa; hỗ trợ thêm `Card.Header`, `Card.Body`, `Card.Footer`. |
| `Table` | `columns` (`{ key, title, dataIndex, align, width, render }`), `data`, `rowKey`, `loading`, `error`, `onRetry`, `emptyTitle`, `emptyDescription`, `emptyAction`, `striped`, `hoverable` | Bảng dữ liệu tích hợp sẵn `Loading`, `Error`, `EmptyState` và bảo toàn giá trị `null / UNKNOWN`. |
| `Modal` | `isOpen` (hoặc `open`), `onClose`, `title`, `subtitle`, `size` (`sm`, `md`, `lg`, `xl`), `closeOnBackdrop`, `closeOnEsc`, `footer` | Hộp thoại popup có backdrop, nút đóng `×`, phím `ESC` và tự động khóa cuộn trang (`document.body.style.overflow = 'hidden'`). |
| `Loading` | `variant` (`spinner`, `skeleton`, `inline`), `size` (`sm`, `md`, `lg`), `label`, `lines` | Hiển thị trạng thái chờ dữ liệu. |
| `Error` | `title`, `message` / `error`, `code`, `requestId`, `details`, `onRetry`, `retryLabel` | Hiển thị lỗi chuẩn hóa kèm nút Retry. |
| `EmptyState` | `title`, `description`, `icon`, `action`, `actionLabel`, `onAction` | Hiển thị minh họa và thông báo khi danh sách rỗng. |

---

## 3. Singleton API Client (`api`)

- **Base URL:** Mặc định `/api/v1` (qua Vite proxy tới `http://localhost:8080`).
- **Bảo mật & Phiên (Rule 6 `AGENTS.md`):**
  - Tự động gửi kèm cookie phiên (`credentials: 'include'`).
  - Tự động đính kèm header `X-XSRF-TOKEN` từ cookie `XSRF-TOKEN` cho các phương thức `POST`, `PUT`, `PATCH`, `DELETE`.
  - Tự động loại bỏ trường `studentId` không tin cậy nếu xuất hiện trong request body từ phía client (`sanitizeRequestBody`).
- **Mock Interceptor (`FIXTURE_ONLY` — Rule 4 & Rule 5 `AGENTS.md`):**
  - Có thể bật/tắt qua `VITE_USE_MOCK_API` hoặc `api.setMockMode(boolean)` trên thanh Topbar (chỉ cho phép ở môi trường dev/test).
  - Tuyệt đối không âm thầm fallback về mock khi chạy môi trường live/production.
  - Các helper domain có sẵn:
    - `api.system.getBootstrap()`, `api.system.getHealth()`
    - `api.academic.getStatus()`, `api.academic.getCurriculum()`, `api.academic.checkEligibility(payload)`
    - `api.audit.getGraduationAudit()`
    - `api.planner.generate(payload)`, `api.planner.validate(payload)`, `api.planner.reconcile(payload)`
    - `api.simulation.simulateGrades(payload)`, `api.simulation.rankRetake(payload)`, `api.simulation.calculateTargetGrades(payload)`
    - `api.advisor.chat(payload)`
