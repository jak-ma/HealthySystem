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
    // 健康资讯数据
    healthNews: [],
    // 天气相关数据
    cityName: '北京', // 默认城市
    detailedLocation: '', // 详细位置信息（街道/小区）
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
    // 先检查位置授权，而不是直接获取位置
    this.checkLocationAuth();
    // 获取健康资讯数据
    this.getHealthNews();
    
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
        // 获取详细位置信息
        that.getDetailedLocation(res.latitude, res.longitude);
        // 获取天气数据
        that.getWeatherData(res.latitude, res.longitude);
      },
      fail: function(err) {
        console.error('定位失败:', err);
        wx.hideLoading();
        
        // 检查失败原因
        if (err.errMsg.indexOf('auth deny') >= 0 || err.errMsg.indexOf('authorize') >= 0) {
          // 授权问题导致的失败
          wx.showModal({
            title: '位置授权',
            content: '获取位置失败，是否重新授权？',
            success: function(res) {
              if (res.confirm) {
                // 打开设置页面让用户重新授权
                wx.openSetting({
                  success: function(settingRes) {
                    if (settingRes.authSetting['scope.userLocation']) {
                      // 用户重新授权了，再次获取位置
                      that.getLocation();
                    } else {
                      // 用户仍然拒绝授权，使用默认位置
                      wx.showToast({
                        title: '未获得位置授权，使用默认位置',
                        icon: 'none',
                        duration: 2000
                      });
                      // 使用北京默认坐标
                      that.getWeatherData(39.90403, 116.407526);
                    }
                  }
                });
              } else {
                // 用户点击取消，使用默认位置
                wx.showToast({
                  title: '使用默认位置',
                  icon: 'none'
                });
                // 使用北京默认坐标
                that.getWeatherData(39.90403, 116.407526);
              }
            }
          });
        } else {
          // 其他原因导致的失败
          wx.showToast({
            title: '定位失败，使用默认位置',
            icon: 'none'
          });
          // 使用北京默认坐标
          that.getWeatherData(39.90403, 116.407526);
        }
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

  // 刷新天气 - 始终获取当前位置
  refreshWeather: function() {
    // 直接调用获取位置方法，不再使用缓存的位置信息
    this.getLocation();
  },

  // 检查位置授权状态
  checkLocationAuth: function() {
    const that = this;
    wx.getSetting({
      success: function(res) {
        // 如果未授权位置信息
        if (!res.authSetting['scope.userLocation']) {
          wx.showModal({
            title: '需要位置授权',
            content: '为了提供准确的天气信息，需要获取您的位置信息',
            success: function(modalRes) {
              if (modalRes.confirm) {
                // 用户点击确定，打开授权设置页面
                wx.openSetting({
                  success: function(settingRes) {
                    if (settingRes.authSetting['scope.userLocation']) {
                      // 获取到授权，开始获取位置
                      that.getLocation();
                    } else {
                      // 用户拒绝授权，使用默认位置
                      wx.showToast({
                        title: '未获得位置授权，使用默认位置',
                        icon: 'none'
                      });
                      // 使用北京默认坐标
                      that.getWeatherData(39.90403, 116.407526);
                    }
                  }
                });
              } else {
                // 用户点击取消，使用默认位置
                wx.showToast({
                  title: '未获得位置授权，使用默认位置',
                  icon: 'none'
                });
                // 使用北京默认坐标
                that.getWeatherData(39.90403, 116.407526);
              }
            }
          });
        } else {
          // 已授权，直接获取位置
          that.getLocation();
        }
      }
    });
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
          that.getDetailedLocation(latitude, longitude);
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
  
  // 获取健康资讯数据
  getHealthNews: function() {
    const that = this;
    wx.cloud.callFunction({
      name: 'getHealthNews',
      success: function(res) {
        console.log('获取健康资讯成功:', res);
        if (res.result && res.result.code === 0) {
          that.setData({
            healthNews: res.result.data
          });
        } else {
          console.error('获取健康资讯失败:', res);
          wx.showToast({
            title: '获取健康资讯失败',
            icon: 'none'
          });
        }
      },
      fail: function(err) {
        console.error('调用云函数失败:', err);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      }
    });
  },
  
  // 处理健康资讯点击事件
  handleNewsItemTap: function(e) {
    const id = e.currentTarget.dataset.id;
    const newsItem = this.data.healthNews.find(item => item.id === id);
    
    if (newsItem) {
      // 这里可以跳转到详情页，或者显示一个模态框
      wx.showModal({
        title: newsItem.title,
        content: newsItem.content,
        showCancel: false,
        confirmText: '我知道了'
      });
      
      // 如果有详情页，可以使用以下代码跳转
      // wx.navigateTo({
      //   url: `/pages/news/detail?id=${id}`
      // });
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
  },
  
  // 获取详细位置信息
  getDetailedLocation: function(latitude, longitude) {
    const that = this;
    
    // 使用高德地图逆地理编码API获取详细位置信息
    wx.request({
      url: 'https://restapi.amap.com/v3/geocode/regeo',
      data: {
        key: 'e3728f3d140c952f7abf5e526803deae',
        location: `${longitude},${latitude}`,
        extensions: 'base',
        poitype: '',
        radius: 1000,
        roadlevel: 0
      },
      success: function(res) {
        console.log('逆地理编码结果:', res);
        if (res.data.status === '1' && res.data.regeocode) {
          const addressComponent = res.data.regeocode.addressComponent;
          const township = addressComponent.township || '';
          const streetNumber = addressComponent.streetNumber || {};
          const street = streetNumber.street || '';
          const number = streetNumber.number || '';
          
          // 组合详细地址信息
          let detailedLocation = '';
          
          if (street) {
            detailedLocation = street + (number ? number : '');
          } else if (township) {
            detailedLocation = township;
          }
          
          // 更新详细位置信息
          that.setData({
            detailedLocation: detailedLocation
          });
        }
      },
      fail: function(err) {
        console.error('获取详细位置信息失败:', err);
      }
    });
  }
});
