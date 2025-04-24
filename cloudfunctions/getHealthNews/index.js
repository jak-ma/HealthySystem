// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: "cloud1-7gomrs3ufe613311" }) // 使用与项目一致的云环境ID

// 云函数入口函数
exports.main = async (event, context) => {
  // 模拟健康资讯数据
  // 实际应用中，这些数据应该存储在云数据库中
  const healthNews = [
    {
      id: 1,
      title: '每天一苹果，医生远离我',
      content: '研究表明，每天食用一个苹果可以降低心脏病和中风的风险。苹果富含抗氧化物质和膳食纤维，有助于降低胆固醇。',
      date: '2023-05-15',
      image: '/images/apple.jpg'
    },
    {
      id: 2,
      title: '适量运动对心脏健康的重要性',
      content: '每周进行150分钟的中等强度有氧运动，可以显著改善心血管健康，降低患心脏病的风险。',
      date: '2023-05-12',
      image: '/images/exercise.jpg'
    },
    {
      id: 3,
      title: '充足睡眠对免疫系统的影响',
      content: '研究显示，每晚保持7-8小时的优质睡眠可以增强免疫系统功能，帮助身体抵抗感染和疾病。',
      date: '2023-05-10',
      image: '/images/sleep.jpg'
    },
    {
      id: 4,
      title: '多喝水对健康的益处',
      content: '保持充分水分摄入可以帮助维持身体功能，促进新陈代谢，并有助于排出体内毒素。',
      date: '2023-05-08',
      image: '/images/water.jpg'
    },
    {
      id: 5,
      title: '减少盐分摄入的重要性',
      content: '过量摄入盐分会增加高血压风险。世界卫生组织建议成人每日盐分摄入量不超过5克。',
      date: '2023-05-05',
      image: '/images/salt.jpg'
    }
  ];

  return {
    code: 0,
    data: healthNews,
    message: '获取健康资讯成功'
  }
}