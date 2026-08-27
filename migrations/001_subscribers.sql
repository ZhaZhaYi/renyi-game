-- migrations/001_subscribers.sql (v3)
-- 直接删除旧表，重建新结构（旧订阅数据一并清除）
-- 运行方式：wrangler d1 execute renyigame-db --remote --file=migrations/001_subscribers.sql
-- 注意：执行后所有历史订阅记录都会被删除，需要重新订阅。

DROP TABLE IF EXISTS subscribers;

CREATE TABLE subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    game TEXT NOT NULL DEFAULT 'TileBuddies',
    status TEXT NOT NULL DEFAULT 'pending',
    token TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    confirmed_at TEXT,
    UNIQUE(email, game)
);
