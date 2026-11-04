-- ==============================================================================
-- HaUI Advisor Platform - V6 Schema Migration
-- Module: tv5-platform & tv1-ai
-- Scope: Persistent Storage cho RAG Knowledge Base với pgvector
-- Compatible with: PostgreSQL 16 (+ pgvector extension) & H2 (PostgreSQL Mode)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS rag_chunks (
    chunk_id VARCHAR(128) PRIMARY KEY,
    source_id VARCHAR(128) NOT NULL,
    title VARCHAR(256),
    section VARCHAR(256),
    version VARCHAR(64),
    reference_url VARCHAR(512),
    content TEXT NOT NULL,
    chunk_index INT NOT NULL,
    token_estimate INT NOT NULL,
    embedding ${vector_column_type}
);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_source_id ON rag_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_version ON rag_chunks(version);
${vector_index_hnsw}
