/**
 * functions/api/subscribe.js
 * 处理订阅请求: 接收邮箱 -> 存入 D1 -> 返回成功信息
 */
export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        // 1. 解析前端传来的 JSON 数据
        // 注意：如果请求体不是 JSON，这里也会报错，建议加个 try-catch 或判断 header
        let email;
        try {
            const body = await request.json();
            email = body.email;
        } catch (e) {
            return new Response(JSON.stringify({ success: false, message: "请求格式错误" }), { status: 400 });
        }

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
        // 确保 env.DB 是你的 D1 绑定名称
        const stmt = env.DB.prepare("INSERT INTO subscribers (email) VALUES (?)");
        await stmt.bind(email).run();

        // 3. 返回成功响应
        // 【修复点】这里必须使用英文半角引号 " "
        return new Response(JSON.stringify({
            success: true,
            message: "🎉 订阅成功！感谢您的关注。"
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        console.error("Subscription error:", err);

        // 判断是否是唯一性冲突 (SQLite 错误码或消息)
        // 这里的 err.cause?.message 是 Wrangler v4/D1 常见的报错位置
        const errorMsg = err.message || (err.cause && err.cause.message) || "";

        if (errorMsg.includes('UNIQUE constraint failed')) {
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