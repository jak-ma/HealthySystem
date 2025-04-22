// pages/login/login.js
const app = getApp();

Page({
  data: {
    username: '',
    password: ''
  },

  // 用户名输入
  onUsernameInput(e) {
    this.setData({
      username: e.detail.value
    });
  },

  // 密码输入
  onPasswordInput(e) {
    this.setData({
      password: e.detail.value
    });
  },

  // 登录按钮点击
  onLogin() {
    const { username, password } = this.data;
    // 输入验证
    if (!username || !password) {
      wx.showToast({
        title: '请输入用户名和密码',
        icon: 'none'
      });
      return;
    }

    // 显示加载中
    wx.showLoading({
      title: '登录中...',
      mask: true
    });

    // 使用app.js中的登录方法直接与云数据库交互
    const app = getApp();
    app.login(username, password)
      .then(res => {
        wx.hideLoading();
        // 登录成功
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });
        
        // 跳转到首页
        wx.reLaunch({
          url: '/pages/index/index'
        });
      })
      .catch(err => {
        // 登录失败
        wx.hideLoading();
        wx.showToast({
          title: err.msg || '登录失败',
          icon: 'none'
        });
      });
  }
  });
