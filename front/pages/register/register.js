// pages/register/register.js
const app = getApp();

Page({
  data: {
    username: '',
    password: '',
    confirmPassword: ''
  },

  // 输入处理
  handleInputChange: function(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [field]: e.detail.value
    });
  },

  // 注册提交
  onRegister: function() {
    const { username, password, confirmPassword } = this.data;

    // 输入验证
    if (!username || !password || !confirmPassword) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    if (password !== confirmPassword) {
      wx.showToast({
        title: '两次密码不一致',
        icon: 'none'
      });
      return;
    }

    if (password.length < 6) {
      wx.showToast({
        title: '密码至少6位',
        icon: 'none'
      });
      return;
    }

    // 显示加载中
    wx.showLoading({
      title: '注册中...',
      mask: true
    });

    // 使用app.js中的注册方法直接与云数据库交互
    const app = getApp();
    app.register(username, password)
      .then(res => {
        wx.hideLoading();
        
        // 注册成功
        wx.showToast({
          title: '注册成功',
          icon: 'success'
        });

        // 跳转到首页
        wx.reLaunch({
          url: '/pages/index/index'
        });
      })
      .catch(err => {
        wx.hideLoading();
        console.error('注册失败', err);
        wx.showToast({
          title: err.msg || '注册失败',
          icon: 'none'
        });
      });
  }
  });