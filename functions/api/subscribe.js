/**
 * functions/api/subscribe.js
 * 订阅接口：校验邮箱 -> 写入 D1（待确认） -> 通过 Resend 发送确认邮件
 */

function json(data, status) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

async function sendConfirmationEmail(env, email, token, origin) {
    const from = env.RESEND_FROM || 'noreply@mail.renyigame.com';
    const confirmUrl = origin + '/api/confirm?token=' + encodeURIComponent(token);
    const html =
        '<div style="max-width:560px;margin:0 auto;font-family:\'PingFang SC\',\'Microsoft YaHei\',sans-serif;color:#5b4a3d;line-height:1.7">' +
        '  <div style="text-align:center;padding:28px 0 6px">' +
        '    <span style="display:inline-block;width:44px;height:44px;line-height:44px;border-radius:50%;background:linear-gradient(135deg,#ffb37a,#ff8a5c);color:#fff;font-size:20px;font-weight:700">R</span>' +
        '  </div>' +
        '  <h2 style="text-align:center;color:#5b4a3d;font-size:20px;margin:10px 0 6px">确认你的订阅</h2>' +
        '  <p style="text-align:center;color:#a08a76;font-size:13px;margin-bottom:22px">Renyi Games · 新作与内测消息第一时间通知你</p>' +
        '  <div style="background:#fff7ee;border:1px solid #f0e2d4;border-radius:16px;padding:26px;text-align:center">' +
        '    <p style="margin:0 0 18px;font-size:14px;color:#5b4a3d">点击下方按钮，确认订阅 <b>' + email + '</b>：</p>' +
        '    <a href="' + confirmUrl + '" style="display:inline-block;background:linear-gradient(135deg,#ffb37a,#ff8a5c);color:#fff;text-decoration:none;font-weight:700;padding:12px 28px;border-radius:999px">确认订阅</a>' +
        '    <p style="margin:18px 0 0;font-size:12px;color:#a08a76">如果这不是你本人操作，请忽略这封邮件，你不会收到任何通知。</p>' +
        '  </div>' +
        '  <p style="text-align:center;color:#c9b8a5;font-size:12px;margin-top:22px">© 2026 Renyi Games · 适龄游戏，理性娱乐</p>' +
        '</div>';

    const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + env.RESEND_API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from,
            to: [email],
            subject: '确认订阅 · Renyi Games',
            html
        })
    });

    if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error('Resend failed (' + resp.status + '): ' + text.slice(0, 200));
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        // 1. 解析前端传来的 JSON 数据
        let email;
        try {
            const body = await request.json();
            email = body && body.email;
        } catch (e) {
            return json({ success: false, message: '请求格式错误' }, 400);
        }

        // 2. 校验邮箱格式
        if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            return json({ success: false, message: '请输入有效的邮箱地址' }, 400);
        }
        email = email.trim();

        const origin = new URL(request.url).origin;

        // 3. 查重：已确认 -> 提示；待确认 -> 重发确认邮件
        const existing = await env.DB
            .prepare("SELECT id, status FROM subscribers WHERE email = ? COLLATE NOCASE LIMIT 1")
            .bind(email)
            .first();

        if (existing) {
            if (existing.status === 'confirmed') {
                return json({ success: false, message: '这个邮箱已经订阅过了哦！' }, 409);
            }
            const token = crypto.randomUUID();
            await env.DB
                .prepare('UPDATE subscribers SET token = ? WHERE id = ?')
                .bind(token, existing.id)
                .run();
            try {
                await sendConfirmationEmail(env, email, token, origin);
            } catch (sendErr) {
                console.error('Resend error:', sendErr);
                return json({ success: false, message: '确认邮件发送失败，请稍后再试。' }, 502);
            }
            return json({ success: true, message: '确认邮件已重新发送，请到邮箱点击链接完成订阅。' }, 200);
        }

        // 4. 新订阅：写入待确认状态
        const token = crypto.randomUUID();
        await env.DB
            .prepare("INSERT INTO subscribers (email, status, token) VALUES (?, 'pending', ?)")
            .bind(email, token)
            .run();

        // 5. 发送确认邮件；失败则回滚，避免留下无法确认的脏数据
        try {
            await sendConfirmationEmail(env, email, token, origin);
        } catch (sendErr) {
            console.error('Resend error:', sendErr);
            await env.DB
                .prepare('DELETE FROM subscribers WHERE email = ? COLLATE NOCASE')
                .bind(email)
                .run()
                .catch(() => {});
            return json({ success: false, message: '确认邮件发送失败，请稍后再试。' }, 502);
        }

        // 6. 返回成功
        return json({ success: true, message: '确认邮件已发送，请到邮箱点击链接完成订阅。' }, 200);

    } catch (err) {
        console.error('Subscription error:', err);

        // 汇总整条错误链，兼容不同版本的 D1 错误格式（message 可能在 cause 里）
        const errorMsg = [
            err && err.message,
            err && err.cause && err.cause.message,
            err && err.cause && err.cause.cause && err.cause.cause.message
        ].filter(Boolean).join(' ');

        if (/UNIQUE constraint failed|SQLITE_CONSTRAINT_UNIQUE/i.test(errorMsg)) {
            return json({ success: false, message: '这个邮箱已经订阅过了哦！' }, 409);
        }

        if (/no such column|no such table/i.test(errorMsg)) {
            return json({ success: false, message: '数据库结构不完整，请先执行 migrations/001_subscribers.sql 迁移。' }, 500);
        }

        return json({ success: false, message: '服务器开小差了，请稍后再试。' }, 500);
    }
}
