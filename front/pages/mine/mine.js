// mine页面逻辑
Page({
  data: {
    userInfo: {},
    hasUserInfo: false
  },

  onLoad() {
    // 初始化用户数据
    this.getUserInfo();
  },
  
  onShow() {
    // 每次显示页面时更新用户信息
    this.getUserInfo();
  },
  
  // 获取用户信息
  getUserInfo() {
    const app = getApp();
    if (app.globalData.hasLogin) {
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: true
      });
    } else {
      // 检查本地存储
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo) {
        this.setData({
          userInfo: userInfo,
          hasUserInfo: true
        });
        app.globalData.userInfo = userInfo;
        app.globalData.hasLogin = true;
      } else {
        this.setData({
          hasUserInfo: false
        });
      }
    }
  },

  // 登出
  logout() {
    const app = getApp();
    app.logout(); // 使用app.js中的登出方法
  }
})