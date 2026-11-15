package vn.haui.advisor.contracts.ports;

import vn.haui.advisor.contracts.dto.StudentFactRecord;

/**
 * Cổng truy xuất và lưu trữ sổ tay dữ kiện học tập dài hạn của sinh viên.
 */
public interface StudentFactStore {

    /**
     * Nạp dữ kiện học vụ dài hạn của sinh viên.
     *
     * @param studentId mã sinh viên
     * @return bản ghi dữ kiện, hoặc null nếu chưa có
     */
    StudentFactRecord getFacts(String studentId);

    /**
     * Lưu trữ hoặc cập nhật dữ kiện học vụ của sinh viên.
     *
     * @param record bản ghi dữ kiện cần lưu
     */
    void saveFacts(StudentFactRecord record);
}

