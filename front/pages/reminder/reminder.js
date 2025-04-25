// 用药提醒页面

Page({
  data: {
    // 界面控制
    showManualForm: false,
    showOcrCapture: false,
    showSuccessModal: false,
    
    // 药品信息
    medicineName: '',
    medicineDosage: '',
    medicineTime: '08:00', // 默认早上8点
    medicineUsage: '口服',
    frequency: 1,
    enableEarlyRemind: true,
    
    // OCR相关
    tempImagePath: '',
    ocrResult: null,
    ocrError: false,
    
    // 药品列表
    medicineList: [],
    
  // 注意修改此处配置
  //  // 腾讯云OCR配置
  //   secretId: '',
  //   secretKey: ''
  // },

  onLoad: function() {
    this.fetchMedicineList();
  },
  
  // 界面控制函数
  showManualForm: function() {
    this.setData({
      showManualForm: true,
      showOcrCapture: false
    });
  },
  
  hideManualForm: function() {
    this.setData({
      showManualForm: false,
      medicineName: '',
      medicineDosage: '',
      medicineTime: '08:00',
      medicineUsage: '口服',
      frequency: 1
    });
  },
  
  showOcrCapture: function() {
    this.setData({
      showOcrCapture: true,
      showManualForm: false,
      tempImagePath: '',
      ocrResult: null,
      ocrError: false
    });
  },
  
  hideSuccessModal: function() {
    this.setData({
      showSuccessModal: false
    });
  },
  
  // 表单输入处理函数
  onMedicineNameInput: function(e) {
    this.setData({
      medicineName: e.detail.value
    });
  },
  
  onMedicineDosageInput: function(e) {
    this.setData({
      medicineDosage: e.detail.value
    });
  },
  
  onMedicineUsageInput: function(e) {
    this.setData({
      medicineUsage: e.detail.value
    });
  },
  
  onTimeChange: function(e) {
    this.setData({
      medicineTime: e.detail.value
    });
  },
  
  // 快捷选择函数
  selectQuickMedicine: function(e) {
    this.setData({
      medicineName: e.currentTarget.dataset.name
    });
  },
  
  selectQuickTime: function(e) {
    this.setData({
      medicineTime: e.currentTarget.dataset.time
    });
  },
  
  // 频次控制
  increaseFrequency: function() {
    let frequency = this.data.frequency;
    if (frequency < 5) {
      this.setData({
        frequency: frequency + 1
      });
    } else {
      wx.showToast({
        title: '最多每日5次',
        icon: 'none'
      });
    }
  },
  
  decreaseFrequency: function() {
    let frequency = this.data.frequency;
    if (frequency > 1) {
      this.setData({
        frequency: frequency - 1
      });
    } else {
      wx.showToast({
        title: '至少每日1次',
        icon: 'none'
      });
    }
  },
  
  // 提醒设置
  toggleEarlyRemind: function(e) {
    this.setData({
      enableEarlyRemind: e.detail.value
    });
  },
  
  // 语音输入
  startVoiceInput: function(e) {
    const field = e.currentTarget.dataset.field;
    const that = this;
    
    // 调用微信语音识别接口
    wx.startRecord({
      success: function(res) {
        const content = res.result || '';
        if (field === 'medicineName') {
          that.setData({
            medicineName: content
          });
        }
      },
      fail: function() {
        wx.showToast({
          title: '语音识别失败',
          icon: 'none'
        });
      }
    });
    
    // 10秒后自动停止录音
    setTimeout(function() {
      wx.stopRecord();
    }, 10000);
  },
  
  // 添加药品提醒
  addMedicineReminder: function() {
    const { medicineName, medicineDosage, medicineTime, medicineUsage, frequency, enableEarlyRemind } = this.data;
    
    if (!medicineName) {
      wx.showToast({
        title: '请输入药品名称',
        icon: 'none'
      });
      return;
    }
    
    // 处理多次服药的时间
    let times = [medicineTime];
    if (frequency > 1) {
      // 简单处理：根据频次平均分配时间
      const baseHour = parseInt(medicineTime.split(':')[0]);
      const baseMinute = parseInt(medicineTime.split(':')[1]);
      const interval = Math.floor(24 / frequency);
      
      times = [];
      for (let i = 0; i < frequency; i++) {
        let hour = (baseHour + i * interval) % 24;
        let timeStr = `${hour.toString().padStart(2, '0')}:${baseMinute.toString().padStart(2, '0')}`;
        times.push(timeStr);
      }
    }
    
    const timeString = times.join(',');
    
    // 构建药品数据
    const medicineData = {
      name: medicineName,
      dosage: medicineDosage || '',
      time: timeString,
      usage: medicineUsage || '口服',
      frequency: `每日${frequency}次`,
      earlyRemind: enableEarlyRemind,
      createTime: new Date().getTime()
    };
    
    // 保存到云数据库
    wx.cloud.database().collection('medicineReminders').add({
      data: medicineData,
      success: res => {
        // 显示成功提示
        this.setData({
          showSuccessModal: true,
          showManualForm: false,
          medicineName: '',
          medicineDosage: '',
          medicineTime: '08:00',
          medicineUsage: '口服',
          frequency: 1
        });
        
        // 显示文字提示并添加震动效果
        wx.showToast({
          title: '提醒设置成功',
          icon: 'success'
        });
        wx.vibrateShort();
        
        // 刷新列表
        this.fetchMedicineList();
      },
      fail: err => {
        wx.showToast({
          title: '保存失败，请重试',
          icon: 'none'
        });
        console.error('添加药品提醒失败', err);
      }
    });
  },
  
  // 获取药品列表
  fetchMedicineList: function() {
    wx.cloud.database().collection('medicineReminders')
      .orderBy('createTime', 'desc')
      .get({
        success: res => {
          this.setData({
            medicineList: res.data
          });
        },
        fail: err => {
          console.error('获取药品列表失败', err);
        }
      });
  },
  
  // 编辑药品
  editMedicine: function(e) {
    const id = e.currentTarget.dataset.id;
    const medicine = this.data.medicineList.find(item => item._id === id);
    
    if (medicine) {
      // 处理时间和频次
      const times = medicine.time.split(',');
      const frequency = times.length;
      
      this.setData({
        showManualForm: true,
        medicineName: medicine.name,
        medicineDosage: medicine.dosage,
        medicineTime: times[0], // 使用第一个时间点
        medicineUsage: medicine.usage,
        frequency: frequency,
        enableEarlyRemind: medicine.earlyRemind,
        currentEditId: id
      });
    }
  },
  
  // 删除药品
  deleteMedicine: function(e) {
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个用药提醒吗？',
      confirmColor: '#ff4d4f',
      success: res => {
        if (res.confirm) {
          wx.cloud.database().collection('medicineReminders').doc(id).remove({
            success: () => {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
              this.fetchMedicineList();
            },
            fail: err => {
              wx.showToast({
                title: '删除失败，请重试',
                icon: 'none'
              });
              console.error('删除药品提醒失败', err);
            }
          });
        }
      }
    });
  },
  
  // OCR相关函数
  takePhoto: function() {
    const ctx = wx.createCameraContext();
    ctx.takePhoto({
      quality: 'high',
      success: res => {
        this.setData({
          tempImagePath: res.tempImagePath
        });
      },
      fail: () => {
        wx.showToast({
          title: '拍照失败，请重试',
          icon: 'none'
        });
      }
    });
  },
  
  // 从相册选择图片
  chooseImage: function() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: res => {
        this.setData({
          tempImagePath: res.tempFilePaths[0]
        });
      },
      fail: () => {
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },
  
  retakePhoto: function() {
    this.setData({
      tempImagePath: '',
      ocrResult: null,
      ocrError: false
    });
  },
  
  confirmPhoto: function() {
    // 显示加载提示
    wx.showLoading({
      title: '正在识别...',
      mask: true
    });
    
    // 将图片转为base64
    wx.getFileSystemManager().readFile({
      filePath: this.data.tempImagePath,
      encoding: 'base64',
      success: res => {
        // 调用腾讯云OCR接口
        this.callTencentOcr(res.data);
      },
      fail: () => {
        wx.hideLoading();
        this.setData({
          ocrError: true
        });
      }
    });
  },
  
  callTencentOcr: function(imageBase64) {
    // 上传图片到云存储
    const cloudPath = 'prescriptions/' + new Date().getTime() + '.jpg';
    const fileContent = wx.base64ToArrayBuffer(imageBase64);
    
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      fileContent: fileContent,
      filePath: this.data.tempImagePath, // 添加filePath参数，解决上传失败问题
      success: res => {
        // 调用云函数进行OCR识别
        wx.cloud.callFunction({
          name: 'ocrPrescription',
          data: {
            fileID: res.fileID
          },
          success: result => {
            wx.hideLoading();
            
            if (result.result && result.result.success) {
              // 处理OCR识别结果
              const ocrData = result.result.MedicalInvoiceInfos[0];
              this.setData({
                ocrResult: ocrData
              });
              // 添加震动效果
              wx.vibrateShort();
            } else {
              this.setData({
                ocrError: true
              });
              console.error('OCR识别失败', result);
            }
          },
          fail: err => {
            wx.hideLoading();
            this.setData({
              ocrError: true
            });
            console.error('调用OCR云函数失败', err);
          }
        });
      },
      fail: err => {
        wx.hideLoading();
        this.setData({
          ocrError: true
        });
        console.error('上传图片失败', err);
      }
    });
  },
  
  useOcrResult: function() {
    const { ocrResult } = this.data;
    
    if (ocrResult) {
      // 解析OCR结果中的频次
      let frequency = 1;
      if (ocrResult.Frequency) {
        const match = ocrResult.Frequency.match(/\d+/);
        if (match) {
          frequency = parseInt(match[0]);
        }
      }
      
      // 解析OCR结果中的第一个时间
      let firstTime = '08:00';
      if (ocrResult.Time) {
        const times = ocrResult.Time.split(',');
        if (times.length > 0) {
          firstTime = times[0];
        }
      }
      
      // 填充到表单
      this.setData({
        showOcrCapture: false,
        showManualForm: true,
        medicineName: ocrResult.Name || '',
        medicineDosage: ocrResult.Dosage || '',
        medicineTime: firstTime,
        medicineUsage: ocrResult.Usage || '口服',
        frequency: frequency
      });
    }
  },
  
  cancelOcr: function() {
    this.setData({
      showOcrCapture: false,
      tempImagePath: '',
      ocrResult: null,
      ocrError: false
    });
  },
  
  switchToManual: function() {
    this.setData({
      showOcrCapture: false,
      showManualForm: true,
      tempImagePath: '',
      ocrResult: null,
      ocrError: false
    });
  },
  
  cameraError: function(e) {
    console.error('相机错误', e.detail);
    wx.showToast({
      title: '相机启动失败，请检查权限',
      icon: 'none'
    });
  }
});