// diet.js - 饮食专区页面逻辑

Page({
    /*********************************
     * 页面数据
     *********************************/
    data: {
        envId: 'cloud1-7graxmip2ba8afa6', // 云环境ID
        dietFunctions: [
          { id: 'recipes', name: '营养食谱', icon: '/icons/diet/recipes.png' },
          { id: 'reminder', name: '用餐提醒', icon: '/icons/diet/reminder.png' },
          { id: 'log', name: '饮食日志', icon: '/icons/diet/log.png' }
        ],
        meals: ['早餐', '午餐', '晚餐'], // 餐次类型
        mealIcons: [
          '/images/diet_icon/icon_breakfast.png',
          '/images/diet_icon/icon_lunch.png',
          '/images/diet_icon/icon_dinner.png'
        ],
        hasUploaded: {}, // 饮食记录
        todaySummary: null, // 今日汇总
        loading: true, // 加载状态
    
      },
  
    /*********************************
     * 生命周期
     *********************************/
    onLoad() {
      this.loadRecommendedRecipes()
      this.loadDietLog()
      this.checkReminderStatus()
    },
  
    /*********************************
     * 通用工具
     *********************************/
    getTodayDate() {
      const now = new Date()
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    },
  
    calculateSummary(meals) {
      if (!meals || meals.length === 0) return null
      const total = meals.reduce((s, m) => s + (m.calories || 0), 0)
      return { calories: total, progress: Math.min(Math.round((total / 2000) * 100), 100) }
    },
  
    /*********************************
     * 饮食日志：加载
     *********************************/
    async loadDietLog() {
      try {
        const { result } = await wx.cloud.callFunction({
          name: 'dietLog',
          data: { action: 'getRecords', date: this.getTodayDate() }
        })
        this.setData({
          hasUploaded: result.logs || {},
          todaySummary: this.calculateSummary(result.meals)
        })
      } catch (e) {
        console.error('加载饮食记录失败', e)
        wx.showToast({ title: '加载记录失败', icon: 'none' })
      }
    },
  
    /*********************************
     * 上传图片 & 保存记录
     *********************************/
    uploadMeal(e) {
      const mealType = e.currentTarget.dataset.type
      this.chooseImage(mealType)
    },
  
    chooseImage(mealType) {
      wx.showActionSheet({
        itemList: ['拍照', '从相册选择'],
        success: res => this.chooseImageWithSource(mealType, res.tapIndex === 0 ? ['camera'] : ['album']),
        fail: () => wx.showToast({ title: '取消选择', icon: 'none' })
      })
    },
  
    chooseImageWithSource(mealType, sourceType) {
      wx.chooseMedia({
        count: 1,
        sizeType: ['compressed'],
        sourceType,
        camera: 'back',
        success: async res => {
          let filePath = Array.isArray(res.tempFiles) ? res.tempFiles[0].tempFilePath : res.tempFilePaths?.[0]
          if (!filePath) return wx.showToast({ title: '未获取到图片路径', icon: 'none' })
          try {
            const info = await wx.getFileInfo({ filePath })
            if (info.size > 5 * 1024 * 1024) throw new Error('图片大小超过5MB')
            if (sourceType[0] === 'camera') filePath = await this.fixImageOrientation(filePath)
            await this.uploadImage(filePath, mealType)
          } catch (err) {
            console.error('图片处理失败', err)
            wx.showToast({ title: err.message || '图片处理失败', icon: 'none' })
            wx.getFileSystemManager().unlink({ filePath })
          }
        },
        fail: () => wx.showToast({ title: '取消选择', icon: 'none' })
      })
    },
  
    async fixImageOrientation(filePath) {
      return new Promise(resolve => {
        if (wx.getSystemSetting().platform === 'android') return resolve(filePath)
        wx.getImageInfo({
          src: filePath,
          success: async info => {
            if (info.orientation && info.orientation !== 'up') {
              try { filePath = await this.rotateImage(filePath, info.orientation) } catch { /* 保留原图 */ }
            }
            resolve(filePath)
          },
          fail: () => resolve(filePath)
        })
      })
    },
  
    rotateImage(filePath, orientation) {
      return new Promise((resolve, reject) => {
        wx.createSelectorQuery().in(this).select('#imageCanvas').fields({ node: true }).exec(res => {
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          const img = canvas.createImage()
          img.onload = () => {
            const { width, height } = img
            const deg = { right: 90, down: 180, left: 270, up: 0 }[orientation] || 0
            const rad = deg * Math.PI / 180
            const newW = deg % 180 === 0 ? width : height
            const newH = deg % 180 === 0 ? height : width
            canvas.width = newW
            canvas.height = newH
            ctx.save(); ctx.translate(newW / 2, newH / 2); ctx.rotate(rad)
            ctx.drawImage(img, -width / 2, -height / 2, width, height)
            ctx.restore()
            canvas.toTempFilePath({ fileType: 'jpg', quality: 0.9, success: ({ tempFilePath }) => resolve(tempFilePath), fail: reject })
          }
          img.onerror = reject; img.src = filePath
        })
      })
    },
  
    async uploadImage(filePath, mealType) {
      wx.showLoading({ title: '上传中...', mask: true })
      try {
        const cloudPath = `diet-log/${this.getTodayDate()}/${mealType}-${Date.now()}.jpg`
        const { fileID } = await wx.cloud.uploadFile({ cloudPath, filePath, config: { env: this.data.envId } })
        const { calories } = await this.saveDietRecord(mealType, fileID)
        this.updateUploadStatus(mealType, calories)
        wx.showToast({ title: '上传成功', icon: 'success' })
      } catch (err) {
        console.error('上传流程失败', err)
        wx.showToast({ title: err.errMsg || '上传失败', icon: 'none' })
      } finally {
        wx.hideLoading(); wx.getFileSystemManager().unlink({ filePath })
      }
    },
  
    async saveDietRecord(mealType, fileID) {
      const record = {
        date: this.getTodayDate(), mealType, imageUrl: fileID, timestamp: Date.now(),
        calories: this.estimateCalories(mealType), status: 'uploaded'
      }
      const { result } = await wx.cloud.callFunction({ name: 'dietLog', data: { action: 'addRecord', ...record } })
      return { ...result, calories: record.calories }
    },
  
    estimateCalories(mealType) { return { 早餐: 400, 午餐: 800, 晚餐: 600 }[mealType] || 500 },
  
    updateUploadStatus(mealType, add = 0) {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      const cal = (this.data.todaySummary?.calories || 0) + add
      this.setData({ [`hasUploaded.${mealType}`]: time, todaySummary: { calories: cal, progress: Math.min(Math.round(cal / 20), 100) } })
    },
  
    /*********************************
     * 推荐食谱
     *********************************/
    async loadRecommendedRecipes() {
      try {
        wx.showLoading({ title: '加载中', mask: true })
        const profile = await this.getHealthProfile()
        const { result } = await wx.cloud.callFunction({ name: 'getRecommendedRecipes', data: { conditions: profile.conditions || [] } })
        this.setData({ recommendedRecipes: result.data, loading: false })
      } catch (e) {
        console.error('加载食谱失败', e)
        wx.showToast({ title: '加载失败', icon: 'none' })
      } finally { wx.hideLoading() }
    },
  
    getHealthProfile() {
      return new Promise(resolve => {
        wx.cloud.callFunction({ name: 'getHealthProfile', success: r => resolve(r.result), fail: () => resolve({}) })
      })
    },
  
    checkReminderStatus() { this.setData({ reminderStatus: wx.getStorageSync('mealReminder') || {} }) },
    showHelp() { this.setData({ showHelpModal: true }) },
    hideHelp() { this.setData({ showHelpModal: false }) }
  })
  