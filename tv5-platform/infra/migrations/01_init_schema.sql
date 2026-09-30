-- ==============================================================================
-- HaUI Advisor Platform - Database Initialization Script for Docker Compose
-- Module: tv5-platform/infra/migrations
-- ==============================================================================

-- 1. Kích hoạt extension pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Bảng cấu hình hệ thống
CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_settings (setting_key, setting_value, description)
VALUES
    ('system.version', '0.0.1-SNAPSHOT', 'Current version of HaUI Advisor Platform'),
    ('system.maintenance', 'false', 'Maintenance mode status'),
    ('academic.policy.version', '2024-QĐ/ĐHCN', 'HaUI Academic Policy Standard Reference')
ON CONFLICT (setting_key) DO NOTHING;

-- 3. Bảng nhật ký kiểm toán hệ thống (Audit Logs)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    actor_id VARCHAR(100),
    entity_type VARCHAR(100),
    entity_id VARCHAR(100),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- 4. Bảng quản lý hồ sơ sinh viên (Trusted Student Context)
CREATE TABLE IF NOT EXISTS student_records (
    student_id VARCHAR(50) PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(100),
    major VARCHAR(100) NOT NULL,
    cohort VARCHAR(20) NOT NULL,
    current_semester INTEGER DEFAULT 1,
    accumulated_credits INTEGER DEFAULT 0,
    gpa NUMERIC(4, 2) DEFAULT 0.00,
    cpa NUMERIC(4, 2) DEFAULT 0.00,
    warning_level VARCHAR(20) DEFAULT 'NORMAL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_records_cohort ON student_records(cohort);
CREATE INDEX IF NOT EXISTS idx_student_records_major ON student_records(major);

-- 5. Bảng quản lý lịch sử hội thoại (Conversation Store)
CREATE TABLE IF NOT EXISTS conversations (
    conversation_id VARCHAR(100) PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL DEFAULT 'Hội thoại tư vấn mới',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_conversation_student FOREIGN KEY (student_id) REFERENCES student_records(student_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conversations_student ON conversations(student_id);

-- 6. Bảng tin nhắn trong hội thoại
CREATE TABLE IF NOT EXISTS conversation_messages (
    message_id VARCHAR(100) PRIMARY KEY,
    conversation_id VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    sources JSONB,
    action_items JSONB,
    plan_proposals JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_message_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON conversation_messages(created_at);

-- 7. Bảng kế hoạch học tập (Study Plans)
CREATE TABLE IF NOT EXISTS study_plans (
    plan_id VARCHAR(100) PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    target_cpa NUMERIC(4, 2),
    max_credits_per_semester INTEGER DEFAULT 20,
    plan_payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_study_plan_student FOREIGN KEY (student_id) REFERENCES student_records(student_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_study_plans_student ON study_plans(student_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_status ON study_plans(status);
