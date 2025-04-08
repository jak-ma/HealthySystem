// index.js
Page({
  data: {
    loading: true,
    banners: [
      { img: '/images/banner1.jpg', link: '/pages/news/detail?id=1' },
      { img: '/images/banner2.jpg', link: '/pages/news/detail?id=2' },
      { img: '/images/banner3.jpg', link: '/pages/news/detail?id=3' },
      { type: 'weather' }
    ],
    // 天气相关数据
    cityName: '北京', // 默认城市
    manualCityInput: '', // 手动输入的城市名
    showCityInput: false, // 是否显示城市输入框
    temperature: '--', // 温度
    weatherDesc: '未知', // 天气描述
    weatherIconCode: '100', // 天气图标代码
    humidity: '--', // 湿度
    windDirection: '--', // 风向
    windScale: '--', // 风力等级
    updateTime: '--', // 更新时间
    apiKey: 'SAXdsW40FvsGmeLpd', // 心知天气API密钥
    quickEntries: [
      // ...保持原有quickEntries数据不变
      { icon: '/images/dataupload.png', text: '数据上传', path: '/pages/register/personal' },
      { icon: '/images/bodycheck.png', text: '体征检测', path: '/pages/register/group' },
      { icon: '/images/healthreport.png', text: '健康报告', path: '/pages/project/join' },
      { icon: '/images/medication.png', text: '用药提醒', path: '/pages/group/join' },
      { icon: '/images/nutritious.png', text: '营养食谱', path: '/pages/service/query' },
      { icon: '/images/food.png', text: '用餐提醒', path: '/pages/service/self' },
      { icon: '/images/eatlog.png', text: '饮食日志', path: '/pages/help/faq' },
      { icon: '/images/minecentre.png', text: '个人中心', path: '/pages/help/index' }
    ],
    currentLatitude: null, // 当前纬度
    currentLongitude: null // 当前经度
  },

  onLoad() {
    this.checkLoginStatus();
    this.getLocation();
    
    setTimeout(() => {
      this.setData({ loading: false });
    }, 1500);
  },

  // 获取位置信息
  getLocation: function() {
    const that = this;
    wx.showLoading({ title: '定位中...' });

    wx.getLocation({
      type: 'wgs84',
      success: function(res) {
        console.log('获取经纬度成功:', res);
        that.setData({
          currentLatitude: res.latitude,
          currentLongitude: res.longitude
        });
        that.getWeatherData(res.latitude, res.longitude);
      },
      fail: function(err) {
        console.error('定位失败:', err);
        wx.hideLoading();
        wx.showToast({
          title: '定位失败，使用默认位置',
          icon: 'none'
        });
        // 使用北京默认坐标
        that.getWeatherData(39.90403, 116.407526);
      }
    });
  },

  // 获取天气数据（修正后的版本）
  getWeatherData: function(latitude, longitude) {
    const that = this;
    wx.showLoading({ title: '获取天气中...' });

    // 心知天气API的正确请求方式
    wx.request({
      url: 'https://api.seniverse.com/v3/weather/now.json',
      method: 'GET',
      data: {
        key: that.data.apiKey,
        location: `${latitude}:${longitude}`,  // 这里是冒号分隔
        language: 'zh-Hans',
        unit: 'c'
      },
      success: function(res) {
        console.log('天气API响应:', res);
        if (res.statusCode === 200 && res.data && res.data.results && res.data.results.length > 0) {
          const result = res.data.results[0];
          const now = result.now;
          const location = result.location;

          that.setData({
            cityName: location.name,
            temperature: now.temperature,
            weatherDesc: now.text,
            weatherIconCode: now.code,
            humidity: now.humidity || '--',
            windDirection: now.wind_direction || '--',
            windScale: now.wind_scale || '--',
            updateTime: that.formatTime(new Date())
          });
        } else {
          console.error('天气数据格式错误:', res);
          wx.showToast({ 
            title: '天气数据获取失败',
            icon: 'none'
          });
        }
      },
      fail: function(err) {
        console.error('天气请求失败:', err);
        wx.showToast({ 
          title: '网络错误，请重试',
          icon: 'none'
        });
      },
      complete: function() {
        wx.hideLoading();
      }
    });
  },

  // 刷新天气
  refreshWeather: function() {
    if (this.data.currentLatitude && this.data.currentLongitude) {
      this.getWeatherData(this.data.currentLatitude, this.data.currentLongitude);
    } else {
      this.getLocation();
    }
  },

  // 切换城市
  changeCity: function() {
    this.setData({
      showCityInput: true,
      manualCityInput: ''
    });
  },

  // 提交城市
  submitCity: function() {
    const city = this.data.manualCityInput.trim();
    if (!city) {
      wx.showToast({ title: '请输入城市名称', icon: 'none' });
      return;
    }

    const that = this;
    wx.showLoading({ title: '查询坐标中...' });

    // 使用高德地图获取城市坐标
    wx.request({
      url: 'https://restapi.amap.com/v3/geocode/geo',
      data: {
        key: 'e3728f3d140c952f7abf5e526803deae',
        address: city
      },
      success: function(res) {
        if (res.data.status === '1' && res.data.geocodes && res.data.geocodes.length > 0) {
          const [longitude, latitude] = res.data.geocodes[0].location.split(',');
          that.setData({
            showCityInput: false,
            manualCityInput: '',
            currentLatitude: parseFloat(latitude),
            currentLongitude: parseFloat(longitude)
          });
          that.getWeatherData(latitude, longitude);
        } else {
          wx.showToast({ title: '城市查询失败', icon: 'none' });
        }
      },
      fail: function() {
        wx.showToast({ title: '网络错误', icon: 'none' });
      },
      complete: function() {
        wx.hideLoading();
      }
    });
  },

  // 保留其他方法不变
  checkLoginStatus() {
    const app = getApp();
    if (!app.globalData.hasLogin) {
      app.checkLoginStatus();
      if (!app.globalData.hasLogin) {
        wx.redirectTo({ url: '/pages/login/login' });
      }
    }
  },

  handleBannerTap(e) {
    const banner = this.data.banners[e.currentTarget.dataset.index];
    if (banner.link) {
      wx.navigateTo({ url: banner.link });
    }
  },

  handleEntryTap(e) {
    wx.navigateTo({
      url: this.data.quickEntries[e.currentTarget.dataset.index].path
    });
  },

  inputCity: function(e) {
    this.setData({ manualCityInput: e.detail.value });
  },

  cancelCityInput: function() {
    this.setData({ showCityInput: false });
  },

  formatTime: function(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    return `${year}-${this.formatNumber(month)}-${this.formatNumber(day)} ${this.formatNumber(hour)}:${this.formatNumber(minute)}`;
  },

  formatNumber: function(n) {
    return n.toString().padStart(2, '0');
  },

  getWeatherIconCode: function(code) {
    return code || '100';
  }
});
