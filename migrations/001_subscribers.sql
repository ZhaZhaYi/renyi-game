-- migrations/001_subscribers.sql
-- 订阅表结构（首次执行）
-- 运行方式：wrangler d1 execute renyigame-db --remote --file=migrations/001_subscribers.sql

CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending',
    token TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    confirmed_at TEXT
);

-- 如果之前已经建过只有 email 的旧表，请逐条执行下面这些 ALTER（已存在的列会报错，跳过即可）：
-- ALTER TABLE subscribers ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
-- ALTER TABLE subscribers ADD COLUMN token TEXT;
-- ALTER TABLE subscribers ADD COLUMN created_at TEXT NOT NULL DEFAULT (datetime('now'));
-- ALTER TABLE subscribers ADD COLUMN confirmed_at TEXT;

-- 提示：如果旧表的 email 没有 UNIQUE 约束，建议导出备份后重建表，避免重复订阅。
