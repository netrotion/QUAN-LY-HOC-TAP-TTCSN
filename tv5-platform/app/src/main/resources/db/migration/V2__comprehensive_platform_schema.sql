-- ==============================================================================
-- HaUI Advisor Platform - V2 Schema Migration (Task 2.2d)
-- Module: tv5-platform (Backend / Database / Platform Runtime)
-- Scope: Users, Student Context, Curriculum/Versions, Courses/Relations/Offerings,
--        Enrollment Attempts, Audit Requirements, Import Sessions,
--        Study Plans/Semesters/Courses/Actions, Chat & Knowledge Sources
-- Compatible with: PostgreSQL 16 (+ pgvector) & H2 (PostgreSQL Mode)
-- ==============================================================================

-- 1. Bảng quản lý người dùng & định danh hệ thống (Users & Identity)
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE,
    role VARCHAR(20) NOT NULL DEFAULT 'STUDENT', -- 'STUDENT', 'ADVISOR', 'ADMIN'
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'LOCKED', 'SUSPENDED'
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Bổ sung liên kết người dùng và quản lý phiên bản dữ liệu vào student_records
ALTER TABLE student_records ADD COLUMN IF NOT EXISTS user_id VARCHAR(50);
ALTER TABLE student_records ADD COLUMN IF NOT EXISTS data_revision VARCHAR(100) DEFAULT 'REV-2024-001';
ALTER TABLE student_records ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_student_records_user ON student_records(user_id);
CREATE INDEX IF NOT EXISTS idx_student_records_revision ON student_records(data_revision);

-- 2. Bảng Chương trình đào tạo & Phiên bản (Curriculum & Versions)
CREATE TABLE IF NOT EXISTS curricula (
    curriculum_id VARCHAR(50) PRIMARY KEY, -- e.g. 'CT1085'
    curriculum_code VARCHAR(50) NOT NULL UNIQUE, -- e.g. 'KTPM-2024'
    curriculum_name VARCHAR(255) NOT NULL,
    major_code VARCHAR(50) NOT NULL,
    total_credits INTEGER NOT NULL DEFAULT 150,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_curricula_major ON curricula(major_code);

CREATE TABLE IF NOT EXISTS curriculum_versions (
    version_id VARCHAR(50) PRIMARY KEY, -- e.g. 'CV-KTPM-2024-V1'
    curriculum_id VARCHAR(50) NOT NULL REFERENCES curricula(curriculum_id) ON DELETE CASCADE,
    version_code VARCHAR(50) NOT NULL, -- e.g. '2024.1'
    effective_cohort VARCHAR(20) NOT NULL, -- e.g. 'K19'
    approval_decision VARCHAR(100), -- e.g. 'QĐ 1085/QĐ-ĐHCN'
    is_current BOOLEAN DEFAULT TRUE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_curriculum_versions_curr ON curriculum_versions(curriculum_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_versions_cohort ON curriculum_versions(effective_cohort);

-- 3. Bảng Học phần, Quan hệ môn học & Đợt mở lớp (Courses, Relations & Offerings)
CREATE TABLE IF NOT EXISTS courses (
    course_id VARCHAR(50) PRIMARY KEY, -- e.g. 'IT6015'
    course_code VARCHAR(50) NOT NULL UNIQUE,
    course_name VARCHAR(255) NOT NULL,
    credits INTEGER NOT NULL DEFAULT 3,
    knowledge_block VARCHAR(50) NOT NULL, -- 'DAI_CUONG', 'CO_SO_NGANH', 'CHUYEN_NGANH', 'TOT_NGHIEP'
    is_mandatory BOOLEAN DEFAULT TRUE,
    suggested_semester INTEGER,
    department VARCHAR(100) DEFAULT 'KHOA_CNTT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_courses_knowledge ON courses(knowledge_block);
CREATE INDEX IF NOT EXISTS idx_courses_semester ON courses(suggested_semester);

CREATE TABLE IF NOT EXISTS course_relations (
    relation_id VARCHAR(50) PRIMARY KEY,
    target_course_id VARCHAR(50) NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    required_course_id VARCHAR(50) NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    relation_type VARCHAR(30) NOT NULL, -- 'PREREQUISITE', 'PRIOR', 'COREQUISITE'
    min_grade_required VARCHAR(5) DEFAULT 'D',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_course_relation UNIQUE (target_course_id, required_course_id, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_course_relations_target ON course_relations(target_course_id);
CREATE INDEX IF NOT EXISTS idx_course_relations_required ON course_relations(required_course_id);

CREATE TABLE IF NOT EXISTS course_offerings (
    offering_id VARCHAR(50) PRIMARY KEY,
    course_id VARCHAR(50) NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    semester_code VARCHAR(30) NOT NULL, -- e.g. '2024_1', '2024_2', '2024_SUMMER'
    max_capacity INTEGER DEFAULT 60,
    class_type VARCHAR(20) DEFAULT 'STANDARD', -- 'STANDARD', 'PRACTICE', 'EVENING'
    status VARCHAR(20) DEFAULT 'OPEN', -- 'OPEN', 'CLOSED', 'CANCELLED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_offerings_course_semester ON course_offerings(course_id, semester_code);

-- 4. Bảng Lịch sử các lần học & Điểm số (Enrollment Attempts - PRD §8)
CREATE TABLE IF NOT EXISTS enrollment_attempts (
    attempt_id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL REFERENCES student_records(student_id) ON DELETE CASCADE,
    course_id VARCHAR(50) NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    semester_code VARCHAR(30) NOT NULL,
    attempt_number INTEGER DEFAULT 1,
    score_10 NUMERIC(4, 2),
    letter_grade VARCHAR(5),
    score_4 NUMERIC(3, 2),
    status VARCHAR(20) NOT NULL DEFAULT 'PASSED', -- 'PASSED', 'FAILED', 'IN_PROGRESS', 'EXEMPTED'
    is_retake BOOLEAN DEFAULT FALSE,
    is_excluded_from_gpa BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attempts_student ON enrollment_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_attempts_course ON enrollment_attempts(course_id);
CREATE INDEX IF NOT EXISTS idx_attempts_semester ON enrollment_attempts(semester_code);
CREATE INDEX IF NOT EXISTS idx_attempts_status ON enrollment_attempts(status);

-- 5. Bảng Chuẩn đầu ra & Rà soát Tốt nghiệp (Audit Requirements)
CREATE TABLE IF NOT EXISTS audit_requirements (
    requirement_id VARCHAR(50) PRIMARY KEY, -- e.g. 'REQ_TOEIC_450', 'REQ_MOS', 'REQ_GDQP', 'REQ_GDTC'
    requirement_code VARCHAR(50) NOT NULL UNIQUE,
    requirement_name VARCHAR(150) NOT NULL,
    category VARCHAR(30) NOT NULL, -- 'CREDITS', 'CERTIFICATE', 'PHYSICAL_ED', 'DEFENSE_ED'
    condition_rule JSONB NOT NULL,
    is_mandatory BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_audit_checklists (
    checklist_id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL REFERENCES student_records(student_id) ON DELETE CASCADE,
    requirement_id VARCHAR(50) NOT NULL REFERENCES audit_requirements(requirement_id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'MISSING', -- 'SATISFIED', 'MISSING', 'PENDING_APPROVAL'
    evidence_info JSONB,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_student_audit UNIQUE (student_id, requirement_id)
);

CREATE INDEX IF NOT EXISTS idx_audit_checklists_student ON student_audit_checklists(student_id);

-- 6. Bảng Phiên nhập dữ liệu bảng điểm (Import Sessions)
CREATE TABLE IF NOT EXISTS import_sessions (
    session_id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL REFERENCES student_records(student_id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(20) NOT NULL DEFAULT 'PDF', -- 'PDF', 'EXCEL', 'MANUAL'
    status VARCHAR(30) NOT NULL DEFAULT 'UPLOADED', -- 'UPLOADED', 'PARSED', 'CONFIRMED', 'REJECTED'
    parsed_payload JSONB,
    error_message TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_import_sessions_student ON import_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_import_sessions_status ON import_sessions(status);

-- 7. Nâng cấp Bảng Kế hoạch học tập & Chi tiết (Study Plans, Semesters, Courses, Actions)
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS plan_name VARCHAR(150) DEFAULT 'Kế hoạch học tập';
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS data_revision VARCHAR(100) DEFAULT 'REV-2024-001';
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS target_graduation_semester VARCHAR(30) DEFAULT '2028_1';

CREATE INDEX IF NOT EXISTS idx_study_plans_revision ON study_plans(data_revision);

CREATE TABLE IF NOT EXISTS plan_semesters (
    plan_semester_id VARCHAR(50) PRIMARY KEY,
    plan_id VARCHAR(100) NOT NULL REFERENCES study_plans(plan_id) ON DELETE CASCADE,
    semester_order INTEGER NOT NULL,
    semester_code VARCHAR(30) NOT NULL,
    planned_credits INTEGER NOT NULL DEFAULT 0,
    estimated_gpa NUMERIC(3, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_plan_semester UNIQUE (plan_id, semester_order)
);

CREATE INDEX IF NOT EXISTS idx_plan_semesters_plan ON plan_semesters(plan_id);

CREATE TABLE IF NOT EXISTS planned_courses (
    planned_course_id VARCHAR(50) PRIMARY KEY,
    plan_semester_id VARCHAR(50) NOT NULL REFERENCES plan_semesters(plan_semester_id) ON DELETE CASCADE,
    course_id VARCHAR(50) NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    target_grade VARCHAR(5) DEFAULT 'B',
    course_type VARCHAR(30) DEFAULT 'STANDARD', -- 'STANDARD', 'RETAKE', 'ELECTIVE', 'SUMMER', 'ADVANCED'
    status VARCHAR(20) DEFAULT 'PLANNED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_planned_courses_semester ON planned_courses(plan_semester_id);
CREATE INDEX IF NOT EXISTS idx_planned_courses_course ON planned_courses(course_id);

CREATE TABLE IF NOT EXISTS plan_actions (
    action_id VARCHAR(50) PRIMARY KEY,
    plan_id VARCHAR(100) NOT NULL REFERENCES study_plans(plan_id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- 'UNBLOCK_PREREQUISITE', 'RETAKE_IMPROVEMENT', 'SUMMER_ACCELERATION', 'WORKLOAD_WARNING'
    description TEXT NOT NULL,
    target_course_id VARCHAR(50),
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_plan_actions_plan ON plan_actions(plan_id);

-- 8. Bảng Nguồn tri thức RAG & Quy chế đào tạo (Knowledge Sources)
CREATE TABLE IF NOT EXISTS knowledge_sources (
    source_id VARCHAR(50) PRIMARY KEY, -- e.g. 'SRC-HAUI-REG-01'
    document_code VARCHAR(50) NOT NULL, -- e.g. '01_QUY_CHE_TIN_CHI'
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'REGULATION', 'CURRICULUM', 'POLICY'
    section VARCHAR(100),
    version VARCHAR(50) NOT NULL DEFAULT '2024.1',
    file_path VARCHAR(255),
    metadata JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_knowledge_sources_doc ON knowledge_sources(document_code);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_category ON knowledge_sources(category);
