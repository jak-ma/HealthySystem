const cloud = require('wx-server-sdk')
cloud.init({ env: process.env.ENV_ID || cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 初始化集合索引（冷启动时执行）
let isInitialized = false
async function initDB() {
  try {
    await db.collection('diet_logs').createIndex({
      _openid: 1,
      date: -1,
      mealType: 1
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
  addRecord: async (event, context) => {
    const { date, mealType, imageUrl, timestamp, calories } = event
    
    // 数据校验
    if (!['早餐', '午餐', '晚餐'].includes(mealType)) {
      throw new Error('无效的餐次类型')
    }

    const record = {
      _openid: cloud.getWXContext().OPENID,
      date,
      mealType,
      imageUrl,
      timestamp,
      calories,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate()
    }

    const { _id } = await db.collection('diet_logs').add({ data: record })
    return { recordId: _id, calories }
  },

  getRecords: require('./handlers/getRecords')
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