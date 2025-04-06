// index.js
Page({
    data: {
      loading: true,
      banners: [
        { img: '/images/banner1.jpg', link: '/pages/news/detail?id=1' },
        { img: '/images/banner2.jpg', link: '/pages/news/detail?id=2' },
        { img: '/images/banner3.jpg', link: '/pages/news/detail?id=3' }
      ],
      quickEntries: [
        { icon: '/images/dataupload.png', text: '数据上传', path: '/pages/register/personal' },
        { icon: '/images/bodycheck.png', text: '体征检测', path: '/pages/register/group' },
        { icon: '/images/healthreport.png', text: '健康报告', path: '/pages/project/join' },
        { icon: '/images/medication.png', text: '用药提醒', path: '/pages/group/join' },
        { icon: '/images/nutritious.png', text: '营养食谱', path: '/pages/service/query' },
        { icon: '/images/food.png', text: '用餐提醒', path: '/pages/service/self' },
        { icon: '/images/eatlog.png', text: '饮食日志', path: '/pages/help/faq' },
        { icon: '/images/minecentre.png', text: '个人中心', path: '/pages/help/index' }
      ]
    },
    
    onLoad() {
      // 检查登录状态
      this.checkLoginStatus();
      
      // 模拟数据加载
      setTimeout(() => {
        this.setData({ loading: false })
      }, 1500)
    },
    
    onShow() {
      // 每次页面显示时检查登录状态
      this.checkLoginStatus();
    },
    
    // 检查登录状态
    checkLoginStatus() {
      const app = getApp();
      
      // 使用app.js中的登录状态
      if (!app.globalData.hasLogin) {
        // 尝试从本地存储恢复登录状态
        app.checkLoginStatus();
        
        // 如果仍未登录，则跳转到登录页
        if (!app.globalData.hasLogin) {
          wx.redirectTo({
            url: '/pages/login/login'
          });
        }
      }
    },
  
    // 轮播图点击事件
    handleBannerTap(e) {
      const { link } = this.data.banners[e.currentTarget.dataset.index]
      wx.navigateTo({
        url: link
      })
    },
  
    // 快捷入口点击事件
    handleEntryTap(e) {
      const { path } = this.data.quickEntries[e.currentTarget.dataset.index]
      wx.navigateTo({
        url: path
      })
    }
  })