-- ==============================================================================
-- HaUI Advisor Platform - V5 Schema Migration (Task 4.2b)
-- Scope: thẩm định lại kế hoạch VALIDATED/ACTIVE khi dữ liệu học vụ (dataRevision) hoặc quy chế (policyVersion) đổi.
-- Compatible with: PostgreSQL 16 & H2 (PostgreSQL Mode)
-- ==============================================================================

-- Hồ sơ/quy chế của lần thẩm định thật gần nhất trên nội dung hiện tại, dù đạt hay không. validated_* chỉ giữ lần đạt
-- còn hiệu lực: bản ACTIVE vi phạm sau khi dữ liệu đổi có validated_* = NULL, còn checked_* ghi lần kiểm tra đó để không
-- kiểm tra lại tới khi hồ sơ hoặc quy chế đổi tiếp. DRAFT không được theo dõi nên checked_* = NULL.
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS checked_data_revision VARCHAR(100);
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS checked_policy_version VARCHAR(100);

UPDATE study_plans SET checked_data_revision = validated_data_revision, checked_policy_version = validated_policy_version
WHERE status IN ('VALIDATED', 'ACTIVE');
