// 云函数入口文件
const cloud = require('wx-server-sdk')
const AipImageClassifyClient = require("baidu-aip-sdk").imageClassify
cloud.init()

// 百度AI配置（从百度ai获取）
const APP_ID = "118570866"
const API_KEY = "kLrjWTJXSdfpYyEsbvnGgj3g"
const SECRET_KEY = "b7Vy6nrMoYNO15uTxrT5WTbbM3RYoS7F"
const client = new AipImageClassifyClient(APP_ID, API_KEY, SECRET_KEY)

// 本地食物数据库（补充百度API未返回热量的情况）
const localFoodDB = [
  { name: "米饭", calorie: 116, unit: "千卡/100克" },
  { name: "苹果", calorie: 53, unit: "千卡/100克" }
]

exports.main = async (event, context) => {
  try {
    // 1. 下载用户上传的图片
    const fileID = event.fileID
    const fileContent = await cloud.downloadFile({ fileID })
    const imageBuffer = fileContent.fileContent
    
    // 2. 调用百度菜品识别API
    const base64Img = imageBuffer.toString('base64')
    const result = await client.dishDetect(base64Img)
    
    // 3. 处理识别结果
    if (result.error_code) {
      throw new Error(`百度API错误: ${result.error_msg}`)
    }

    const foodInfo = result.result[0]
    let calorie = foodInfo.calorie // 百度返回的热量
    
    // 4. 如果百度未返回热量，从本地数据库查询
    if (!calorie) {
      const localData = localFoodDB.find(item => 
        foodInfo.name.includes(item.name)
      )
      calorie = localData?.calorie || "未知"
    }

    // 5. 返回最终结果
    return {
      success: true,
      foodName: foodInfo.name,
      calorie: calorie + ' 千卡/100克',
      probability: foodInfo.probability
    }
    
  } catch (err) {
    return {
      success: false,
      error: err.message
    }
  }
}