// cloud/functions/mealReminder/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: process.env.envId })

exports.main = async (event, context) => {
    const { action } = event
    const db = cloud.database()
    const { OPENID } = cloud.getWXContext()

    // 统一用户数据过滤
    const userFilter = { userId: OPENID }

    try {
        switch (action) {
            // 获取用户所有提醒
            case 'getReminders':
                return await db.collection('meal_reminders')
                    .where({ userId: OPENID })
                    .orderBy('type', 'asc') // 按 type 升序排序（早餐 -> 午餐 -> 晚餐）
                    .get();

            // 添加新提醒
            // cloud/functions/mealReminder/index.js
            case 'addReminder':
                // 检查是否已存在相同类型的提醒
                const existing = await db.collection('meal_reminders')
                    .where({
                        userId: OPENID,
                        type: event.type
                    })
                    .count();

                if (existing.total > 0) {
                    throw new Error(`已存在 ${event.type} 的提醒`);
                }

                // 不存在则新增
                return await db.collection('meal_reminders').add({
                    data: {
                        ...event,
                        userId: OPENID,
                        enabled: true,
                        createdAt: db.serverDate()
                    }
                });
            // 更新提醒时间
            case 'updateReminder':
                return await db.collection('meal_reminders')
                    .doc(event.id)
                    .update({
                        data: { time: event.newTime }
                    })

            // 切换提醒状态
            case 'toggleReminder':
                return await db.collection('meal_reminders')
                    .doc(event.id)
                    .update({
                        data: { enabled: event.enabled }
                    })

            default:
                throw new Error('无效操作类型')
        }
    } catch (e) {
        return { error: e.message }
    }
}