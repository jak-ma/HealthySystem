// weather.js
Page({
  data: {
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
    apiKey: 'SAXdsW40FvsGmeLpd' // 心知天气API密钥，需要替换为实际的API密钥
  },

  onLoad: function() {
    // 页面加载时获取天气数据
    this.getWeatherData();
  },

  // 获取天气数据
  getWeatherData: function() {
    const that = this;
    wx.showLoading({
      title: '获取天气中...',
    });

    // 调用心知天气API获取天气数据
    wx.request({
      url: `https://api.seniverse.com/v3/weather/now.json?key=${that.data.apiKey}&location=${that.data.cityName}&language=zh-Hans&unit=c`,
      success: function(res) {
        if (res.statusCode === 200 && res.data && res.data.results && res.data.results[0]) {
          const weatherData = res.data.results[0];
          const now = weatherData.now;
          
          // 更新天气数据
          that.setData({
            temperature: now.temperature,
            weatherDesc: now.text,
            weatherIconCode: that.getWeatherIconCode(now.code),
            humidity: now.humidity || '--',
            windDirection: now.wind_direction || '--',
            windScale: now.wind_scale || '--',
            updateTime: that.formatTime(new Date())
          });
        } else {
          wx.showToast({
            title: '获取天气失败',
            icon: 'none'
          });
        }
      },
      fail: function() {
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

  // 刷新天气数据
  refreshWeather: function() {
    this.getWeatherData();
  },

  // 切换城市
  changeCity: function() {
    this.setData({
      showCityInput: true,
      manualCityInput: ''
    });
  },

  // 输入城市名称
  inputCity: function(e) {
    this.setData({
      manualCityInput: e.detail.value
    });
  },

  // 取消城市输入
  cancelCityInput: function() {
    this.setData({
      showCityInput: false
    });
  },

  // 提交城市
  submitCity: function() {
    if (this.data.manualCityInput.trim() === '') {
      wx.showToast({
        title: '请输入城市名称',
        icon: 'none'
      });
      return;
    }

    this.setData({
      cityName: this.data.manualCityInput,
      showCityInput: false
    }, () => {
      this.getWeatherData();
    });
  },

  // 格式化时间
  formatTime: function(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();

    return `${year}-${this.formatNumber(month)}-${this.formatNumber(day)} ${this.formatNumber(hour)}:${this.formatNumber(minute)}`;
  },

  // 格式化数字
  formatNumber: function(n) {
    n = n.toString();
    return n[1] ? n : `0${n}`;
  },

  // 获取天气图标代码
  getWeatherIconCode: function(code) {
    // 这里可以根据心知天气的天气代码映射到自己的图标代码
    // 简单起见，这里直接返回心知天气的代码，实际使用时可能需要映射
    return code || '100';
  }
});