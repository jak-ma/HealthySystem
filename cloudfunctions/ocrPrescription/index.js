// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 调用腾讯云OCR API
    const result = await cloud.openapi.ocr.generalAccurateOcr({
      imgUrl: event.fileID
    })
    
    // 解析OCR结果，提取药品信息
    // 这里是简化的处理逻辑，实际应用中需要更复杂的文本分析
    const textList = result.TextDetections.map(item => item.DetectedText)
    const fullText = textList.join('\n')
    
    // 提取药品名称（假设药品名称通常在处方的开头部分）
    let name = ''
    const namePatterns = ['药品名称[:：]\\s*(.+)', '名称[:：]\\s*(.+)', '(.+)\\s+\\d+mg']
    for (const pattern of namePatterns) {
      const match = fullText.match(new RegExp(pattern))
      if (match && match[1]) {
        name = match[1].trim()
        break
      }
    }
    
    // 提取剂量
    let dosage = ''
    const dosageMatch = fullText.match(/\d+\s*(mg|ml|g|片|粒)/i)
    if (dosageMatch) {
      dosage = dosageMatch[0]
    }
    
    // 提取用药时间
    let time = '08:00'
    const timeMatch = fullText.match(/(\d{1,2})[:：](\d{1,2})\s*[,，]?\s*(\d{1,2})[:：](\d{1,2})/)
    if (timeMatch) {
      time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2].padStart(2, '0')},${timeMatch[3].padStart(2, '0')}:${timeMatch[4].padStart(2, '0')}`
    }
    
    // 提取频次
    let frequency = '每日1次'
    const frequencyMatch = fullText.match(/每[日天]\s*(\d+)\s*次/)
    if (frequencyMatch) {
      frequency = `每日${frequencyMatch[1]}次`
    }
    
    // 提取用药方式
    let usage = '口服'
    const usagePatterns = ['用法[:：]\\s*(.+)', '服用方法[:：]\\s*(.+)', '(口服|外用|注射|含服)']
    for (const pattern of usagePatterns) {
      const match = fullText.match(new RegExp(pattern))
      if (match) {
        usage = match[1] ? match[1].trim() : match[0].trim()
        break
      }
    }
    
    // 返回处理后的数据
    return {
      success: true,
      MedicalInvoiceInfos: [
        {
          Name: name || '未识别到药品名称',
          Dosage: dosage || '',
          Time: time,
          Frequency: frequency,
          Usage: usage
        }
      ]
    }
  } catch (err) {
    console.error(err)
    return {
      success: false,
      error: err.message
    }
  }
}