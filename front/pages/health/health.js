Page({
  data: {
      advice: '',
      historyData: [],
      isHistoryVisible: false,
      // 定义各健康指标的合理范围
      healthRanges: {
          height: { min: 50, max: 250 },
          weight: { min: 10, max: 300 },
          bloodPressure: { min: 70, max: 220 },
          bloodLipid: { min: 0, max: 10 },
          bloodOxygen: { min: 90, max: 100 }
      },
      imagePath: ''
  },
  chooseImage: function () {
      wx.chooseImage({
          count: 1,
          sizeType: ['original', 'compressed'],
          sourceType: ['album', 'camera'],
          success: res => {
              this.setData({
                  imagePath: res.tempFilePaths[0]
              });
          }
      });
  },
  submitForm(e) {
      const formData = e.detail.value;
      if (this.data.imagePath) {
          wx.cloud.uploadFile({
              cloudPath: 'medical_reports/' + new Date().getTime() + '.jpg',
              filePath: this.data.imagePath,
              success: res => {
                  console.log('照片上传成功', res.fileID);
                  // 将 fileID 添加到表单数据中
                  formData.reportImageFileID = res.fileID;
                  // 保存数据到云开发数据库
                  wx.cloud.database().collection('healthRecords').add({
                      data: formData,
                      success: res => {
                          // 调用云函数获取AI建议
                          wx.cloud.callFunction({
                              name: 'getAIAdvice',
                              data: formData,
                              success: res => {
                                  this.setData({
                                      advice: res.result.advice
                                  });
                              },
                              fail: err => {
                                  console.error('调用云函数失败', err);
                              }
                          });
                      },
                      fail: err => {
                          console.error('保存数据到数据库失败', err);
                      }
                  });
              },
              fail: err => {
                  console.error('照片上传失败', err);
              }
          });
      } else {
          // 没有选择照片，直接保存表单数据到数据库
          wx.cloud.database().collection('healthRecords').add({
              data: formData,
              success: res => {
                  // 调用云函数获取AI建议
                  wx.cloud.callFunction({
                      name: 'getAIAdvice',
                      data: formData,
                      success: res => {
                          this.setData({
                              advice: res.result.advice
                          });
                      },
                      fail: err => {
                          console.error('调用云函数失败', err);
                      }
                  });
              },
              fail: err => {
                  console.error('保存数据到数据库失败', err);
              }
          });
      }
  },
  viewHistoryData() {
      wx.cloud.database().collection('healthRecords')
         .orderBy('createTime', 'desc') // 按创建时间降序排列
         .limit(9) // 取最近的9条数据
         .get({
              success: res => {
                  const markedData = res.data.map(item => {
                      const newItem = { ...item };
                      for (const key in this.data.healthRanges) {
                          if (item[key]) {
                              const value = parseFloat(item[key]);
                              const range = this.data.healthRanges[key];
                              if (value < range.min) {
                                  newItem[`${key}Status`] = '过低';
                              } else if (value > range.max) {
                                  newItem[`${key}Status`] = '过高';
                              }
                          }
                      }
                      return newItem;
                  });
                  this.setData({
                      historyData: markedData,
                      isHistoryVisible: true
                  });
              },
              fail: err => {
                  console.error('读取历史数据失败', err);
              }
          });
  },
  // 新增方法，用于切换历史数据的显示和隐藏状态
  toggleHistoryVisibility() {
      this.setData({
          isHistoryVisible: !this.data.isHistoryVisible
      });
  }
});