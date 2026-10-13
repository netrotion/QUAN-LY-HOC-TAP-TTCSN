-- ==============================================================================
-- HaUI Advisor Platform - Database Initialization Script for Docker Compose
-- Module: tv5-platform/infra/migrations
--
-- Schema do Flyway quản lý duy nhất (tv5-platform/app/src/main/resources/db/migration, V1..Vn)
-- khi backend khởi động. Script này chỉ bật extension cần quyền superuser lúc tạo DB,
-- không tạo bảng để tránh hai nguồn schema lệch nhau.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS vector;
