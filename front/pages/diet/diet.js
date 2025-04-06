// diet页面逻辑
Page({
  data: {
    foodList: []
  },

  onLoad() {
    // 初始化饮食数据
  },

  addFood() {
    wx.navigateTo({
      url: '/pages/diet/add/add'
    })
  }
})