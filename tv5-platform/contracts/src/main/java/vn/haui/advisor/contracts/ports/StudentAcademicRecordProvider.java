package vn.haui.advisor.contracts.ports;

import vn.haui.advisor.contracts.dto.StudentAcademicRecord;

/**
 * Port cung cấp dữ liệu học vụ gốc (bảng điểm đã xác nhận, CTĐT, khai báo chứng chỉ) cho engine học vụ.
 * Do platform app (TV5) implement trên DB; AcademicFacade (TV4) gọi qua interface, không truy cập DB.
 *
 * Nguyên tắc: chỉ trả dữ liệu sinh viên đã xác nhận. Không có số liệu đọc từ tài liệu tải lên
 * (CPA in trên bảng điểm, điểm hệ 4 do parser đọc) — GPA/CPA luôn do AcademicFacade tính.
 */
public interface StudentAcademicRecordProvider {

    /**
     * @param studentId định danh sinh viên được tin cậy (từ TrustedStudentContext)
     * @return hồ sơ học vụ gốc; transcriptStatus = NONE và attempts rỗng khi chưa có bảng điểm
     */
    StudentAcademicRecord getAcademicRecord(String studentId);
}
