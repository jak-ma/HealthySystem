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
    const fileID = event.fileID//前端上传图片到云存储后返回的文件ID
    const fileContent = await cloud.downloadFile({ fileID })//下载图片文件到云函数临时目录
    const imageBuffer = fileContent.fileContent
    
    // 2. 调用百度菜品识别API
    const base64Img = imageBuffer.toString('base64')//将图片转为Base64编码（百度API要求的格式）
    const result = await client.dishDetect(base64Img)//百度提供的菜品识别接口
    
    // 3. 处理识别结果
    if (result.error_code) {
      throw new Error(`百度API错误: ${result.error_msg}`)
    }

    const foodInfo = result.result[0]
    let calorie = foodInfo.calorie // 百度返回的热量
    
    // 4. 如果百度未返回热量，从本地数据库查询,如果仍未返回，则返回“未知”
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
      calorie: calorie + ' 千卡/100克',//返回每单位卡路里热量
      probability: foodInfo.probability
    }
    
  } catch (err) {
    return {
      success: false,
      error: err.message
    }
  }
}