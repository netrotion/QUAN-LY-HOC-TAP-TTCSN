package vn.haui.advisor.contracts.dto;

/**
 * Nguồn của bảng điểm / phiên nhập.
 */
public enum TranscriptSourceType {
    /** PDF có lớp chữ, đọc bằng parser */
    PDF_TEXT,
    /** PDF scan, đọc bằng OCR */
    PDF_SCANNED,
    /** Ảnh PNG/JPEG, đọc bằng OCR */
    IMAGE,
    /** Sinh viên nhập tay */
    MANUAL,
    /** Dữ liệu demo seed từ fixture TV4 */
    DEMO_SEED
}
