// cloudfunctions/dietLog/handlers/getRecords.js
const cloud = require('wx-server-sdk')
const db = cloud.database()

/**
 * 入参: { action: 'getRecords', date: 'YYYY-MM-DD' }
 * 出参: { logs: { 早餐: '08:10', ... }, meals: [ {...}, ... ] }
 */
module.exports = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { date } = event
  if (!date) throw new Error('缺少 date 参数')

  // 取当天所有记录
  const { data } = await db.collection('diet_logs')
    .where({ _openid: OPENID, date })
    .orderBy('timestamp', 'asc')
    .get()

  // 组装 logs 结构（餐次 → 时间）
  const logs = {}
  data.forEach(r => {
    const t = new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    logs[r.mealType] = t
  })

  return { logs, meals: data }
}
