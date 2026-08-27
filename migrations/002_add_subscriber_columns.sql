-- migrations/002_add_subscriber_columns.sql
-- 修复线上订阅 500：早期 subscribers 表只有 (id, email, created_at)，
-- 缺少代码所需的 status / token / confirmed_at 三列，导致
-- SUBSCRIBE 的 SELECT ... status 与 INSERT (email, status, token) 报
-- "no such column: status" (SQLITE_ERROR 7500)。
--
-- 适用对象：已经存在旧表（只有 id/email/created_at）的数据库。
-- 全新数据库可直接跑 001_subscribers.sql（已包含完整列）。
-- 运行方式：wrangler d1 execute renyigame-db --remote --file=migrations/002_add_subscriber_columns.sql
--
-- 注意：SQLite 没有 ADD COLUMN IF NOT EXISTS，重复执行会报
-- "duplicate column name"；本文件只需成功执行一次，报错可忽略。

ALTER TABLE subscribers ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE subscribers ADD COLUMN token TEXT;
ALTER TABLE subscribers ADD COLUMN confirmed_at TEXT;
