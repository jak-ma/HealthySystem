// cloudfunctions/getDietRecords/index.js
const { opendir } = require('fs');
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { date} = event;//解构前端传入的参数
  
  try {
    const db = cloud.database();//引用数据库
    const res = await db.collection('diet_logs')
    //约束条件
      .where({
        date,//日期
        _openid:cloud.getWXContext().OPENID//用户唯一标识
      })
      .orderBy('createTime', 'desc')
      .get();
      
    return {
      code: 0,
      data: res.data//返回实际数据
    };
  } catch (err) {
    return {
      code: -1,
      message: err.message
    };
  }
}