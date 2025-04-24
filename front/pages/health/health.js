Page({
  data: {
      advice: '',
      historyData: [],
      isHistoryVisible: false,
      healthRanges: {
          height: { min: 50, max: 250 },
          weight: { min: 10, max: 300 },
          bloodPressure: { min: 70, max: 220 },
          bloodLipid: { min: 0, max: 10 },
          bloodOxygen: { min: 90, max: 100 }
      },
      imagePath: ''
  },
  chooseImage() {
      wx.chooseImage({
          count: 1,
          sizeType: ['original', 'compressed'],
          sourceType: ['album', 'camera'],
          success: (res) => {
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
              success: (res) => {
                  formData.reportImageFileID = res.fileID;
                  wx.cloud.database().collection('healthRecords').add({
                      data: formData,
                      success: (res) => {
                          wx.cloud.callFunction({
                              name: 'getAIAdvice',
                              data: formData,
                              success: (res) => {
                                  this.setData({
                                      advice: res.result.advice
                                  });
                              },
                              fail: (err) => {
                                  console.error('调用云函数失败', err);
                              }
                          });
                      },
                      fail: (err) => {
                          console.error('保存数据到数据库失败', err);
                      }
                  });
              },
              fail: (err) => {
                  console.error('照片上传失败', err);
              }
          });
      } else {
          wx.cloud.database().collection('healthRecords').add({
              data: formData,
              success: (res) => {
                  wx.cloud.callFunction({
                      name: 'getAIAdvice',
                      data: formData,
                      success: (res) => {
                          this.setData({
                              advice: res.result.advice
                          });
                      },
                      fail: (err) => {
                          console.error('调用云函数失败', err);
                      }
                  });
              },
              fail: (err) => {
                  console.error('保存数据到数据库失败', err);
              }
          });
      }
  },
  viewHistoryData() {
      wx.cloud.database().collection('healthRecords')
         .orderBy('createTime', 'desc')
         .limit(9)
         .get({
              success: (res) => {
                  const markedData = res.data.map((item) => {
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
              fail: (err) => {
                  console.error('读取历史数据失败', err);
              }
          });
  },
  toggleHistoryVisibility() {
      this.setData({
          isHistoryVisible: !this.data.isHistoryVisible
      });
  },
  deleteRecord(e) {
    console.log(e);
    const recordId = e.currentTarget.dataset.id;
    wx.cloud.database().collection('healthRecords').doc(recordId).remove({
      success: (res) => {
        console.log('数据库删除成功', res);
        // 使用数组的filter方法创建新数组，确保视图更新
        const newHistoryData = this.data.historyData.filter(item => item._id !== recordId);
        this.setData({ historyData: newHistoryData }, () => {
          wx.showToast({ title: '删除成功', icon: 'success' });
        });
      },
      fail: (err) => {
        console.error('数据库删除失败', err);
        wx.showToast({ title: '删除失败，请重试', icon: 'none' });
      }
    });
  }
});
