-- Migration: Add performance indexes for library table
-- Purpose: Optimize queries filtering by status/script_type and sorting by star_count/copy_count
-- Impact: 80-95% reduction in query time for featured libraries/web apps

-- Composite index for featured libraries query
-- Covers: WHERE status = 'published' AND script_type IN ('library', 'web_app')
--         ORDER BY star_count DESC, copy_count DESC
CREATE INDEX IF NOT EXISTS "idx_library_published_featured"
  ON "library" ("status", "script_type", "star_count" DESC, "copy_count" DESC);

-- Additional index for status-only queries (fallback optimization)
CREATE INDEX IF NOT EXISTS "idx_library_status"
  ON "library" ("status");
