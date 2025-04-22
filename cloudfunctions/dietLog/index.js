const cloud = require('wx-server-sdk')
cloud.init({ env: process.env.ENV_ID || cloud.DYNAMIC_CURRENT_ENV })//初始化云开发环境，支持自动匹配和指定
const db = cloud.database()//引用数据库

// 初始化集合索引（冷启动时执行）
let isInitialized = false//防止重复初始化
async function initDB() {
    try {
        await db.collection('diet_logs').createIndex({
            _openid: 1,//按照用户id升序（1为升序，-1为降序）
            date: -1,//按照日期降序
            mealType: 1//按照餐次升序
        })
        console.log('集合索引初始化完成')
    } catch (e) {
        if (e.errCode !== 168) { // 忽略索引已存在的错误
            console.error('索引初始化失败:', e)
        }
    }
}

// 业务处理器
const handlers = {
    addRecord: require('./handlers/addRecord'),//添加记录方法注册
    getRecords: require('./handlers/getRecords')//读取记录方法注册
}

// 主入口
exports.main = async (event, context) => {
    // 初始化检查
    if (!isInitialized) {
        await initDB()
        isInitialized = true
    }

    // 路由处理
    const { action } = event
    if (!handlers[action]) {
        throw new Error(`无效操作: ${action}`)
    }
    return handlers[action](event, context)
}