# DATA-SOURCE — GROUND TRUTH ACADEMIC DATA & DOCUMENTS (HAUI ADVISOR)

Thư mục này chứa toàn bộ dữ liệu học vụ chuẩn (Ground Truth Data) và tài liệu quy chế chính thức của Trường Đại học Công nghiệp Hà Nội (HaUI) nhằm phục vụ các module trong hệ thống:
- **`tv1-ai`:** Sử dụng tài liệu văn bản trong `documents/` cho cơ chế AI Retrieval-Augmented Generation (RAG) và trích dẫn nguồn khi tư vấn.
- **`tv4-academic`:** Sử dụng danh mục môn học, tín chỉ và đồ thị tiên quyết trong `academic-data/` để tính toán tiến độ, xếp hạng học cải thiện và tối ưu hóa thời khóa biểu.
- **`tv5-platform`:** Sử dụng dữ liệu hạt giống (seed data) nạp vào cơ sở dữ liệu khi khởi chạy ứng dụng.

---

## Cấu trúc Thư mục

```text
data-source/
├── academic-data/                           # Dữ liệu học vụ có cấu trúc (JSON)
│   ├── curriculum-ktpm-haui.json            # Khung CTĐT Kỹ thuật phần mềm HaUI (120 môn học)
│   ├── course-matrix.json                   # Bảng tra cứu thuộc tính môn học (tín chỉ, LT, TH)
│   └── prerequisites-graph.json             # Đồ thị quan hệ môn học trước và tiên quyết
│
└── documents/                               # Tài liệu văn bản cho AI RAG (Markdown)
    ├── 01_quy_che_dao_tao_tin_chi_haui.md   # Quy chế đào tạo tín chỉ, đăng ký 10-24 TC
    ├── 02_thang_diem_va_cach_tinh_gpa_cpa.md# Thang điểm 10 -> 4, công thức GPA & CPA
    ├── 03_quy_dinh_hoc_lai_va_hoc_cai_thien.md # Quy tắc học lại điểm F, học cải thiện D/D+/C
    ├── 04_quy_dinh_canh_bao_hoc_vu_va_buoc_thoi_hoc.md # Ngưỡng CPA cảnh báo học vụ
    └── 05_chuan_dau_ra_va_dieu_kien_tot_nghiep.md      # Chuẩn đầu ra và điều kiện tốt nghiệp
```

---

## Nguồn gốc Dữ liệu

- Dữ liệu học vụ và CTĐT được trích xuất trực tiếp từ cổng thông tin đào tạo sinh viên `sv.haui.edu.vn` (Trường Công nghệ thông tin và Truyền thông - HaUI, Ngành Kỹ thuật phần mềm, Mã ngành `CT1085`).
- Các quy định học vụ được chuẩn hóa dựa trên Quy chế Đào tạo đại học chính quy của Trường Đại học Công nghiệp Hà Nội và quy chuẩn hệ thống HaUI Advisor PRD.
