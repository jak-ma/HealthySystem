// cloudfunctions/dietLog/handlers/getRecords.js
const cloud = require('wx-server-sdk')
const db = cloud.database()//获取数据库

/**
 * 入参: { action: 'getRecords', date: 'YYYY-MM-DD' }
 * 出参: { logs: { 早餐: '08:10', ... }, meals: [ {...}, ... ] }
 */
module.exports = async (event, context) => {
  const { OPENID } = cloud.getWXContext()//获取用户openid
  const { date } = event//从event参数中获取日期，提取event对象的date属性，其内容为标准化字符串“YYYY-MM-DD”
  if (!date) throw new Error('缺少 date 参数')//如果未传参，抛出异常

  // 取当天所有记录，定义一个数据常量
  const { data } = await db.collection('diet_logs')//从数据库中取所有记录
    .where({ _openid: OPENID, date })//查询条件，当前用户+指定日期
    .orderBy('timestamp', 'asc')//按照时间戳升序排序，获取查询结果
    .get()

  // 组装 logs 结构（餐次 → 时间），logs的结构映射为餐次（餐次：时间）
  const logs = {}
  data.forEach(r => {
    const t = new Date(r.timestamp).toLocaleTimeString('zh-CN', {
        timeZone: 'Asia/Shanghai', // 明确指定东八区
        hour: '2-digit',
        minute: '2-digit',
        hour12: false // 强制使用24小时制
      });
    logs[r.mealType] = t
  })

  return { logs, meals: data }
}
