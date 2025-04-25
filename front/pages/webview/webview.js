// webview.js
Page({
  data: {
    url: '',
    title: '健康资讯详情',
    error: false,
    errorMsg: ''
  },
  
  onLoad: function(options) {
    if (options.url) {
      const decodedUrl = decodeURIComponent(options.url);
      
      // 检查URL是否包含未配置的域名
      if (decodedUrl.includes('163.com')) {
        this.setData({
          error: true,
          errorMsg: '无法打开该页面，该域名未在小程序管理后台配置。请在小程序管理后台的「开发」-「开发设置」-「业务域名」中添加163.com域名。'
        });
        console.error('invokeAppService error', {url: "https://www.163.com", fullUrl: decodedUrl});
      } else {
        this.setData({
          url: decodedUrl
        });
      }
    }
    
    if (options.title) {
      this.setData({
        title: decodeURIComponent(options.title)
      });
      
      // 设置导航栏标题
      wx.setNavigationBarTitle({
        title: this.data.title
      });
    }
  },
  
  // 返回首页
  backToHome: function() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  }
});