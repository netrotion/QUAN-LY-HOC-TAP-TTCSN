package vn.haui.advisor.platform.transcript.importing;

import java.math.BigDecimal;

/**
 * Dòng nhập được lưu trong phiên (import_sessions.rows_json). Vấn đề của dòng không lưu mà luôn được tính lại
 * theo CTĐT hiện hành khi đọc/sửa/xác nhận.
 *
 * @param documentCredits số tín chỉ in trên tài liệu (chỉ để đối chiếu với CTĐT)
 * @param unreadable      dòng có mã học phần nhưng parser/OCR không đọc đủ cột
 * @param ocr             dòng đến từ OCR (cần đối chiếu khi độ tin cậy thấp)
 */
public record ImportRowDraft(String rowId, String sourceText, String courseCode, String documentCourseName,
                             BigDecimal documentCredits, String semesterCode, BigDecimal score10, String letterGrade,
                             boolean included, BigDecimal confidence, boolean unreadable, boolean ocr) {
}
