// diet-history.js
Page({

    data: {
        currentDate: '',       // 当前日期(YYYY-MM-DD)
        selectedDate: '',      // 选择的日期
        dietRecords: [],       // 饮食记录数组
        loading: false         // 加载状态
    },

    /**
     * 生命周期
     */
    onLoad() {
        // 初始化日期
        const today = this.formatDate(new Date());//格式化日期
        this.setData({
            currentDate: today,
            selectedDate: today//默认使用当天日期
        });
        // 加载当日数据
        this.loadDietRecords(today);
        
    },

    // 日期选择变化
    onDateChange(e) {
        const selectedDate = e.detail.value;//获取用户选择的日期
        this.setData({ selectedDate });//更新页面数据
        this.loadDietRecords(selectedDate);//加载新数据
    },

    /**
     * 加载历史记录数据
     * @param {*} date 日期信息
     */
    async loadDietRecords(date) {
        // 在loadDietRecords方法开头添加
        this.setData({ loading: true });//加载状态控制

        try {
            //调用云函数
            const res = await wx.cloud.callFunction({
                name: 'getDietHistory',
                data: {
                    date,//当前查询日期
                }
            });
            // 确保dietRecords数组被正确更新
            this.setData({
                dietRecords: res.result.data || [],//空数据保护
                loading: false
                // 在loadDietRecords的success回调中添加
            });
            // 确保dietRecords数组被正确更新
            
        } catch (err) {
            console.error('加载失败:', err);
            wx.showToast({ title: '加载失败', icon: 'none' });
            this.setData({ loading: false });
        }

    },

    // 图片预览
    previewImage(e) {
        const url = e.currentTarget.dataset.url;
        wx.previewImage({
            current: url,
            urls: this.data.dietRecords.map(item => item.imageUrl)
        });
    },

    // 跳转到记录页
    jumpToRecord() {
        wx.switchTab({ url: '/pages/diet/diet' });
    },

    // 辅助函数：格式化日期
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },


    
});