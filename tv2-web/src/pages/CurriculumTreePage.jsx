import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/apiClient.js';
import { Table, Modal } from '../components/ui/index.js';

/**
 * Dữ liệu chi tiết học phần chuẩn xác theo Stitch Prototype `course_tree/code.html`
 */
const PROTOTYPE_COURSE_DETAILS = Object.freeze({
  IT6003: {
    code: 'IT6003',
    name: 'Cấu trúc dữ liệu & Giải thuật',
    credits: '3 Tín chỉ (2.5 LT + 0.5 TH)',
    type: 'Cơ sở nhóm ngành CNTT',
    semester: 'Học kỳ 3 (2022 - 2023)',
    status: 'Đã hoàn thành',
    statusClass: 'haui-badge--success',
    progress: '8.2 / 10',
    gradeEst: 'Điểm tổng kết: 8.2 (Điểm B+)',
    desc: 'Trang bị các cấu trúc dữ liệu cơ bản và nâng cao (Danh sách liên kết, Cây nhị phân, Bảng băm, Đồ thị) cùng các thuật toán tìm kiếm, sắp xếp và tối ưu độ phức tạp tính toán.',
    prereqStatus: 'Đã đáp ứng tất cả (1/1)',
    prereqs: [
      { code: 'IT1001', name: 'Nhập môn lập trình (C/C++)', grade: '9.0 (Điểm A)', tag: 'Môn tiên quyết', icon: 'check_circle', color: '#16a34a' }
    ],
    unlocks: [
      { code: 'IT6025', name: 'Kiến trúc phần mềm & Mẫu thiết kế', condition: 'Tiên quyết cho Kỳ 6', icon: 'lock_open' },
      { code: 'IT6080', name: 'Đồ án chuyên ngành KTPM', condition: 'Mở khóa chuỗi đồ án', icon: 'schedule' }
    ],
    lecturer: 'TS. Lê Hoàng Yến - Bộ môn KHMT',
    advice: 'Nền tảng quan trọng bậc nhất cho toàn bộ các môn lập trình và phân tích thuật toán chuyên sâu sau này.'
  },
  IT6001: {
    code: 'IT6001',
    name: 'Lập trình Hướng đối tượng (Java)',
    credits: '3 Tín chỉ (2 LT + 1 TH)',
    type: 'Cơ sở nhóm ngành CNTT',
    semester: 'Học kỳ 3 (2022 - 2023)',
    status: 'Đã hoàn thành',
    statusClass: 'haui-badge--success',
    progress: '9.0 / 10',
    gradeEst: 'Điểm tổng kết: 9.0 (Điểm A)',
    desc: 'Phương pháp lập trình hướng đối tượng (OOP): Đóng gói, Kế thừa, Đa hình, Trừu tượng hóa trên nền Java Standard Edition, Design Patterns cơ bản và lập trình giao diện Swing/JavaFX.',
    prereqStatus: 'Đã đáp ứng tất cả (1/1)',
    prereqs: [
      { code: 'IT1001', name: 'Nhập môn lập trình', grade: '9.0 (Điểm A)', tag: 'Môn tiên quyết', icon: 'check_circle', color: '#16a34a' }
    ],
    unlocks: [
      { code: 'IT6002', name: 'Lập trình Web cơ bản', condition: 'Tiên quyết học phần Web', icon: 'lock_open' },
      { code: 'IT6030', name: 'Phát triển ứng dụng Di động', condition: 'Nền tảng OOP cho Mobile', icon: 'lock_open' }
    ],
    lecturer: 'TS. Đỗ Ngọc Sơn - Bộ môn CNPM',
    advice: 'Kết quả đạt điểm A (9.0) giúp mở khóa thuận lợi toàn bộ các học phần lập trình ứng dụng tiếp theo.'
  },
  IT6005: {
    code: 'IT6005',
    name: 'Cơ sở dữ liệu',
    credits: '3 Tín chỉ (2 LT + 1 TH)',
    type: 'Cơ sở nhóm ngành CNTT',
    semester: 'Học kỳ 3 (2022 - 2023)',
    status: 'Đã hoàn thành',
    statusClass: 'haui-badge--success',
    progress: '8.0 / 10',
    gradeEst: 'Điểm tổng kết: 8.0 (Điểm B+)',
    desc: 'Mô hình dữ liệu quan hệ, đại số quan hệ, thiết kế lược đồ quan hệ và chuẩn hóa dạng 1NF-3NF/BCNF, ngôn ngữ truy vấn SQL trên hệ quản trị SQL Server.',
    prereqStatus: 'Đã đáp ứng tất cả (1/1)',
    prereqs: [
      { code: 'MATH1001', name: 'Toán cao cấp 1', grade: '8.0 (Điểm B+)', tag: 'Môn học trước', icon: 'check_circle', color: '#16a34a' }
    ],
    unlocks: [
      { code: 'IT6012', name: 'Hệ quản trị CSDL', condition: 'Học phần nâng cao Kỳ 5', icon: 'lock_open' },
      { code: 'IT6015', name: 'Lập trình Web nâng cao', condition: 'Thiết kế CSDL Web Kỳ 6', icon: 'lock_open' }
    ],
    lecturer: 'ThS. Vũ Thị Mai - Bộ môn HTTT',
    advice: 'Chú trọng kỹ năng thiết kế lược đồ CSDL và tối ưu hóa câu lệnh SQL khi tham gia các dự án đồ án.'
  },
  IT6002: {
    code: 'IT6002',
    name: 'Lập trình Web cơ bản',
    credits: '3 Tín chỉ (2 LT + 1 TH)',
    type: 'Chuyên ngành bắt buộc',
    semester: 'Học kỳ 4 (2022 - 2023)',
    status: 'Đã hoàn thành',
    statusClass: 'haui-badge--success',
    progress: '8.8 / 10',
    gradeEst: 'Điểm tổng kết: 8.8 (Điểm A)',
    desc: 'Nền tảng HTML5, CSS3, JavaScript hiện đại (ES6+), DOM Manipulation, responsive design và lập trình backend cơ bản với Node.js/Express.',
    prereqStatus: 'Đã đáp ứng tất cả (1/1)',
    prereqs: [
      { code: 'IT6001', name: 'Lập trình Hướng đối tượng', grade: '9.0 (Điểm A)', tag: 'Môn tiên quyết', icon: 'check_circle', color: '#16a34a' }
    ],
    unlocks: [
      { code: 'IT6015', name: 'Lập trình Web nâng cao', condition: 'Tiên quyết trực tiếp Kỳ 6', icon: 'lock_open' }
    ],
    lecturer: 'ThS. Nguyễn Tuấn Anh - Bộ môn CNPM',
    advice: 'Đã hoàn thành xuất sắc, tạo tiền đề vững chắc cho học phần Lập trình Web nâng cao ở kỳ 6.'
  },
  IT6004: {
    code: 'IT6004',
    name: 'Công nghệ phần mềm',
    credits: '3 Tín chỉ (2.5 LT + 0.5 BT lớn)',
    type: 'Bắt buộc ngành KTPM',
    semester: 'Học kỳ 4 (2022 - 2023)',
    status: 'Đã hoàn thành',
    statusClass: 'haui-badge--success',
    progress: '8.5 / 10',
    gradeEst: 'Điểm tổng kết: 8.5 (Điểm A)',
    desc: 'Tổng quan vòng đời phát triển phần mềm (SDLC), mô hình Agile/Scrum, phân tích yêu cầu phần mềm (SRS), kiểm thử cơ bản và quản lý phiên bản với Git/GitHub.',
    prereqStatus: 'Đã đáp ứng tất cả (1/1)',
    prereqs: [
      { code: 'IT6001', name: 'Lập trình Hướng đối tượng', grade: '9.0 (Điểm A)', tag: 'Môn học trước', icon: 'check_circle', color: '#16a34a' }
    ],
    unlocks: [
      { code: 'IT6025', name: 'Kiến trúc phần mềm & Mẫu thiết kế', condition: 'Tiên quyết trực tiếp Kỳ 6', icon: 'lock_open' },
      { code: 'IT6040', name: 'Kiểm thử phần mềm tự động', condition: 'Tiên quyết Kỳ 7', icon: 'lock_open' }
    ],
    lecturer: 'PGS.TS. Trần Đình Thắng - Trưởng BM KTPM',
    advice: 'Quy trình làm việc nhóm và kỹ năng viết đặc tả SRS đã đạt chuẩn yêu cầu chuyên ngành.'
  },
  IT6008: {
    code: 'IT6008',
    name: 'Mạng máy tính cơ sở',
    credits: '3 Tín chỉ (2 LT + 1 TH)',
    type: 'Cơ sở nhóm ngành CNTT',
    semester: 'Học kỳ 4 (2022 - 2023)',
    status: 'Đã hoàn thành',
    statusClass: 'haui-badge--success',
    progress: '7.5 / 10',
    gradeEst: 'Điểm tổng kết: 7.5 (Điểm B)',
    desc: 'Kiến trúc phân tầng OSI và TCP/IP, cấu hình mạng con IPv4/IPv6, định tuyến định hướng, giao thức tầng ứng dụng HTTP, DNS, DHCP và an toàn mạng cơ bản.',
    prereqStatus: 'Đã đáp ứng tất cả (1/1)',
    prereqs: [
      { code: 'IT1001', name: 'Nhập môn lập trình', grade: '9.0 (Điểm A)', tag: 'Môn học trước', icon: 'check_circle', color: '#16a34a' }
    ],
    unlocks: [
      { code: 'IT6015', name: 'Lập trình Web nâng cao', condition: 'Kiến thức mạng cho WebSockets & API', icon: 'lock_open' }
    ],
    lecturer: 'TS. Phạm Văn Bình - Bộ môn MMT',
    advice: 'Đã đáp ứng đủ chuẩn kiến thức mạng máy tính phục vụ xây dựng ứng dụng Web phân tán.'
  },
  IT6011: {
    code: 'IT6011',
    name: 'Phân tích & TK Hệ thống',
    credits: '3 Tín chỉ (2.5 LT + 0.5 BT lớn)',
    type: 'Chuyên ngành KTPM',
    semester: 'Học kỳ 5 (2023 - 2024)',
    status: 'Đã hoàn thành',
    statusClass: 'haui-badge--success',
    progress: '8.4 / 10',
    gradeEst: 'Điểm tổng kết: 8.4 (Điểm B+)',
    desc: 'Mô hình hóa hệ thống bằng UML 2.0 (Use case, Class, Sequence, Activity Diagram), phân tích ca sử dụng và thiết kế kiến trúc hệ thống thông tin doanh nghiệp.',
    prereqStatus: 'Đã đáp ứng tất cả (2/2)',
    prereqs: [
      { code: 'IT6004', name: 'Công nghệ phần mềm', grade: '8.5 (Điểm A)', tag: 'Môn tiên quyết', icon: 'check_circle', color: '#16a34a' },
      { code: 'IT6005', name: 'Cơ sở dữ liệu', grade: '8.0 (Điểm B+)', tag: 'Môn học trước', icon: 'check_circle', color: '#16a34a' }
    ],
    unlocks: [
      { code: 'IT6080', name: 'Đồ án chuyên ngành KTPM', condition: 'Tài liệu phân tích hệ thống Kỳ 7', icon: 'lock_open' }
    ],
    lecturer: 'TS. Hoàng Quang Huy - Bộ môn KTPM',
    advice: 'Sử dụng các sơ đồ UML từ bài tập lớn môn này làm bộ khung phân tích cho Đồ án chuyên ngành.'
  },
  IT6012: {
    code: 'IT6012',
    name: 'Hệ quản trị CSDL (Oracle/SQL)',
    credits: '3 Tín chỉ (2 LT + 1 TH)',
    type: 'Chuyên ngành KTPM',
    semester: 'Học kỳ 5 (2023 - 2024)',
    status: 'Đã hoàn thành',
    statusClass: 'haui-badge--success',
    progress: '8.6 / 10',
    gradeEst: 'Điểm tổng kết: 8.6 (Điểm A)',
    desc: 'Quản trị CSDL nâng cao, lập trình T-SQL / PL-SQL, Trigger, Stored Procedure, Transaction & Concurrency Control, lập chỉ mục (Indexing) và tối ưu hóa câu truy vấn.',
    prereqStatus: 'Đã đáp ứng tất cả (1/1)',
    prereqs: [
      { code: 'IT6005', name: 'Cơ sở dữ liệu', grade: '8.0 (Điểm B+)', tag: 'Môn tiên quyết bắt buộc', icon: 'check_circle', color: '#16a34a' }
    ],
    unlocks: [
      { code: 'IT6015', name: 'Lập trình Web nâng cao', condition: 'Tích hợp ORM và CSDL Web', icon: 'lock_open' }
    ],
    lecturer: 'TS. Nguyễn Thị Thu - Bộ môn HTTT',
    advice: 'Kỹ năng viết Stored Procedure và Transaction của bạn rất tốt, hãy áp dụng vào phần quản trị dữ liệu đồ án.'
  },
  IT6015: {
    code: 'IT6015',
    name: 'Lập trình Web nâng cao',
    credits: '3 Tín chỉ (2 Lý thuyết + 1 Thực hành)',
    type: 'Chuyên ngành bắt buộc (KTPM)',
    semester: 'Học kỳ 6 (2023 - 2024)',
    status: 'Đang học',
    statusClass: 'haui-badge--primary',
    progress: '8.5 / 10',
    gradeEst: 'Dự kiến Đạt: A / A+',
    desc: 'Trang bị kiến thức chuyên sâu về kiến trúc Web hiện đại: Microservices, RESTful API, Single Page Applications (Next.js/React), WebSockets, cơ chế Authentication (OAuth2, JWT) và triển khai CI/CD trên nền tảng đám mây.',
    prereqStatus: 'Đã đáp ứng tất cả (2/2)',
    prereqs: [
      { code: 'IT6002', name: 'Lập trình Web cơ bản', grade: '8.8 (Điểm A)', tag: 'Môn tiên quyết bắt buộc', icon: 'check_circle', color: '#16a34a' },
      { code: 'IT6005', name: 'Cơ sở dữ liệu nâng cao', grade: '8.0 (Điểm B+)', tag: 'Môn học trước', icon: 'check_circle', color: '#16a34a' }
    ],
    unlocks: [
      { code: 'IT6080', name: 'Đồ án chuyên ngành KTPM', condition: 'Cần đạt ≥ D (Đăng ký Kỳ 7)', icon: 'schedule' },
      { code: 'IT6099', name: 'Khóa luận tốt nghiệp KTPM', condition: 'Hoàn thành đủ điều kiện chuyên ngành', icon: 'lock_open' }
    ],
    lecturer: 'TS. Nguyễn Mạnh Hùng - Bộ môn CNPM',
    advice: 'Bạn nên duy trì điểm quá trình môn IT6015 trên 8.0 để đủ điều kiện nhận đề tài Khóa luận độc lập cùng BM Công nghệ Phần mềm ở Học kỳ 8.'
  },
  IT6025: {
    code: 'IT6025',
    name: 'Kiến trúc PM & Mẫu thiết kế',
    credits: '3 Tín chỉ (2.5 Lý thuyết + 0.5 BT lớn)',
    type: 'Chuyên ngành bắt buộc',
    semester: 'Học kỳ 6 (2023 - 2024)',
    status: 'Đang học',
    statusClass: 'haui-badge--primary',
    progress: '8.2 / 10',
    gradeEst: 'Dự kiến Đạt: B+ / A',
    desc: 'Nghiên cứu các mẫu thiết kế hướng đối tượng (GoF Design Patterns), Clean Architecture, Domain-Driven Design (DDD), phân tích hệ thống phân tán chịu tải cao và quy chuẩn thiết kế Enterprise Software.',
    prereqStatus: 'Đã đáp ứng tất cả (2/2)',
    prereqs: [
      { code: 'IT6004', name: 'Công nghệ phần mềm', grade: '8.5 (Điểm A)', tag: 'Môn tiên quyết bắt buộc', icon: 'check_circle', color: '#16a34a' },
      { code: 'IT6003', name: 'Cấu trúc dữ liệu & GT', grade: '8.2 (Điểm B+)', tag: 'Môn học trước', icon: 'check_circle', color: '#16a34a' }
    ],
    unlocks: [
      { code: 'IT6080', name: 'Đồ án chuyên ngành KTPM', condition: 'Điều kiện cốt lõi kỳ 7', icon: 'schedule' },
      { code: 'IT6090', name: 'Kiểm thử & Đảm bảo CLPM', condition: 'Môn chuyên ngành tự chọn', icon: 'lock_open' }
    ],
    lecturer: 'PGS.TS. Trần Đình Thắng - Trưởng BM KTPM',
    advice: 'Môn học cốt lõi cho các kỳ phỏng vấn tuyển dụng vị trí Software Engineer / Backend Developer tại các doanh nghiệp đối tác.'
  },
  IT6030: {
    code: 'IT6030',
    name: 'Phát triển ứng dụng Di động',
    credits: '3 Tín chỉ (2 LT + 1 TH)',
    type: 'Tự chọn chuyên ngành',
    semester: 'Học kỳ 6 (2023 - 2024)',
    status: 'Đang học',
    statusClass: 'haui-badge--primary',
    progress: '8.0 / 10',
    gradeEst: 'Dự kiến Đạt: B+ / A',
    desc: 'Lập trình ứng dụng di động đa nền tảng với Flutter/Dart và native Android (Kotlin), vòng đời Activity/Fragment, quản trị trạng thái (Bloc/Provider) và kết nối REST API.',
    prereqStatus: 'Đã đáp ứng tất cả (1/1)',
    prereqs: [
      { code: 'IT6001', name: 'Lập trình Hướng đối tượng', grade: '9.0 (Điểm A)', tag: 'Môn tiên quyết', icon: 'check_circle', color: '#16a34a' }
    ],
    unlocks: [
      { code: 'IT6080', name: 'Đồ án chuyên ngành KTPM', condition: 'Có thể chọn hướng Mobile App', icon: 'schedule' }
    ],
    lecturer: 'ThS. Đặng Việt Dũng - Bộ môn CNPM',
    advice: 'Tích lũy sản phẩm đồ án môn học để đưa vào CV ứng tuyển thực tập doanh nghiệp ở kỳ 7.'
  },
  IT6080: {
    code: 'IT6080',
    name: 'Đồ án chuyên ngành KTPM',
    credits: '3 Tín chỉ (Đồ án thực nghiệm)',
    type: 'Thực tập & Đồ án',
    semester: 'Học kỳ 7 (Dự kiến mở)',
    status: 'Đủ điều kiện đăng ký',
    statusClass: 'haui-badge--neutral',
    progress: 'Chưa có điểm',
    gradeEst: 'Mục tiêu: A (≥ 8.5)',
    desc: 'Thực hiện đồ án nghiên cứu phát triển một sản phẩm phần mềm thực tế theo nhóm (Scrum/Agile), ứng dụng công nghệ Microservices, DevOps và bảo vệ trước hội đồng khoa.',
    prereqStatus: 'Đang chờ hoàn thành kỳ 6',
    prereqs: [
      { code: 'IT6015', name: 'Lập trình Web nâng cao', grade: 'Đang học (Kỳ 6)', tag: 'Tiên quyết cốt lõi', icon: 'pending', color: '#737373' },
      { code: 'IT6025', name: 'Kiến trúc phần mềm', grade: 'Đang học (Kỳ 6)', tag: 'Tiên quyết cốt lõi', icon: 'pending', color: '#737373' }
    ],
    unlocks: [
      { code: 'IT6099', name: 'Khóa luận tốt nghiệp KTPM', condition: 'Bắt buộc qua đồ án ngành', icon: 'lock' }
    ],
    lecturer: 'Hội đồng Khoa CNTT - HaUI',
    advice: 'Cần hoàn thành đạt điểm 2 môn tiên quyết IT6015 và IT6025 trong học kỳ 6 này để được cấp quyền đăng ký IT6080 đầu kỳ 7.'
  },
  IT6040: {
    code: 'IT6040',
    name: 'Kiểm thử phần mềm tự động',
    credits: '3 Tín chỉ (2 LT + 1 TH)',
    type: 'Chuyên ngành KTPM',
    semester: 'Học kỳ 7 (Dự kiến mở)',
    status: 'Đủ điều kiện đăng ký',
    statusClass: 'haui-badge--neutral',
    progress: 'Chưa có điểm',
    gradeEst: 'Mục tiêu: B+ / A',
    desc: 'Kỹ thuật kiểm thử tự động với Selenium, Cypress, JUnit, TestNG; kiểm thử API với Postman/RestAssured; xây dựng quy trình CI/CD tích hợp kiểm thử tự động.',
    prereqStatus: 'Đã hoàn thành tiên quyết',
    prereqs: [
      { code: 'IT6004', name: 'Công nghệ phần mềm', grade: '8.5 (Điểm A)', tag: 'Môn tiên quyết', icon: 'check_circle', color: '#16a34a' }
    ],
    unlocks: [
      { code: 'IT6099', name: 'Khóa luận tốt nghiệp KTPM', condition: 'Phần kiểm thử của đồ án tốt nghiệp', icon: 'lock_open' }
    ],
    lecturer: 'TS. Trần Văn Minh - Bộ môn KTPM',
    advice: 'Học phần bổ trợ thực chiến rất tốt cho kỹ sư phần mềm trước khi ra trường.'
  },
  IT6090: {
    code: 'IT6090',
    name: 'Thực tập tốt nghiệp DN',
    credits: '4 Tín chỉ (Thực tập thực tế)',
    type: 'Thực tập doanh nghiệp',
    semester: 'Học kỳ 7 (Dự kiến mở)',
    status: 'Đủ điều kiện đăng ký',
    statusClass: 'haui-badge--neutral',
    progress: 'Chưa có điểm',
    gradeEst: 'Mục tiêu: Đạt loại Xuất sắc',
    desc: 'Thực tập toàn thời gian tại các doanh nghiệp đối tác của HaUI (Viettel, FPT Software, CMC, VNPAY...), trực tiếp tham gia dự án phần mềm thực tế và viết báo cáo thực tập.',
    prereqStatus: 'Đã hoàn thành > 90 tín chỉ',
    prereqs: [
      { code: 'TCTL90', name: 'Tích lũy tối thiểu 90 tín chỉ', grade: 'Hiện đạt: 108 / 90 TC', tag: 'Điều kiện tiên quyết', icon: 'check_circle', color: '#16a34a' }
    ],
    unlocks: [
      { code: 'IT6099', name: 'Khóa luận tốt nghiệp KTPM', condition: 'Bắt buộc hoàn thành thực tập', icon: 'lock_open' }
    ],
    lecturer: 'Khoa CNTT & Doanh nghiệp đối tác',
    advice: 'Chuẩn bị hồ sơ CV và nộp giấy tiếp nhận thực tập của công ty cho giáo vụ khoa trước tuần 2 của kỳ 7.'
  },
  IT6099: {
    code: 'IT6099',
    name: 'Khóa luận tốt nghiệp (KTPM)',
    credits: '10 Tín chỉ (Bảo vệ đồ án)',
    type: 'Tốt nghiệp',
    semester: 'Học kỳ 8 (Khóa K16)',
    status: 'Chưa đủ điều kiện (Khóa)',
    statusClass: 'haui-badge--warning',
    progress: '0 / 10',
    gradeEst: 'Yêu cầu tích lũy: CPA ≥ 2.50',
    desc: 'Công trình tốt nghiệp đại học hệ chính quy 4 năm ngành Kỹ thuật Phần mềm. Đòi hỏi hoàn thành đầy đủ 135 tín chỉ tiên quyết cùng các chứng chỉ tiếng Anh B1, Tin học chuẩn HaUI.',
    prereqStatus: 'Thiếu 2 điều kiện tiên quyết',
    prereqs: [
      { code: 'IT6080', name: 'Đồ án chuyên ngành KTPM', grade: 'Chưa học (Kỳ 7)', tag: 'Tiên quyết bắt buộc', icon: 'lock', color: '#e7000b' },
      { code: 'TCTL', name: 'Tích lũy tối thiểu 125 TC', grade: 'Hiện đạt: 108 / 125', tag: 'Điều kiện tín chỉ', icon: 'lock', color: '#e7000b' }
    ],
    unlocks: [
      { code: 'GRAD', name: 'Xét tốt nghiệp Kỹ sư CNTT', condition: 'Hoàn thành chương trình', icon: 'verified' }
    ],
    lecturer: 'Hội đồng Bảo vệ Tốt nghiệp Khoa CNTT',
    advice: 'Cần duy trì CPA ≥ 2.50 và hoàn tất toàn bộ học phần nợ trước khi nộp đơn xin nhận đề tài tốt nghiệp.'
  }
});

/**
 * 6 Học kỳ chính trong Sơ đồ luồng (Flowchart Timeline) chuẩn prototype
 */
const TIMELINE_SEMESTERS = [
  {
    semester: 3,
    label: 'Học kỳ 3 (Năm 2)',
    meta: '19 TC (Xong)',
    courses: [
      { code: 'IT6003', name: 'Cấu trúc dữ liệu & Giải thuật', block: 'Cơ sở nhóm ngành', credits: 3, statusText: 'Đạt: 8.2 (B+)', statusType: 'passed' },
      { code: 'IT6001', name: 'Lập trình Hướng đối tượng (Java)', block: 'Cơ sở nhóm ngành', credits: 3, statusText: 'Đạt: 9.0 (A)', statusType: 'passed' },
      { code: 'IT6005', name: 'Cơ sở dữ liệu', block: 'Cơ sở nhóm ngành', credits: 3, statusText: 'Đạt: 8.0 (B+)', statusType: 'passed' }
    ]
  },
  {
    semester: 4,
    label: 'Học kỳ 4 (Năm 2)',
    meta: '18 TC (Xong)',
    courses: [
      { code: 'IT6002', name: 'Lập trình Web cơ bản', block: 'Tiên quyết cho IT6015', credits: 3, statusText: 'Đạt: 8.8 (A)', statusType: 'passed' },
      { code: 'IT6004', name: 'Công nghệ phần mềm', block: 'Bắt buộc ngành KTPM', credits: 3, statusText: 'Đạt: 8.5 (A)', statusType: 'passed' },
      { code: 'IT6008', name: 'Mạng máy tính cơ sở', block: 'Cơ sở nhóm ngành', credits: 3, statusText: 'Đạt: 7.5 (B)', statusType: 'passed' }
    ]
  },
  {
    semester: 5,
    label: 'Học kỳ 5 (Năm 3)',
    meta: '17 TC (Xong)',
    courses: [
      { code: 'IT6011', name: 'Phân tích & TK Hệ thống', block: 'Chuyên ngành KTPM', credits: 3, statusText: 'Đạt: 8.4 (B+)', statusType: 'passed' },
      { code: 'IT6012', name: 'Hệ quản trị CSDL (Oracle/SQL)', block: 'Chuyên ngành KTPM', credits: 3, statusText: 'Đạt: 8.6 (A)', statusType: 'passed' }
    ]
  },
  {
    semester: 6,
    label: 'Học kỳ 6 (Hiện tại)',
    meta: '14 TC',
    isCurrent: true,
    courses: [
      { code: 'IT6015', name: 'Lập trình Web nâng cao', block: 'KTPM Bắt buộc', credits: 3, statusText: 'Đang học • QT 8.5', statusType: 'studying' },
      { code: 'IT6025', name: 'Kiến trúc PM & Mẫu thiết kế', block: 'KTPM Bắt buộc', credits: 3, statusText: 'Đang học • QT 8.2', statusType: 'studying' },
      { code: 'IT6030', name: 'Phát triển ứng dụng Di động', block: 'Tự chọn chuyên ngành', credits: 3, statusText: 'Đang học • QT 8.0', statusType: 'studying' }
    ]
  },
  {
    semester: 7,
    label: 'Học kỳ 7 (Kế tiếp)',
    meta: '16 TC (Dự kiến)',
    courses: [
      { code: 'IT6080', name: 'Đồ án chuyên ngành KTPM', block: 'Tiên quyết: IT6015, IT6025', credits: 3, statusText: 'Đủ điều kiện đăng ký', statusType: 'eligible', dashed: true },
      { code: 'IT6040', name: 'Kiểm thử phần mềm tự động', block: 'Chuyên ngành KTPM', credits: 3, statusText: 'Đủ điều kiện đăng ký', statusType: 'eligible', dashed: true },
      { code: 'IT6090', name: 'Thực tập tốt nghiệp DN', block: 'Tích lũy > 90 tín chỉ', credits: 4, statusText: 'Đủ điều kiện đăng ký', statusType: 'eligible', dashed: true }
    ]
  },
  {
    semester: 8,
    label: 'Học kỳ 8 (Tốt nghiệp)',
    meta: '12 TC',
    courses: [
      { code: 'IT6099', name: 'Khóa luận tốt nghiệp KTPM', block: 'Tiên quyết: Đồ án ngành + CPA ≥ 2.5', credits: 10, statusText: 'Chưa đủ điều kiện (Khóa)', statusType: 'locked' }
    ]
  }
];

export function CurriculumTreePage() {
  const navigate = useNavigate();
  const timelineScrollRef = useRef(null);

  // Chế độ xem: 'flowchart' (Sơ đồ luồng) | 'table' (Dạng bảng)
  const [viewMode, setViewMode] = useState('flowchart');

  // Chế độ hiển thị mạng lưới: 'all' (Tất cả môn) | 'tracer' (Chỉ tô sáng luồng môn đang chọn)
  const [tracerMode, setTracerMode] = useState('all');

  // Bộ lọc
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [blockFilter, setBlockFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Học phần đang được chọn trên Sơ đồ cây (mặc định IT6015 như prototype)
  const [selectedCourseCode, setSelectedCourseCode] = useState('IT6015');

  // State kiểm tra điều kiện tiên quyết (POST /api/v1/academic/eligibility)
  const [eligibilityModalOpen, setEligibilityModalOpen] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [eligibilityError, setEligibilityError] = useState(null);

  const selectedCourse = PROTOTYPE_COURSE_DETAILS[selectedCourseCode] || PROTOTYPE_COURSE_DETAILS.IT6015;

  // Lấy danh sách mã môn tiên quyết và môn phụ thuộc của môn đang chọn
  const activePrereqCodes = new Set(selectedCourse.prereqs?.map((p) => p.code) || []);
  const activeUnlockCodes = new Set(selectedCourse.unlocks?.map((u) => u.code) || []);

  const handleSelectCourse = (code) => {
    setSelectedCourseCode(code);
  };

  const handleScrollToCurrent = () => {
    if (timelineScrollRef.current) {
      // Cuộn đến cột học kỳ 6 (khoảng giữa)
      timelineScrollRef.current.scrollTo({ left: 680, behavior: 'smooth' });
    }
  };

  const handleScrollLeft = () => {
    if (timelineScrollRef.current) {
      timelineScrollRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (timelineScrollRef.current) {
      timelineScrollRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  const handleCheckCourseEligibility = async (courseCode) => {
    setSelectedCourseCode(courseCode);
    setEligibilityModalOpen(true);
    setCheckingEligibility(true);
    setEligibilityError(null);
    setEligibilityResult(null);

    try {
      const res = await api.academic.checkEligibility({ courseCode });
      setEligibilityResult(res);
    } catch (err) {
      setEligibilityError(err);
    } finally {
      setCheckingEligibility(false);
    }
  };

  const handleAddCourseToPlanner = (courseCode) => {
    const activePlanId = 'plan-2026-9001';
    navigate(`/planner?course_id=${encodeURIComponent(courseCode)}&plan_id=${encodeURIComponent(activePlanId)}`);
  };

  // Lọc các học kỳ và môn học theo bộ lọc
  const filteredTimeline = TIMELINE_SEMESTERS.map((sem) => {
    if (semesterFilter !== 'all' && String(sem.semester) !== String(semesterFilter)) {
      return null;
    }
    const matchingCourses = sem.courses.filter((c) => {
      if (statusFilter !== 'all' && c.statusType !== statusFilter) return false;
      if (blockFilter !== 'all') {
        const details = PROTOTYPE_COURSE_DETAILS[c.code];
        if (blockFilter === 'major' && !details?.type?.includes('Chuyên ngành')) return false;
        if (blockFilter === 'core' && !details?.type?.includes('Cơ sở')) return false;
        if (blockFilter === 'elective' && !details?.type?.includes('Tự chọn')) return false;
        if (blockFilter === 'internship' && !details?.type?.includes('Thực tập') && !details?.type?.includes('Tốt nghiệp')) return false;
      }
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const codeMatch = c.code.toLowerCase().includes(q);
        const nameMatch = c.name.toLowerCase().includes(q);
        if (!codeMatch && !nameMatch) return false;
      }
      return true;
    });

    if (matchingCourses.length === 0 && (statusFilter !== 'all' || blockFilter !== 'all' || searchTerm)) {
      return null;
    }

    return {
      ...sem,
      courses: matchingCourses
    };
  }).filter(Boolean);

  // Flattened courses cho Table view
  const allCoursesFlat = Object.values(PROTOTYPE_COURSE_DETAILS);

  const tableColumns = [
    {
      key: 'code',
      title: 'Mã HP',
      width: '110px',
      render: (val) => <strong style={{ fontFamily: 'var(--font-mono, monospace)', color: 'var(--color-ink)' }}>{val}</strong>
    },
    {
      key: 'name',
      title: 'Tên học phần',
      render: (val) => <span style={{ fontWeight: 500, color: 'var(--color-ink)' }}>{val}</span>
    },
    {
      key: 'credits',
      title: 'Khối lượng tín chỉ',
      width: '180px',
      render: (val) => <span style={{ fontSize: '13px', color: 'var(--color-mid-gray)' }}>{val}</span>
    },
    {
      key: 'semester',
      title: 'Học kỳ',
      width: '160px',
      render: (val) => <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', color: 'var(--color-ink)' }}>{val}</span>
    },
    {
      key: 'status',
      title: 'Trạng thái',
      width: '150px',
      render: (st, row) => (
        <span className={`haui-badge ${row.statusClass || 'haui-badge--neutral'}`}>{st}</span>
      )
    },
    {
      key: 'actions',
      title: 'Thao tác',
      align: 'right',
      width: '140px',
      render: (_, row) => (
        <button
          type="button"
          className="haui-pill-btn-canvas"
          style={{ fontSize: '12px', padding: '4px 12px' }}
          onClick={() => {
            setSelectedCourseCode(row.code);
            setViewMode('flowchart');
          }}
        >
          Xem luồng &rarr;
        </button>
      )
    }
  ];

  return (
    <div className="haui-page-container" style={{ maxWidth: '1720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* =========================================================================
          SECTION 1: BREADCRUMB & PAGE TITLE & CONTROLS
          ========================================================================= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-mid-gray)' }}>
          <span
            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'inherit' }}
            onClick={() => navigate('/')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>home</span>
            Trang chủ
          </span>
          <span style={{ color: 'var(--color-hairline)' }}>/</span>
          <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>Cây môn học &amp; Lộ trình tiên quyết</span>
        </nav>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', paddingTop: '4px' }}>
          <div>
            <h1 style={{ fontSize: '30px', fontWeight: 600, color: 'var(--color-ink)', margin: 0, letterSpacing: '-0.5px' }}>
              Cây môn học &amp; Sơ đồ tiên quyết
            </h1>
          </div>

          {/* Export & Flow Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', padding: '3px', backgroundColor: 'var(--color-canvas)', borderRadius: '9999px', border: '1px solid var(--color-hairline)' }}>
              <button
                type="button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  border: 'none',
                  backgroundColor: viewMode === 'flowchart' ? 'var(--color-paper)' : 'transparent',
                  color: viewMode === 'flowchart' ? 'var(--color-ink)' : 'var(--color-mid-gray)',
                  fontWeight: viewMode === 'flowchart' ? 600 : 400,
                  fontSize: '12px',
                  cursor: 'pointer',
                  boxShadow: viewMode === 'flowchart' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                  transition: 'all 150ms'
                }}
                onClick={() => setViewMode('flowchart')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>account_tree</span>
                <span>Sơ đồ luồng (Flowchart)</span>
              </button>
              <button
                type="button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  border: 'none',
                  backgroundColor: viewMode === 'table' ? 'var(--color-paper)' : 'transparent',
                  color: viewMode === 'table' ? 'var(--color-ink)' : 'var(--color-mid-gray)',
                  fontWeight: viewMode === 'table' ? 600 : 400,
                  fontSize: '12px',
                  cursor: 'pointer',
                  boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                  transition: 'all 150ms'
                }}
                onClick={() => setViewMode('table')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>view_list</span>
                <span>Dạng bảng</span>
              </button>
            </div>

            <button
              type="button"
              className="haui-pill-btn-paper"
              onClick={() => setSelectedCourseCode('IT6015')}
              title="Làm mới trạng thái sơ đồ"
              style={{ padding: '8px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
            </button>

            <button
              type="button"
              className="haui-pill-btn-dark"
              onClick={() => window.print()}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
              <span>Xuất lộ trình PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 2: 4 FAST STATS COUNTER BADGES (Chuẩn 100% Stitch Prototype)
          ========================================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {/* Thẻ 1: Đã hoàn thành */}
        <div style={{ backgroundColor: 'var(--color-paper)', padding: '16px 20px', borderRadius: '24px', border: '1px solid var(--color-hairline)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--color-canvas)', color: 'var(--color-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>check_circle</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-mid-gray)', fontWeight: 600 }}>ĐÃ HOÀN THÀNH</p>
            <p style={{ margin: '4px 0 2px', fontSize: '24px', fontWeight: 700, color: 'var(--color-ink)', lineHeight: 1 }}>28 môn</p>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-mid-gray)', fontWeight: 500 }}>
              82 tín chỉ · <strong style={{ color: 'var(--color-ink)' }}>56,5%</strong>
            </p>
          </div>
        </div>

        {/* Thẻ 2: Đang theo học */}
        <div style={{ backgroundColor: 'var(--color-paper)', padding: '16px 20px', borderRadius: '24px', border: '1px solid var(--color-hairline)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--color-canvas)', color: 'var(--color-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>menu_book</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-mid-gray)', fontWeight: 600 }}>ĐANG THEO HỌC</p>
            <p style={{ margin: '4px 0 2px', fontSize: '24px', fontWeight: 700, color: 'var(--color-ink)', lineHeight: 1 }}>5 môn</p>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-mid-gray)', fontWeight: 500 }}>14 tín chỉ · Kỳ 6 hiện tại</p>
          </div>
        </div>

        {/* Thẻ 3: Đủ điều kiện đăng ký */}
        <div style={{ backgroundColor: 'var(--color-paper)', padding: '16px 20px', borderRadius: '24px', border: '1px solid var(--color-hairline)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--color-canvas)', color: 'var(--color-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>how_to_reg</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-mid-gray)', fontWeight: 600 }}>ĐỦ ĐIỀU KIỆN ĐĂNG KÝ</p>
            <p style={{ margin: '4px 0 2px', fontSize: '24px', fontWeight: 700, color: 'var(--color-ink)', lineHeight: 1 }}>12 môn</p>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-mid-gray)', fontWeight: 500 }}>34 tín chỉ (7 môn sẵn sàng)</p>
          </div>
        </div>

        {/* Thẻ 4: Chưa đủ điều kiện (Khóa) */}
        <div style={{ backgroundColor: 'var(--color-paper)', padding: '16px 20px', borderRadius: '24px', border: '1px solid var(--color-hairline)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--color-canvas)', color: 'var(--color-mid-gray)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>lock</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-mid-gray)', fontWeight: 600 }}>CHƯA ĐỦ ĐIỀU KIỆN</p>
              <span style={{ backgroundColor: 'var(--color-ink)', color: 'var(--color-paper)', fontSize: '10px', padding: '2px 8px', borderRadius: '9999px', fontWeight: 600 }}>Khóa</span>
            </div>
            <p style={{ margin: '4px 0 2px', fontSize: '24px', fontWeight: 700, color: 'var(--color-ink)', lineHeight: 1 }}>6 môn</p>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-mid-gray)', fontWeight: 500 }}>15 tín chỉ · Thiếu tiên quyết</p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 3: SMART FILTER TOOLBAR & VISUAL LEGEND
          ========================================================================= */}
      <div style={{ backgroundColor: 'var(--color-paper)', borderRadius: '24px', border: '1px solid var(--color-hairline)', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          {/* Selectors */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
            {/* Semester filter */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--color-canvas)', padding: '6px 14px', borderRadius: '9999px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-mid-gray)' }}>Học kỳ:</span>
              <select
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value)}
                style={{ backgroundColor: 'transparent', border: 'none', fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', outline: 'none', cursor: 'pointer' }}
              >
                <option value="all">Tất cả kỳ (1 - 8)</option>
                <option value="3">Kỳ 3 (Năm 2)</option>
                <option value="4">Kỳ 4 (Năm 2)</option>
                <option value="5">Kỳ 5 (Năm 3)</option>
                <option value="6">Kỳ 6 (Hiện tại)</option>
                <option value="7">Kỳ 7 (Kế tiếp)</option>
                <option value="8">Kỳ 8 (Tốt nghiệp)</option>
              </select>
            </div>

            {/* Block filter */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--color-canvas)', padding: '6px 14px', borderRadius: '9999px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-mid-gray)' }}>Khối kiến thức:</span>
              <select
                value={blockFilter}
                onChange={(e) => setBlockFilter(e.target.value)}
                style={{ backgroundColor: 'transparent', border: 'none', fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', outline: 'none', cursor: 'pointer' }}
              >
                <option value="all">Tất cả khối</option>
                <option value="core">Cơ sở nhóm ngành CNTT</option>
                <option value="major">Chuyên ngành Kỹ thuật Phần mềm</option>
                <option value="elective">Tự chọn chuyên ngành</option>
                <option value="internship">Thực tập doanh nghiệp &amp; Khóa luận</option>
              </select>
            </div>

            {/* Status filter */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--color-canvas)', padding: '6px 14px', borderRadius: '9999px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-mid-gray)' }}>Trạng thái:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ backgroundColor: 'transparent', border: 'none', fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', outline: 'none', cursor: 'pointer' }}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="passed">Đã hoàn thành</option>
                <option value="studying">Đang học</option>
                <option value="eligible">Đủ ĐK đăng ký</option>
                <option value="locked">Khóa (Thiếu môn trước)</option>
              </select>
            </div>
          </div>

          {/* Quick search input */}
          <div style={{ position: 'relative', width: '320px' }}>
            <span className="material-symbols-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', color: 'var(--color-mid-gray)' }}>
              search
            </span>
            <input
              type="text"
              placeholder="Tìm môn trên sơ đồ (VD: IT6015, Giải thuật...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--color-canvas)',
                border: 'none',
                borderRadius: '9999px',
                padding: '8px 14px 8px 36px',
                fontSize: '13px',
                color: 'var(--color-ink)',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Legend bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', paddingTop: '10px', borderTop: '1px solid var(--color-hairline)', fontSize: '12px', color: 'var(--color-mid-gray)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>Chú thích sơ đồ:</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--color-paper)', border: '1px solid var(--color-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, color: 'var(--color-ink)' }}>✓</span>
              Đã hoàn thành
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--color-ink)' }} />
              Đang học
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--color-canvas)', border: '1px solid var(--color-mid-gray)' }} />
              Đủ điều kiện
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--color-mid-gray)' }}>lock</span>
              Khóa / Thiếu tiên quyết
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>⇢</span>
              Luồng môn tiên quyết
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>info</span>
            <span>Dữ liệu mẫu CTĐT K16 CNTT HaUI. Đối chiếu chính thức tại <strong>sv.haui.edu.vn</strong></span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 4: MAIN INTERACTIVE LAYOUT (FLOWCHART 8 COLS / DRAWER 4 COLS)
          ========================================================================= */}
      {viewMode === 'flowchart' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px', alignItems: 'start' }}>
          {/* Main Tree Map Area (8 cols) — Sơ đồ mạng lưới học phần tái thiết kế toàn diện */}
          <div
            style={{
              gridColumn: 'span 8',
              backgroundColor: 'var(--color-paper)',
              borderRadius: '24px',
              border: '1px solid var(--color-hairline)',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Map Header with Interactive Toolbar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--color-hairline)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--color-ink)', color: 'var(--color-paper)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>device_hub</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)' }}>Sơ đồ mạng lưới học phần (Theo kỳ)</span>
                  <span style={{ fontSize: '12px', color: 'var(--color-mid-gray)' }}>K16 CNTT (KTPM) · 6 Học kỳ hiển thị luồng hai chiều</span>
                </div>
              </div>

              {/* Mode Switcher & Quick Navigation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Tracer Mode Toggle */}
                <div style={{ display: 'inline-flex', padding: '2px', backgroundColor: 'var(--color-canvas)', borderRadius: '9999px', border: '1px solid var(--color-hairline)' }}>
                  <button
                    type="button"
                    onClick={() => setTracerMode('all')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: tracerMode === 'all' ? 600 : 400,
                      backgroundColor: tracerMode === 'all' ? 'var(--color-paper)' : 'transparent',
                      color: tracerMode === 'all' ? 'var(--color-ink)' : 'var(--color-mid-gray)',
                      cursor: 'pointer',
                      transition: 'all 150ms'
                    }}
                  >
                    Tất cả môn
                  </button>
                  <button
                    type="button"
                    onClick={() => setTracerMode('tracer')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: tracerMode === 'tracer' ? 600 : 400,
                      backgroundColor: tracerMode === 'tracer' ? 'var(--color-ink)' : 'transparent',
                      color: tracerMode === 'tracer' ? 'var(--color-paper)' : 'var(--color-mid-gray)',
                      cursor: 'pointer',
                      transition: 'all 150ms'
                    }}
                  >
                    🎯 Tô sáng luồng môn
                  </button>
                </div>

                {/* Quick Scroll Navigation Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={handleScrollLeft}
                    className="haui-pill-btn-canvas"
                    style={{ padding: '6px 10px', fontSize: '11px' }}
                    title="Cuộn về các kỳ trước"
                  >
                    &larr; Kỳ 3-4
                  </button>
                  <button
                    type="button"
                    onClick={handleScrollToCurrent}
                    className="haui-pill-btn-paper"
                    style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 600 }}
                    title="Cuộn đến Học kỳ 6 hiện tại"
                  >
                    ● Kỳ 6 (Hiện tại)
                  </button>
                  <button
                    type="button"
                    onClick={handleScrollRight}
                    className="haui-pill-btn-canvas"
                    style={{ padding: '6px 10px', fontSize: '11px' }}
                    title="Cuộn sang các kỳ sau"
                  >
                    Kỳ 7-8 &rarr;
                  </button>
                </div>
              </div>
            </div>

            {/* Current Selected Indicator Banner */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderRadius: '12px', backgroundColor: 'var(--color-canvas)', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-ember)' }} />
                <span style={{ color: 'var(--color-mid-gray)' }}>Đang chọn kiểm tra luồng:</span>
                <strong style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-mono, monospace)' }}>{selectedCourseCode}</strong>
                <span style={{ color: 'var(--color-ink)' }}>— {selectedCourse.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--color-mid-gray)' }}>
                <span>Tiên quyết: <strong style={{ color: '#16a34a' }}>{selectedCourse.prereqs?.length || 0} môn</strong></span>
                <span>•</span>
                <span>Mở khóa: <strong style={{ color: '#2563eb' }}>{selectedCourse.unlocks?.length || 0} môn</strong></span>
              </div>
            </div>

            {/* Horizontal Timeline Container with SVG Connectors Overlay */}
            <div
              ref={timelineScrollRef}
              className="haui-tree-timeline-scroll"
              style={{ position: 'relative' }}
            >
              {/* Background SVG Connectors Overlay — Các luồng liên kết tiên quyết được vẽ tinh tế */}
              <svg
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  zIndex: 0
                }}
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <marker id="tree-arrow-active" markerHeight="7" markerWidth="7" orient="auto-start-reverse" refX="6" refY="5" viewBox="0 0 10 10">
                    <path d="M 0 1 L 8 5 L 0 9 z" fill="#0a0a0a" />
                  </marker>
                  <marker id="tree-arrow-muted" markerHeight="6" markerWidth="6" orient="auto-start-reverse" refX="6" refY="5" viewBox="0 0 10 10">
                    <path d="M 0 1 L 8 5 L 0 9 z" fill="#a1a1aa" />
                  </marker>
                </defs>

                {/* Luồng 1: Lập trình Web: IT6001 (OOP) -> IT6002 (Web cơ bản) -> IT6015 (Web nâng cao) -> IT6080 -> IT6099 */}
                <path
                  d="M 240 185 C 265 185, 265 85, 290 85"
                  fill="none"
                  markerEnd={selectedCourseCode === 'IT6015' || selectedCourseCode === 'IT6002' ? 'url(#tree-arrow-active)' : 'url(#tree-arrow-muted)'}
                  stroke={selectedCourseCode === 'IT6015' || selectedCourseCode === 'IT6002' ? '#0a0a0a' : '#d4d4d8'}
                  strokeDasharray={selectedCourseCode === 'IT6015' ? 'none' : '3 3'}
                  strokeWidth={selectedCourseCode === 'IT6015' ? '2.5' : '1.5'}
                />
                <path
                  d="M 530 85 C 680 85, 690 95, 810 95"
                  fill="none"
                  markerEnd={selectedCourseCode === 'IT6015' ? 'url(#tree-arrow-active)' : 'url(#tree-arrow-muted)'}
                  stroke={selectedCourseCode === 'IT6015' ? '#0a0a0a' : '#d4d4d8'}
                  strokeDasharray={selectedCourseCode === 'IT6015' ? 'none' : '3 3'}
                  strokeWidth={selectedCourseCode === 'IT6015' ? '2.5' : '1.5'}
                />

                {/* Luồng 2: Công nghệ phần mềm: IT6003 (CTDL) -> IT6004 (CNPM) -> IT6025 (Kiến trúc PM) -> IT6080 */}
                <path
                  d="M 240 85 C 265 85, 265 185, 290 185"
                  fill="none"
                  markerEnd={selectedCourseCode === 'IT6025' || selectedCourseCode === 'IT6004' ? 'url(#tree-arrow-active)' : 'url(#tree-arrow-muted)'}
                  stroke={selectedCourseCode === 'IT6025' || selectedCourseCode === 'IT6004' ? '#0a0a0a' : '#d4d4d8'}
                  strokeDasharray={selectedCourseCode === 'IT6025' ? 'none' : '3 3'}
                  strokeWidth={selectedCourseCode === 'IT6025' ? '2.5' : '1.5'}
                />
                <path
                  d="M 530 185 C 680 185, 690 205, 810 205"
                  fill="none"
                  markerEnd={selectedCourseCode === 'IT6025' ? 'url(#tree-arrow-active)' : 'url(#tree-arrow-muted)'}
                  stroke={selectedCourseCode === 'IT6025' ? '#0a0a0a' : '#d4d4d8'}
                  strokeDasharray={selectedCourseCode === 'IT6025' ? 'none' : '3 3'}
                  strokeWidth={selectedCourseCode === 'IT6025' ? '2.5' : '1.5'}
                />

                {/* Luồng 3: CSDL & Phân tích: IT6005 -> IT6011 + IT6012 */}
                <path
                  d="M 240 285 C 400 285, 420 85, 550 85"
                  fill="none"
                  markerEnd={selectedCourseCode === 'IT6011' || selectedCourseCode === 'IT6005' ? 'url(#tree-arrow-active)' : 'url(#tree-arrow-muted)'}
                  stroke={selectedCourseCode === 'IT6011' || selectedCourseCode === 'IT6005' ? '#0a0a0a' : '#d4d4d8'}
                  strokeDasharray="3 3"
                  strokeWidth="1.5"
                />

                {/* Luồng 4: Đồ án ngành Kỳ 7: IT6015 + IT6025 -> IT6080 */}
                <path
                  d="M 1050 95 C 1075 95, 1075 85, 1090 85"
                  fill="none"
                  markerEnd={selectedCourseCode === 'IT6015' || selectedCourseCode === 'IT6080' ? 'url(#tree-arrow-active)' : 'url(#tree-arrow-muted)'}
                  stroke={selectedCourseCode === 'IT6015' || selectedCourseCode === 'IT6080' ? '#0a0a0a' : '#d4d4d8'}
                  strokeDasharray={selectedCourseCode === 'IT6080' ? 'none' : '3 3'}
                  strokeWidth={selectedCourseCode === 'IT6080' ? '2.5' : '1.5'}
                />
                <path
                  d="M 1050 205 C 1075 205, 1075 95, 1090 95"
                  fill="none"
                  markerEnd={selectedCourseCode === 'IT6025' || selectedCourseCode === 'IT6080' ? 'url(#tree-arrow-active)' : 'url(#tree-arrow-muted)'}
                  stroke={selectedCourseCode === 'IT6025' || selectedCourseCode === 'IT6080' ? '#0a0a0a' : '#d4d4d8'}
                  strokeDasharray={selectedCourseCode === 'IT6080' ? 'none' : '3 3'}
                  strokeWidth={selectedCourseCode === 'IT6080' ? '2.5' : '1.5'}
                />

                {/* Luồng 5: Khóa luận Kỳ 8: IT6080 -> IT6099 */}
                <path
                  d="M 1330 85 C 1350 85, 1350 85, 1370 85"
                  fill="none"
                  markerEnd={selectedCourseCode === 'IT6080' || selectedCourseCode === 'IT6099' ? 'url(#tree-arrow-active)' : 'url(#tree-arrow-muted)'}
                  stroke={selectedCourseCode === 'IT6099' ? '#0a0a0a' : '#d4d4d8'}
                  strokeDasharray="3 3"
                  strokeWidth="1.5"
                />
              </svg>

              {/* Semesters Columns Flex Layout */}
              <div style={{ display: 'flex', gap: '24px', minWidth: '1480px', position: 'relative', zIndex: 1 }}>
                {filteredTimeline.map((sem) => {
                  const isCurrent = sem.isCurrent;
                  return (
                    <div
                      key={sem.semester}
                      style={{
                        width: '240px',
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        backgroundColor: isCurrent ? 'rgba(245, 245, 245, 0.75)' : 'transparent',
                        padding: isCurrent ? '12px' : '0',
                        borderRadius: isCurrent ? '20px' : '0',
                        border: isCurrent ? '2px solid rgba(10, 10, 10, 0.15)' : 'none'
                      }}
                    >
                      {/* Semester Column Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--color-hairline)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {isCurrent && (
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-ink)' }} />
                          )}
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>{sem.label}</span>
                        </div>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '9999px', backgroundColor: isCurrent ? 'var(--color-ink)' : 'var(--color-canvas)', color: isCurrent ? 'var(--color-paper)' : 'var(--color-mid-gray)', fontWeight: 500 }}>
                          {sem.meta}
                        </span>
                      </div>

                      {/* Course Cards inside Semester */}
                      {sem.courses.map((course) => {
                        const isSelected = selectedCourseCode === course.code;
                        const isPrereq = activePrereqCodes.has(course.code);
                        const isUnlock = activeUnlockCodes.has(course.code);
                        const isDimmed = tracerMode === 'tracer' && !isSelected && !isPrereq && !isUnlock;

                        let cardClass = 'haui-tree-map-card';
                        if (isSelected) cardClass += ' haui-tree-map-card--active';
                        else if (isPrereq) cardClass += ' haui-tree-map-card--prereq';
                        else if (isUnlock) cardClass += ' haui-tree-map-card--unlock';
                        else if (isDimmed) cardClass += ' haui-tree-map-card--dimmed';

                        return (
                          <div
                            key={course.code}
                            className={cardClass}
                            onClick={() => handleSelectCourse(course.code)}
                            style={{
                              borderStyle: course.dashed && !isSelected ? 'dashed' : 'solid'
                            }}
                          >
                            {/* Card Top: Code + Credits + Relation Tag */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono, monospace)', color: isSelected ? 'var(--color-ink)' : 'var(--color-ink)' }}>
                                {course.code}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {isPrereq && (
                                  <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '9999px', backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 700 }}>
                                    ← Tiên quyết
                                  </span>
                                )}
                                {isUnlock && (
                                  <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '9999px', backgroundColor: '#dbeafe', color: '#1e40af', fontWeight: 700 }}>
                                    → Mở khóa
                                  </span>
                                )}
                                <span style={{ fontSize: '11px', padding: '1px 8px', borderRadius: '9999px', backgroundColor: isSelected && isCurrent ? 'var(--color-ink)' : 'var(--color-canvas)', color: isSelected && isCurrent ? 'var(--color-paper)' : 'var(--color-ink)', fontWeight: 600 }}>
                                  {course.credits} TC
                                </span>
                              </div>
                            </div>

                            {/* Card Name & Category */}
                            <div>
                              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: isSelected ? 600 : 500, color: 'var(--color-ink)', lineHeight: 1.3 }}>
                                {course.name}
                              </h4>
                              <p style={{ margin: '3px 0 0', fontSize: '11px', color: 'var(--color-mid-gray)' }}>
                                {course.block}
                              </p>
                            </div>

                            {/* Card Bottom: Status & Indicator */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--color-hairline)', marginTop: '2px', fontSize: '11px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: course.statusType === 'passed' ? 'var(--color-ink)' : course.statusType === 'studying' ? 'var(--color-ink)' : 'var(--color-mid-gray)', fontWeight: 500 }}>
                                {course.statusType === 'passed' && <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check_circle</span>}
                                {course.statusType === 'studying' && <span className="material-symbols-outlined haui-spin" style={{ fontSize: '14px' }}>progress_activity</span>}
                                {course.statusType === 'eligible' && <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>how_to_reg</span>}
                                {course.statusType === 'locked' && <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>lock</span>}
                                <span>{course.statusText}</span>
                              </div>
                              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--color-mid-gray)' }}>
                                {isSelected ? 'check' : course.statusType === 'eligible' ? 'add_circle' : 'arrow_forward'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Detail Panel / Sticky Drawer (4 cols) — Chi tiết học phần và tương tác mở khóa */}
          <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '80px' }}>
            <div
              style={{
                backgroundColor: 'var(--color-paper)',
                borderRadius: '24px',
                border: '1px solid var(--color-hairline)',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              {/* Drawer Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '12px', borderBottom: '1px solid var(--color-hairline)' }}>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-mid-gray)' }}>
                    Chi tiết học phần
                  </span>
                  <h3 style={{ margin: '4px 0 2px', fontSize: '18px', fontWeight: 600, color: 'var(--color-ink)' }}>
                    {selectedCourse.name}
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-mid-gray)' }}>
                    <strong style={{ color: 'var(--color-ink)' }}>{selectedCourse.code}</strong> • {selectedCourse.credits}
                  </p>
                </div>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: selectedCourse.status === 'Đang học' ? 'var(--color-ink)' : 'var(--color-canvas)',
                    color: selectedCourse.status === 'Đang học' ? 'var(--color-paper)' : 'var(--color-ink)',
                    flexShrink: 0
                  }}
                >
                  {selectedCourse.status}
                </span>
              </div>

              {/* Academic Assessment Mini Card */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', backgroundColor: 'var(--color-canvas)', padding: '12px 14px', borderRadius: '16px' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-mid-gray)' }}>Điểm quá trình (dự kiến)</p>
                  <p style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)' }}>{selectedCourse.progress}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-mid-gray)' }}>Dự báo xếp loại</p>
                  <p style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)' }}>{selectedCourse.gradeEst}</p>
                </div>
              </div>

              {/* Attributes table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-hairline)' }}>
                  <span style={{ color: 'var(--color-mid-gray)' }}>Khối kiến thức:</span>
                  <strong style={{ color: 'var(--color-ink)', textAlign: 'right' }}>{selectedCourse.type}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-hairline)' }}>
                  <span style={{ color: 'var(--color-mid-gray)' }}>Học kỳ đào tạo:</span>
                  <span style={{ color: 'var(--color-ink)', textAlign: 'right', fontWeight: 500 }}>{selectedCourse.semester}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                  <span style={{ color: 'var(--color-mid-gray)' }}>Giảng viên / Bộ môn:</span>
                  <span style={{ color: 'var(--color-ink)', textAlign: 'right', fontWeight: 500 }}>{selectedCourse.lecturer}</span>
                </div>
              </div>

              {/* Course Syllabus Summary */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-mid-gray)' }}>
                  Đề cương tóm tắt
                </span>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-ink)', lineHeight: 1.5, backgroundColor: 'var(--color-surface-alt)', padding: '12px 14px', borderRadius: '16px', border: '1px solid var(--color-hairline)' }}>
                  {selectedCourse.desc}
                </p>
              </div>

              {/* Prerequisites Check Section (Clickable Items jump to course!) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-mid-gray)' }}>
                    Môn tiên quyết &amp; Môn học trước (TIÊN QUYẾT)
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--color-ink)', fontWeight: 500 }}>{selectedCourse.prereqStatus}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedCourse.prereqs?.map((pr, pIdx) => (
                    <div
                      key={pIdx}
                      onClick={() => handleSelectCourse(pr.code)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '14px',
                        backgroundColor: 'var(--color-canvas)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        cursor: 'pointer',
                        transition: 'all 150ms'
                      }}
                      title={`Xem chi tiết môn ${pr.code}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: pr.color || 'var(--color-ink)' }}>{pr.icon}</span>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {pr.code} - {pr.name}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--color-mid-gray)' }}>{pr.tag}</span>
                        </div>
                      </div>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'var(--color-paper)', color: 'var(--color-ink)', fontWeight: 600, flexShrink: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        {pr.grade}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Unlocks / Dependent Courses Section (Clickable Items jump to course!) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-mid-gray)' }}>
                  Học phần mở khóa tiếp theo (CHUỖI ẢNH HƯỞNG)
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedCourse.unlocks?.map((un, uIdx) => (
                    <div
                      key={uIdx}
                      onClick={() => handleSelectCourse(un.code)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '14px',
                        backgroundColor: 'var(--color-canvas)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        cursor: 'pointer',
                        transition: 'all 150ms'
                      }}
                      title={`Xem chi tiết môn ${un.code}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-mid-gray)' }}>{un.icon}</span>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {un.code} - {un.name}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--color-mid-gray)' }}>{un.condition}</span>
                        </div>
                      </div>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-mid-gray)' }}>arrow_forward</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons inside Panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--color-hairline)' }}>
                <button
                  type="button"
                  className="haui-pill-btn-dark"
                  onClick={() => handleAddCourseToPlanner(selectedCourse.code)}
                  style={{ justifyContent: 'center', padding: '10px 16px' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_task</span>
                  <span>Thêm vào Kế hoạch học kỳ 7</span>
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    className="haui-pill-btn-canvas"
                    onClick={() => navigate('/what-if')}
                    style={{ justifyContent: 'center', fontSize: '12px', padding: '8px' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>insights</span>
                    <span>Mô phỏng What-if</span>
                  </button>
                  <button
                    type="button"
                    className="haui-pill-btn-canvas"
                    onClick={() => navigate('/chat')}
                    style={{ justifyContent: 'center', fontSize: '12px', padding: '8px' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>support_agent</span>
                    <span>Tư vấn giảng viên / AI</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* =========================================================================
           TABLE VIEW (Dạng Bảng đầy đủ)
           ========================================================================= */
        <div style={{ backgroundColor: 'var(--color-paper)', borderRadius: '24px', border: '1px solid var(--color-hairline)', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <Table
            columns={tableColumns}
            data={allCoursesFlat}
            rowKey="code"
            striped
          />
        </div>
      )}

      {/* Modal Thẩm định Tiên Quyết Rule Engine */}
      <Modal
        isOpen={eligibilityModalOpen}
        onClose={() => setEligibilityModalOpen(false)}
        title={`Thẩm định Điều kiện Tiên quyết: ${selectedCourseCode}`}
        subtitle={selectedCourse?.name || ''}
        size="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
            <button
              type="button"
              className="haui-pill-btn-canvas"
              onClick={() => setEligibilityModalOpen(false)}
            >
              Đóng
            </button>
            <button
              type="button"
              className="haui-pill-btn-dark"
              onClick={() => {
                setEligibilityModalOpen(false);
                handleAddCourseToPlanner(selectedCourseCode);
              }}
            >
              Thêm môn vào Kế hoạch học tập &rarr;
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
          {checkingEligibility && <div>Đang thẩm định điều kiện tiên quyết...</div>}
          {eligibilityError && <div style={{ color: 'var(--color-ember)' }}>Lỗi: {eligibilityError.message}</div>}
          {eligibilityResult && (
            <div style={{ padding: '12px 14px', borderRadius: '12px', backgroundColor: 'var(--color-canvas)' }}>
              <strong>Trạng thái thẩm định:</strong> {eligibilityResult.eligible ? '✓ Đủ điều kiện đăng ký' : '⚠️ Cần kiểm tra lại điều kiện tiên quyết'}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default CurriculumTreePage;
