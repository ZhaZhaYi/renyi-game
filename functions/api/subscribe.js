/**
 * functions/api/subscribe.js
 * 处理订阅请求：接收邮箱 -> 存入 D1 -> 返回成功信息
 */
export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        // 1. 解析前端传来的 JSON 数据
        const { email } = await request.json();

        // 简单的校验
        if (!email || !email.includes('@')) {
            return new Response(JSON.stringify({
                success: false,
                message: '请输入有效的邮箱地址'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 2. 执行 SQL 插入
        // ⚠️ 注意：这里的 'DB' 必须和你 wrangler.toml 中配置的 binding 名称一致
        // 如果你之前的初始化默认是 DB，那就用 env.DB；如果是 renyigame_db，就改一下
        const stmt = env.DB.prepare("INSERT INTO subscribers (email) VALUES (?)");
        await stmt.bind(email).run();

        // 3. ✅ 返回成功响应 (这就是所谓的 "Confirm" 内容)
        return new Response(JSON.stringify({
            success: true,
            message: "🎉 订阅成功！感谢您的关注。"
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        // 4. 处理错误 (比如邮箱重复)
        console.error("Subscription error:", err);

        // 判断是否是唯一性冲突 (SQLite 错误码)
        if (err.message && err.message.includes('UNIQUE constraint failed')) {
            return new Response(JSON.stringify({
                success: false,
                message: "这个邮箱已经订阅过了哦！"
            }), {
                status: 409, // Conflict
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 其他未知错误
        return new Response(JSON.stringify({
            success: false,
            message: "服务器开小差了，请稍后再试。"
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}