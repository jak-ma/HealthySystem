// app.js
App({
  globalData: {
    userInfo: null,
    hasLogin: false
  },

  onLaunch: function() {
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-7gomrs3ufe613311', // 替换为你的云环境ID
        traceUser: true
      });
    }

    // 检查登录状态
    this.checkLoginStatus();
  },

  // 检查登录状态
  checkLoginStatus: function() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    
    if (token && userInfo) {
      this.globalData.userInfo = userInfo;
      this.globalData.hasLogin = true;
    } else {
      this.globalData.hasLogin = false;
    }
  },

  // 用户登录
  login: function(username, password) {
    return new Promise((resolve, reject) => {
      // 获取数据库引用
      const db = wx.cloud.database();
      const userCollection = db.collection('users');

      // 查询用户
      userCollection.where({
        username: username
      }).get().then(res => {
        if (res.data.length === 0) {
          // 用户不存在
          reject({ code: 404, msg: '用户不存在' });
          return;
        }

        const user = res.data[0];
        // 验证密码
        if (user.password !== password) {
          reject({ code: 401, msg: '密码错误' });
          return;
        }

        // 登录成功
        const userInfo = {
          id: user._id,
          username: user.username
        };

        // 保存登录状态
        wx.setStorageSync('token', 'user_token_' + new Date().getTime());
        wx.setStorageSync('userInfo', userInfo);
        this.globalData.userInfo = userInfo;
        this.globalData.hasLogin = true;

        resolve({ code: 200, data: userInfo });
      }).catch(err => {
        console.error('登录失败', err);
        reject({ code: 500, msg: '登录失败' });
      });
    });
  },

  // 用户注册
  register: function(username, password) {
    return new Promise((resolve, reject) => {
      // 获取数据库引用
      const db = wx.cloud.database();
      const userCollection = db.collection('users');

      // 检查用户名是否已存在
      userCollection.where({
        username: username
      }).get().then(res => {
        if (res.data.length > 0) {
          // 用户名已存在
          reject({ code: 409, msg: '用户名已存在' });
          return;
        }

        // 添加新用户
        return userCollection.add({
          data: {
            username: username,
            password: password,
            createTime: db.serverDate()
          }
        });
      }).then(res => {
        if (!res) return; // 如果前面已经reject，这里的res会是undefined

        // 注册成功，自动登录
        const userInfo = {
          id: res._id,
          username: username
        };

        // 保存登录状态
        wx.setStorageSync('token', 'user_token_' + new Date().getTime());
        wx.setStorageSync('userInfo', userInfo);
        this.globalData.userInfo = userInfo;
        this.globalData.hasLogin = true;

        resolve({ code: 200, data: userInfo });
      }).catch(err => {
        console.error('注册失败', err);
        reject({ code: 500, msg: '注册失败' });
      });
    });
  },

  // 用户登出
  logout: function() {
    // 清除登录状态
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    this.globalData.userInfo = null;
    this.globalData.hasLogin = false;

    // 跳转到登录页
    wx.reLaunch({
      url: '/pages/login/login'
    });
  }
});
