# THANG ĐIỂM ĐÁNH GIÁ VÀ PHƯƠNG PHÁP TÍNH ĐIỂM GPA / CPA TẠI HaUI

**Mã tài liệu:** `REG-HAUI-02`  
**Chủ đề:** Quy đổi thang điểm và công thức tính điểm trung bình học kỳ (GPA), tích lũy (CPA)

---

## 1. Thang điểm Đánh giá và Bảng Quy đổi Chuẩn

Kết quả học tập của sinh viên tại Trường Đại học Công nghiệp Hà Nội được đánh giá qua thang điểm 10, sau đó quy đổi sang điểm chữ (Letter Grade) và thang điểm 4 theo bảng chuẩn sau:

| Điểm học phần (Thang 10) | Điểm chữ | Điểm số (Thang 4) | Đánh giá xếp loại | Trạng thái đạt môn |
|---|:---:|:---:|---|:---:|
| **8.5 — 10.0** | **A** | **4.0** | Giỏi / Xuất sắc | Đạt |
| **8.0 — 8.4** | **B+** | **3.5** | Khá giỏi | Đạt |
| **7.0 — 7.9** | **B** | **3.0** | Khá | Đạt |
| **6.5 — 6.9** | **C+** | **2.5** | Trung bình khá | Đạt |
| **5.5 — 6.4** | **C** | **2.0** | Trung bình | Đạt |
| **5.0 — 5.4** | **D+** | **1.5** | Trung bình yếu | Đạt (được học cải thiện) |
| **4.0 — 4.9** | **D** | **1.0** | Yếu | Đạt (được học cải thiện) |
| **< 4.0** | **F** | **0.0** | Kém | **Không đạt (phải học lại)** |

---

## 2. Công thức Tính Điểm Trung bình

### 2.1. Điểm Trung bình Chung Học kỳ (GPA - Grade Point Average)
Điểm GPA phản ánh kết quả học tập của sinh viên trong một học kỳ cụ thể, tính theo công thức trung bình gia quyền theo số tín chỉ:

$$\text{GPA} = \frac{\sum_{i=1}^{n} (a_i \times c_i)}{\sum_{i=1}^{n} c_i}$$

*Trong đó:*
- $a_i$: Điểm học phần thứ $i$ (theo thang điểm 4) hoàn thành trong học kỳ đó.
- $c_i$: Số tín chỉ của học phần thứ $i$.
- $n$: Tổng số học phần sinh viên đăng ký trong học kỳ đó.

### 2.2. Điểm Trung bình Chung Tích lũy (CPA - Cumulative Point Average)
Điểm CPA phản ánh kết quả học tập toàn diện từ đầu khóa học cho đến thời điểm xét:

$$\text{CPA} = \frac{\sum_{j=1}^{m} (a_j \times c_j)}{\sum_{j=1}^{m} c_j}$$

*Trong đó:*
- $a_j$: Điểm học phần thứ $j$ tính theo thang điểm 4 (lấy điểm cao nhất nếu học cải thiện).
- $c_j$: Số tín chỉ của học phần thứ $j$.
- $m$: Tổng số học phần tích lũy đạt điểm từ D trở lên.
- **Lưu ý:** Các học phần Giáo dục thể chất, Giáo dục quốc phòng - an ninh cấp chứng chỉ không tính vào CPA tích lũy.

---

## 3. Phân loại Học lực theo CPA Toàn khóa

- **Xuất sắc:** $\text{CPA} \ge 3.60$
- **Giỏi:** $3.20 \le \text{CPA} < 3.60$
- **Khá:** $2.50 \le \text{CPA} < 3.20$
- **Trung bình:** $2.00 \le \text{CPA} < 2.50$
- **Yếu:** $1.00 \le \text{CPA} < 2.00$
- **Kém:** $\text{CPA} < 1.00$
