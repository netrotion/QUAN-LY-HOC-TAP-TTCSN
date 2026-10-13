-- ==============================================================================
-- HaUI Advisor Platform - V4 Schema Migration (Task 3.7)
-- Scope: Lưu kế hoạch học tập (học kỳ, học phần, action), bản nháp kế thừa, optimistic version,
--        một ACTIVE mỗi sinh viên, revision lúc thẩm định; lịch sử hội thoại.
-- Compatible with: PostgreSQL 16 & H2 (PostgreSQL Mode)
-- ==============================================================================

-- 1. Kế hoạch: nội dung lưu ở plan_semesters/planned_courses/plan_actions, không dùng plan_payload
ALTER TABLE study_plans ALTER COLUMN plan_payload DROP NOT NULL;
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS source_plan_id VARCHAR(100);
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS projected_cpa NUMERIC(4, 2);
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS warnings_json TEXT;
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE;

-- Thẩm định thật gần nhất: chỉ còn hiệu lực khi kế hoạch, hồ sơ và quy chế chưa đổi
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS validated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS validated_plan_version INTEGER;
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS validated_data_revision VARCHAR(100);
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS validated_policy_version VARCHAR(100);

-- Một ACTIVE mỗi sinh viên do DB bảo đảm: active_student_id = student_id khi ACTIVE, NULL khi khác,
-- kèm UNIQUE (nhiều NULL hợp lệ). Dùng cột đánh dấu thay cho partial index để chạy được trên cả H2.
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS active_student_id VARCHAR(50);
UPDATE study_plans SET active_student_id = student_id WHERE status = 'ACTIVE';
ALTER TABLE study_plans ADD CONSTRAINT uq_study_plans_one_active UNIQUE (active_student_id);
-- IS NOT NULL bắt buộc: so sánh với NULL cho UNKNOWN và CHECK coi UNKNOWN là đạt
ALTER TABLE study_plans ADD CONSTRAINT ck_study_plans_active_marker CHECK (
    (status = 'ACTIVE' AND active_student_id IS NOT NULL AND active_student_id = student_id)
    OR (status <> 'ACTIVE' AND active_student_id IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_study_plans_student_updated ON study_plans(student_id, updated_at);

-- Mã kế hoạch tăng dần theo sinh viên, không tái sử dụng sau khi hủy bản nháp
ALTER TABLE student_records ADD COLUMN IF NOT EXISTS plan_sequence INTEGER NOT NULL DEFAULT 0;

ALTER TABLE plan_semesters ADD COLUMN IF NOT EXISTS semester_name VARCHAR(100);

-- Học phần trong kế hoạch giữ mã/tên/tín chỉ sinh viên đã lập; course_id chỉ liên kết khi môn có trong danh mục
ALTER TABLE planned_courses ALTER COLUMN course_id DROP NOT NULL;
ALTER TABLE planned_courses ADD COLUMN IF NOT EXISTS course_code VARCHAR(50);
ALTER TABLE planned_courses ADD COLUMN IF NOT EXISTS course_name VARCHAR(255);
ALTER TABLE planned_courses ADD COLUMN IF NOT EXISTS credits NUMERIC(4, 1);
ALTER TABLE planned_courses ADD COLUMN IF NOT EXISTS rationale TEXT;
ALTER TABLE planned_courses ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

ALTER TABLE plan_actions ALTER COLUMN description DROP NOT NULL;
ALTER TABLE plan_actions ADD COLUMN IF NOT EXISTS label VARCHAR(255);
ALTER TABLE plan_actions ADD COLUMN IF NOT EXISTS target_route VARCHAR(255);
ALTER TABLE plan_actions ADD COLUMN IF NOT EXISTS payload_json TEXT;
ALTER TABLE plan_actions ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- 2. Hội thoại: tin nhắn lưu nguyên JSON do module AI định nghĩa (ConversationRecord.messagesJson)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS messages_json TEXT;
CREATE INDEX IF NOT EXISTS idx_conversations_student_updated ON conversations(student_id, updated_at);
