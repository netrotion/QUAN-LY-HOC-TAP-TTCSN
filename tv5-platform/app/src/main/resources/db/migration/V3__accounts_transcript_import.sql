-- ==============================================================================
-- HaUI Advisor Platform - V3 Schema Migration (Task 3.2)
-- Scope: Tài khoản STUDENT, hồ sơ, CTĐT theo chương trình, bảng điểm đã xác nhận,
--        phiên nhập bảng điểm (review -> confirm), khai báo chứng chỉ.
-- Compatible with: PostgreSQL 16 & H2 (PostgreSQL Mode)
-- ==============================================================================

-- 1. Hồ sơ sinh viên không lưu sẵn số liệu học vụ.
--    GPA/CPA/tín chỉ/cảnh báo do AcademicFacade tính từ bảng điểm đã xác nhận; không bao giờ lấy từ tài liệu tải lên.
ALTER TABLE student_records DROP COLUMN IF EXISTS gpa;
ALTER TABLE student_records DROP COLUMN IF EXISTS cpa;
ALTER TABLE student_records DROP COLUMN IF EXISTS accumulated_credits;
ALTER TABLE student_records DROP COLUMN IF EXISTS warning_level;
ALTER TABLE student_records DROP COLUMN IF EXISTS current_semester;

ALTER TABLE student_records ADD COLUMN IF NOT EXISTS class_name VARCHAR(50);
ALTER TABLE student_records ADD COLUMN IF NOT EXISTS curriculum_id VARCHAR(50);
ALTER TABLE student_records ADD COLUMN IF NOT EXISTS transcript_status VARCHAR(20) DEFAULT 'NONE' NOT NULL;
ALTER TABLE student_records ADD COLUMN IF NOT EXISTS transcript_source_type VARCHAR(20);
ALTER TABLE student_records ADD COLUMN IF NOT EXISTS transcript_import_session_id VARCHAR(50);
ALTER TABLE student_records ADD COLUMN IF NOT EXISTS transcript_confirmed_at TIMESTAMP WITH TIME ZONE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_student_records_user ON student_records(user_id);

-- 2. CTĐT: thông tin ngành và học phần theo từng chương trình
ALTER TABLE curricula ADD COLUMN IF NOT EXISTS major_name VARCHAR(150);
ALTER TABLE curricula ADD COLUMN IF NOT EXISTS faculty VARCHAR(255);
ALTER TABLE curricula ADD COLUMN IF NOT EXISTS data_status VARCHAR(50);
ALTER TABLE curricula ADD COLUMN IF NOT EXISTS source VARCHAR(255);

-- Tín chỉ là số thực (CTĐT có học phần 1.5 TC)
ALTER TABLE courses ALTER COLUMN credits SET DATA TYPE NUMERIC(4, 1);
ALTER TABLE courses ALTER COLUMN knowledge_block SET DATA TYPE VARCHAR(100);

-- Quan hệ học phần lưu đúng như CTĐT (kể cả mã chưa có trong danh mục học phần nên không đặt khóa ngoại)
CREATE TABLE IF NOT EXISTS curriculum_courses (
    curriculum_id VARCHAR(50) NOT NULL REFERENCES curricula(curriculum_id) ON DELETE CASCADE,
    course_id VARCHAR(50) NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL,
    suggested_semester INTEGER,
    is_mandatory BOOLEAN DEFAULT FALSE,
    knowledge_block VARCHAR(100),
    prerequisite_codes VARCHAR(500),
    prior_course_codes VARCHAR(500),
    corequisite_codes VARCHAR(500),
    CONSTRAINT pk_curriculum_courses PRIMARY KEY (curriculum_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_curriculum_courses_course ON curriculum_courses(course_id);

-- 3. Bảng điểm đã xác nhận: nguồn và phiên nhập đã tạo ra từng dòng.
--    score_4 không được ghi từ tài liệu tải lên (điểm hệ 4 do AcademicFacade suy ra theo policy).
ALTER TABLE enrollment_attempts ADD COLUMN IF NOT EXISTS source VARCHAR(20);
ALTER TABLE enrollment_attempts ADD COLUMN IF NOT EXISTS import_session_id VARCHAR(50);

-- 4. Phiên nhập bảng điểm: chỉ lưu metadata + hash của file, không lưu nội dung file
ALTER TABLE import_sessions ALTER COLUMN file_name DROP NOT NULL;
ALTER TABLE import_sessions ADD COLUMN IF NOT EXISTS source_type VARCHAR(20);
ALTER TABLE import_sessions ADD COLUMN IF NOT EXISTS content_type VARCHAR(100);
ALTER TABLE import_sessions ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;
ALTER TABLE import_sessions ADD COLUMN IF NOT EXISTS file_sha256 VARCHAR(64);
ALTER TABLE import_sessions ADD COLUMN IF NOT EXISTS page_count INTEGER;
ALTER TABLE import_sessions ADD COLUMN IF NOT EXISTS session_version INTEGER DEFAULT 1 NOT NULL;
ALTER TABLE import_sessions ADD COLUMN IF NOT EXISTS rows_json TEXT;
ALTER TABLE import_sessions ADD COLUMN IF NOT EXISTS document_summary_json TEXT;
ALTER TABLE import_sessions ADD COLUMN IF NOT EXISTS warnings_json TEXT;
ALTER TABLE import_sessions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE import_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_import_sessions_student_status ON import_sessions(student_id, status);

-- 5. Chứng chỉ/chuẩn đầu ra tự khai báo (hệ thống không xác minh với trường)
ALTER TABLE student_audit_checklists ADD COLUMN IF NOT EXISTS verification VARCHAR(20);
ALTER TABLE student_audit_checklists ADD COLUMN IF NOT EXISTS evidence_note VARCHAR(500);
ALTER TABLE student_audit_checklists ADD COLUMN IF NOT EXISTS achieved_on DATE;

-- Chuẩn đầu ra phi tín chỉ theo tv4-academic/fixtures/policy-demo.json (tên được đồng bộ lại khi khởi động)
INSERT INTO audit_requirements (requirement_id, requirement_code, requirement_name, category, condition_rule, is_mandatory)
VALUES ('FOREIGN_LANGUAGE', 'FOREIGN_LANGUAGE', 'Chuẩn đầu ra Ngoại ngữ (TOEIC 550)', 'NGOẠI NGỮ', '{"type":"SELF_DECLARED_CERTIFICATE"}', TRUE);
INSERT INTO audit_requirements (requirement_id, requirement_code, requirement_name, category, condition_rule, is_mandatory)
VALUES ('IT_SKILLS', 'IT_SKILLS', 'Chuẩn đầu ra Tin học (MOS/IC3)', 'TIN HỌC', '{"type":"SELF_DECLARED_CERTIFICATE"}', TRUE);
INSERT INTO audit_requirements (requirement_id, requirement_code, requirement_name, category, condition_rule, is_mandatory)
VALUES ('DEFENSE_EDUCATION', 'DEFENSE_EDUCATION', 'Chứng chỉ Giáo dục Quốc phòng - An ninh', 'GDQP_AN', '{"type":"SELF_DECLARED_CERTIFICATE"}', TRUE);
INSERT INTO audit_requirements (requirement_id, requirement_code, requirement_name, category, condition_rule, is_mandatory)
VALUES ('PHYSICAL_EDUCATION', 'PHYSICAL_EDUCATION', 'Chứng chỉ Giáo dục Thể chất', 'GDTC', '{"type":"SELF_DECLARED_CERTIFICATE"}', TRUE);
