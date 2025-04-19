const cloud = require('wx-server-sdk')
const db = cloud.database()

/**
 * 通过ISO时间字符串获取“YYYY-MM-DD HH-MM”格式的字符串
 * @param {*} date iso格式的时间
 */
function formatTime(timestamp) {
    const date = new Date(typeof timestamp === 'number' ? timestamp : new Date(timestamp));
  
    if (isNaN(date.getTime())) return '--';
  
    // 手动加 8 小时偏移（北京时间 = UTC +8）
    const beijingDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  
    const year = beijingDate.getUTCFullYear();
    const month = String(beijingDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(beijingDate.getUTCDate()).padStart(2, '0');
    const hours = String(beijingDate.getUTCHours()).padStart(2, '0');
    const minutes = String(beijingDate.getUTCMinutes()).padStart(2, '0');
  
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }
  

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
    time :formatTime(new Date().getTime()),
  }

  //数据库操作，添加新文档
  const { _id } = await db.collection('diet_logs').add({ data: record })
  
  //返回标准化结果
  return {
    success: true,//执行状态
    recordId: _id,//新纪录的id
    timestamp: record.timestamp//时间戳
  }
}