/**
 * functions/api/confirm.js
 * 确认订阅：邮件里的链接会访问这里，把订阅状态置为 confirmed
 */

function htmlPage(origin, title, text) {
    const html =
        '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1">' +
        '<title>' + title + ' · Renyi Games</title>' +
        '<style>' +
        'body{margin:0;background:#fef7f0;font-family:"Hiragino Sans","PingFang SC","Microsoft YaHei",sans-serif;color:#5b4a3d;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;-webkit-font-smoothing:antialiased}' +
        '.card{background:#fff;border:1px solid #f0e2d4;border-radius:24px;max-width:460px;width:100%;padding:40px 34px;text-align:center;box-shadow:0 18px 44px rgba(224,122,63,.12)}' +
        '.logo{display:inline-grid;place-items:center;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#ffb37a,#ff8a5c);color:#fff;font-weight:900;font-size:24px;box-shadow:0 8px 20px rgba(255,138,92,.35)}' +
        'h1{font-size:22px;font-weight:800;margin:18px 0 8px}' +
        'p{font-size:14px;line-height:1.8;color:#8a7460;margin:0}' +
        '.btn{display:inline-block;margin-top:24px;background:linear-gradient(135deg,#ffb37a,#ff8a5c);color:#fff;text-decoration:none;font-weight:700;padding:11px 28px;border-radius:999px;box-shadow:0 8px 18px rgba(255,138,92,.3)}' +
        '</style></head><body>' +
        '<div class="card"><span class="logo">R</span>' +
        '<h1>' + title + '</h1>' +
        '<p>' + text + '</p>' +
        '<a class="btn" href="' + origin + '/">返回首页</a>' +
        '</div></body></html>';

    return new Response(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
}

export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const origin = url.origin;
    const token = (url.searchParams.get('token') || '').trim();

    if (!token) {
        return htmlPage(origin, '链接无效', '确认链接无效或已过期，请回到官网重新订阅。');
    }

    try {
        const row = await env.DB
            .prepare('SELECT id, email, status FROM subscribers WHERE token = ? LIMIT 1')
            .bind(token)
            .first();

        if (!row) {
            return htmlPage(origin, '链接无效', '确认链接无效或已过期，请回到官网重新订阅。');
        }

        if (row.status === 'confirmed') {
            return htmlPage(origin, '订阅已确认', row.email + ' 已经确认过订阅，无需重复操作。');
        }

        await env.DB
            .prepare("UPDATE subscribers SET status = 'confirmed', confirmed_at = datetime('now'), token = NULL WHERE id = ?")
            .bind(row.id)
            .run();

        return htmlPage(origin, '订阅成功 🎉', row.email + ' 已确认订阅，新作与内测消息会第一时间通知你。');
    } catch (err) {
        console.error('Confirm error:', err);
        return htmlPage(origin, '出了点小问题', '服务器开小差了，请稍后再试，或回到官网重新订阅。');
    }
}
