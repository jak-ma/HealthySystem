const cloud = require('wx-server-sdk')
const db = cloud.database()

module.exports = async (event, context) => {
  // 1. 参数解构
  const { date, mealType, foodName,calorie,imageUrl} = event
  
  // 2. 数据校验
  if (!['早餐', '午餐', '晚餐'].includes(mealType)) {
    throw new Error('INVALID_MEAL_TYPE: 餐次类型必须是早餐/午餐/晚餐')
  }

  // 3. 构造记录
  const record = {
    _openid: cloud.getWXContext().OPENID, // 自动注入用户身份
    date,//格式化日期字符串
    mealType,
    foodName,
    calorie,
    imageUrl,
    timestamp: new Date().getTime(),//生成服务器端的时间戳
    createdAt: db.serverDate(),
    updatedAt: db.serverDate()
  }

  //数据库操作，添加新文档
  const { _id } = await db.collection('diet_logs').add({ data: record })
  
  //返回标准化结果
  return {
    success: true,//执行状态
    recordId: _id,//新纪录的id
    calories,//卡路里值
    timestamp: record.timestamp//时间戳
  }
}