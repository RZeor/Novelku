-- Migration: Add reading_sessions table for authenticated reader analytics
-- Purely additive migration — preserves existing tables, constraints, and data

-- CreateTable
CREATE TABLE IF NOT EXISTS "reading_sessions" (
    "id" SERIAL NOT NULL,
    "session_id" VARCHAR(64) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "novel_id" INTEGER NOT NULL,
    "chapter_id" INTEGER NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_heartbeat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration_seconds" INTEGER NOT NULL DEFAULT 0,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reading_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "reading_sessions_session_id_key" ON "reading_sessions"("session_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "reading_sessions_start_time_idx" ON "reading_sessions"("start_time");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "reading_sessions_novel_id_start_time_idx" ON "reading_sessions"("novel_id", "start_time");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "reading_sessions_user_id_start_time_idx" ON "reading_sessions"("user_id", "start_time");

-- AddForeignKey safely
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'reading_sessions_user_id_fkey'
    ) THEN
        ALTER TABLE "reading_sessions" ADD CONSTRAINT "reading_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'reading_sessions_novel_id_fkey'
    ) THEN
        ALTER TABLE "reading_sessions" ADD CONSTRAINT "reading_sessions_novel_id_fkey" FOREIGN KEY ("novel_id") REFERENCES "novels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'reading_sessions_chapter_id_fkey'
    ) THEN
        ALTER TABLE "reading_sessions" ADD CONSTRAINT "reading_sessions_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
