// pages/diet/diet.js
// diet.js - 饮食专区页面逻辑
Page({
    /*********************************
     * 页面数据
     *********************************/
    data: {
        envId: 'cloud1-7gomrs3ufe613311', // 云环境ID

        //饮食专区功能入口配置
        dietFunctions: [
            { id: 'recipes', name: '营养食谱', icon: '/icons/diet/recipes.png' },
            { id: 'reminder', name: '用餐提醒', icon: '/icons/diet/reminder.png' },
            { id: 'log', name: '饮食日志', icon: '/icons/diet/log.png' }
        ],

        //用餐提醒模块提醒数据
        mealReminders: [ //初始数据
            { _id: 'breakfast', type: '早餐', time: '07:00', enabled: true },
            { _id: 'lunch', type: '午餐', time: '12:00', enabled: true },
            { _id: 'dinner', type: '晚餐', time: '18:00', enabled: true }
        ],
        editingReminderId: null,//当前编辑的提醒id
        showAddModal: false,//打开弹窗状态

        //饮食日志数据部分
        meals: ['早餐', '午餐', '晚餐'], // 餐次类型
        //各部分图标
        mealIcons: [
            '/images/diet_icon/icon_breakfast.png',
            '/images/diet_icon/icon_lunch.png',
            '/images/diet_icon/icon_dinner.png'
        ],
        hasUploaded: {}, // 饮食记录，存储各餐次最新上传时间
        loading: true, // 加载状态
        lastRefreshDate: null, // 记录上次刷新日期
        foodInfo: null,      // 存储识别结果（食物名称、热量等）
        tempFileURL: ''      // 临时存储图片路径用于页面显示

    },
    // 添加导航到饮食日志历史记录页面的方法
    navigateToDietLog: function () {
        wx.navigateTo({
            url: '/pages/diet-history/diet-history'
        });
    },

    /*********************************
     * 用餐提醒部分
     *********************************/

    // 新增用餐提醒入口
    // 在 diet.js 中替换原有方法
    addNewReminder() {
        wx.showActionSheet({
            itemList: this.data.meals,
            success: async (res) => {
                const mealType = this.data.meals[res.tapIndex];

                // 统一使用 picker 组件方案
                this.setData({
                    showTimePicker: true,
                    currentMealType: mealType,
                    currentTime: this.getDefaultTime(mealType)
                });

                // 或者使用 showPicker API（需基础库2.21.0+）
                /*
                try {
                  const time = await this.showSystemTimePicker(mealType);
                  this.setData({
                    'newReminder.type': mealType,
                    'newReminder.time': time
                  });
                  this.confirmAddReminder();
                } catch (err) {
                  console.log('用户取消选择');
                }
                */
            },
            fail: () => wx.showToast({ title: '取消选择', icon: 'none' })
        });
    },

    // 新增系统时间选择方法
    showSystemTimePicker(mealType) {
        return new Promise((resolve, reject) => {
            wx.showPicker({
                type: 'time',
                defaultTime: this.getDefaultTime(mealType),
                success: ({ hour, minute }) => {
                    resolve(`${hour}:${minute < 10 ? '0' + minute : minute}`);
                },
                fail: reject
            });
        });
    },

    handleTimeConfirm(e) {
        this.setData({ currentTime: e.detail.value });
    },

    async confirmTimeSelection() {
        if (!this.data.editingReminderId) {
            return this.confirmAddReminder(); // 原有添加逻辑
        }

        // 以下是长按修改的逻辑
        const { editingReminderId, currentTime } = this.data;

        try {
            // 更新云数据库
            await wx.cloud.callFunction({
                name: 'mealReminder',
                data: {
                    action: 'updateReminder',
                    id: editingReminderId,
                    newTime: currentTime,
                    envId: this.data.envId
                }
            });

            // 更新本地数据
            const updated = this.data.mealReminders.map(item =>
                item._id === editingReminderId ? { ...item, time: currentTime } : item
            );

            this.setData({
                mealReminders: updated,
                showTimePicker: false,
                editingReminderId: null
            });

            wx.showToast({ title: '修改成功' });

        } catch (error) {
            wx.showToast({ title: '修改失败', icon: 'none' });
        }
    },

    // 新增长按事件处理
    // 修正后的长按处理方法
    handleLongPress(e) {
        const { id } = e.currentTarget.dataset || {};
        if (!id) return;

        const target = this.data.mealReminders.find(item => item._id === id);
        if (!target) return;

        this.setData({
            showTimePicker: true,
            editingReminderId: id,  // 确保是有效值
            currentTime: target.time
        });
    },

    // 修改原时间确认方法
    async confirmTimeSelection() {
        const { editingReminderId, currentTime, mealReminders } = this.data

        // 更新本地数据
        const updated = mealReminders.map(item =>
            item._id === editingReminderId ? { ...item, time: currentTime } : item
        )

        try {
            // 云数据库更新
            await wx.cloud.callFunction({
                name: 'mealReminder',
                data: {
                    action: 'updateReminder',
                    id: editingReminderId,
                    newTime: currentTime,
                    envId: this.data.envId
                }
            })

            // 更新本地状态
            this.setData({
                mealReminders: updated,
                showTimePicker: false,
                editingReminderId: null
            })

            // 本地缓存备份
            wx.setStorageSync('lastMealReminders', updated)
        } catch (e) {
            wx.showToast({ title: '更新失败', icon: 'none' })
        }
    },
    //新增提醒操作
    async confirmAddReminder() {
        const { time, type } = this.data.newReminder;

        if (!time || !type) {
            wx.hideLoading();  // 先隐藏再抛出错误
            throw new Error('时间和类型不能为空');
        }

        try {
            const { result } = await wx.cloud.callFunction({
                name: 'mealReminder',
                data: {
                    action: 'addReminder',
                    type,
                    time,
                    envId: this.data.envId
                }
            });

            this.setData({
                mealReminders: [...this.data.mealReminders, {
                    _id: result._id,
                    type,
                    time,
                    enabled: true
                }],
                newReminder: { time: '', type: '' }
            });

            wx.hideLoading();  // 成功时隐藏
            wx.showToast({ title: '添加成功' });
            return result;

        } catch (e) {
            wx.hideLoading();  // 失败时隐藏
            throw e;
        }
    },


    // 时间选择处理
    handleTimeChange(e) {
        this.setData({
            'newReminder.time': e.detail.value,
            showTimePicker: false
        })
        this.confirmAddReminder()          // 选好时间后立即保存
    },

    // 获取默认时间
    getDefaultTime(mealType) {
        const defaults = { '早餐': '07:00', '午餐': '12:00', '晚餐': '18:00' }
        return defaults[mealType] || '12:00'
    },

    //点击遮罩可以关闭弹窗
    hideTimePicker() {
        this.setData({ showTimePicker: false })
    },

    //实现开关切换
    async toggleReminder(e) {
        const _id = e.currentTarget.dataset.id;
        const updated = this.data.mealReminders.map(item =>
            item._id === _id ? { ...item, enabled: !item.enabled } : item
        );

        this.setData({ mealReminders: updated });
        wx.setStorageSync('mealReminders', this.data.mealReminders); // 新增

        // 可选：同步到云端
        await wx.cloud.callFunction({
            name: 'mealReminder',
            data: { action: 'toggleReminder', id: _id, enabled: !item.enabled }
        });
    },// 修改后的开关切换方法
    async toggleReminder(e) {
        const _id = e.currentTarget.dataset.id; // 获取当前提醒ID

        // 1. 创建新数组避免直接修改原数据
        const updated = this.data.mealReminders.map(item => {
            if (item._id === _id) {
                return { ...item, enabled: !item.enabled }; // 只修改当前项
            }
            return item;
        });

        // 2. 更新前端显示
        this.setData({ mealReminders: updated });

        // 3. 保存到本地缓存
        wx.setStorageSync('mealReminders', updated);

        // 4. 同步到云端（可选）
        try {
            await wx.cloud.callFunction({
                name: 'mealReminder',
                data: {
                    action: 'toggleReminder',
                    id: _id,
                    enabled: updated.find(item => item._id === _id).enabled
                }
            });
        } catch (e) {
            wx.showToast({ title: '网络异常，已本地保存', icon: 'none' });
        }
    },

    // 打开弹窗
    showAddModal() {
        this.setData({
            showAddModal: true,
            newReminder: { time: '', type: '' }
        });
    },


    //加载提醒数据
    async loadReminders() {
        wx.showLoading({ title: '加载中...' });

        try {
            const { result } = await wx.cloud.callFunction({
                name: 'mealReminder',
                data: { action: 'getReminders' }
            });

            // 检查是否已有数据，避免重复初始化
            if (!result.data || result.data.length === 0) {
                await this.createDefaultReminders();
                wx.setStorageSync('mealReminders', this.data.mealReminders);
            } else {
                // --- 新增排序逻辑开始 ---
                const sortedReminders = result.data.sort((a, b) => {
                    // 定义固定排序规则：早餐(1) -> 午餐(2) -> 晚餐(3)
                    const orderMap = { '早餐': 1, '午餐': 2, '晚餐': 3 };
                    return orderMap[a.type] - orderMap[b.type];
                });
                // --- 新增排序逻辑结束 ---

                // 使用排序后的数据
                this.setData({ mealReminders: sortedReminders });
                wx.setStorageSync('mealReminders', sortedReminders);
            }
        } catch (e) {
            console.error('加载失败:', e);
            wx.showToast({ title: '加载失败', icon: 'none' });
        } finally {
            wx.hideLoading();
        }
    },

    async createDefaultReminders() {
        const defaults = [
            { type: '早餐', time: '07:00' },
            { type: '午餐', time: '12:00' },
            { type: '晚餐', time: '18:00' }
        ];

        try {
            // ✅ 先检查是否已存在默认数据
            const { result } = await wx.cloud.callFunction({
                name: 'mealReminder',
                data: { action: 'getReminders' }
            });

            if (result.data && result.data.length > 0) {
                console.log('已有默认数据，跳过初始化');
                return;
            }

            // ✅ 批量创建（确保只执行一次）
            const tasks = defaults.map(item =>
                wx.cloud.callFunction({
                    name: 'mealReminder',
                    data: {
                        action: 'addReminder',
                        ...item
                    }
                })
            );

            const results = await Promise.all(tasks);
            this.setData({
                mealReminders: results.map((res, i) => ({
                    _id: res.result._id,
                    type: defaults[i].type,
                    time: defaults[i].time,
                    enabled: true
                }))
            });
        } catch (e) {
            wx.showToast({ title: '初始化失败', icon: 'none' });
        }
    },

    async updateReminderTime(reminderId, newTime) {
        wx.showLoading({ title: '保存中...' })

        try {
            // 更新云端
            await wx.cloud.callFunction({
                name: 'mealReminder',
                data: {
                    action: 'updateReminder',
                    id: reminderId,
                    newTime
                }
            })

            // 更新本地
            this.setData({
                mealReminders: this.data.mealReminders.map(item =>
                    item._id === reminderId ? { ...item, time: newTime } : item
                )
            });
            wx.setStorageSync('mealReminders', this.data.mealReminders); // 新增
        } catch (e) {
            wx.showToast({ title: '保存失败', icon: 'none' })
        } finally {
            wx.hideLoading()
        }
    },


    /*********************************
     * 生命周期
     *********************************/
    onLoad() {
        // 优先显示本地缓存
        const cached = wx.getStorageSync('mealReminders')
        if (cached) this.setData({ mealReminders: cached })

        // 实时更新云端数据
        this.loadReminders()
    },


    /**
     * 生命周期函数
     */
    onShow() {
        // 安全调用检查，用户变更检查，当用户变更时重新加载数据
        if (typeof this.checkUserChanged === 'function' && this.checkUserChanged()) {
            this.loadReminders(),
                this.loadDietLog()
        }

        // 更新最后登录用户
        if (this.data.userInfo) {
            wx.setStorageSync('lastLoginUser', {
                openid: this.data.userInfo.openid,
                nickname: this.data.userInfo.nickName
            })
        }
    },

    /**
     * 检测用户信息变更
     */
    checkUserChanged() {
        const currentUser = wx.getStorageSync('lastLoginUser')
        const { userInfo } = this.data

        // 首次登录或用户信息变化时返回true
        return !currentUser || (userInfo && currentUser.openid !== userInfo.openid)
    },


    /*********************************
     * 通用工具
     *********************************/
    /**
     * 获取当天日期的字符串，返回标准化字符串“YYYY-MM-DD”
     */
    getTodayDate() {
        const now = new Date()
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    },

    /**
   * 标准化时间格式（HH:MM）
   * @param {Date|string} date 接受一个时间值（可以是 Date 对象、时间戳或日期字符串）
   * @returns {string} 格式化的时间字符串，例: "07:30"
   */
    formatTime(date) {
        const d = date instanceof Date ? date : new Date(date);
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    },
    /*********************************
     * 饮食日志：加载
     *********************************/
    /**
     * 从云端加载饮食日志
     */
    async loadDietLog() {
        try {
            //调用云函数，result存储云函数返回的结果
            const { result } = await wx.cloud.callFunction({
                name: 'dietLog',//指调用的云函数
                //执行getRecords操作
                data: {
                    action: 'getRecords', date: this.getTodayDate() //一个data对象 包含两个参数，第一个函数，指定函数的操作类型，第二个参数，查询日期，为字符串类型
                }
            })
            this.setData({
                hasUploaded: result.logs || {},
            })
        } catch (e) {
            console.error('加载饮食记录失败', e)
            wx.showToast({ title: '加载记录失败', icon: 'none' })
        }
    },

    /*********************************
     * 上传图片 & 保存记录
     *********************************/
    uploadMeal(e) {
        const mealType = e.currentTarget.dataset.type
        this.chooseImage(mealType)
    },

    chooseImage(mealType) {
        wx.showActionSheet({
            itemList: ['拍照', '从相册选择'],
            success: res => this.chooseImageWithSource(mealType, res.tapIndex === 0 ? ['camera'] : ['album']),
            fail: () => wx.showToast({ title: '取消选择', icon: 'none' })
        })
    },

    chooseImageWithSource(mealType, sourceType) {
        wx.chooseMedia({
            count: 1,
            sizeType: ['compressed'],
            sourceType,
            camera: 'back',
            success: async res => {
                let filePath = Array.isArray(res.tempFiles) ? res.tempFiles[0].tempFilePath : res.tempFilePaths?.[0]
                if (!filePath) return wx.showToast({ title: '未获取到图片路径', icon: 'none' })
                try {
                    const info = await wx.getFileInfo({ filePath })
                    if (info.size > 5 * 1024 * 1024) throw new Error('图片大小超过5MB')
                    if (sourceType[0] === 'camera') filePath = await this.fixImageOrientation(filePath)
                    await this.uploadImage(filePath, mealType)
                } catch (err) {
                    console.error('图片处理失败', err)
                    wx.showToast({ title: err.message || '图片处理失败', icon: 'none' })
                    wx.getFileSystemManager().unlink({ filePath })
                }
            },
            fail: () => wx.showToast({ title: '取消选择', icon: 'none' })
        })
    },

    async fixImageOrientation(filePath) {
        return new Promise(resolve => {
            if (wx.getSystemSetting().platform === 'android') return resolve(filePath)
            wx.getImageInfo({
                src: filePath,
                success: async info => {
                    if (info.orientation && info.orientation !== 'up') {
                        try { filePath = await this.rotateImage(filePath, info.orientation) } catch { /* 保留原图 */ }
                    }
                    resolve(filePath)
                },
                fail: () => resolve(filePath)
            })
        })
    },

    rotateImage(filePath, orientation) {
        return new Promise((resolve, reject) => {
            wx.createSelectorQuery().in(this).select('#imageCanvas').fields({ node: true }).exec(res => {
                const canvas = res[0].node
                const ctx = canvas.getContext('2d')
                const img = canvas.createImage()
                img.onload = () => {
                    const { width, height } = img
                    const deg = { right: 90, down: 180, left: 270, up: 0 }[orientation] || 0
                    const rad = deg * Math.PI / 180
                    const newW = deg % 180 === 0 ? width : height
                    const newH = deg % 180 === 0 ? height : width
                    canvas.width = newW
                    canvas.height = newH
                    ctx.save(); ctx.translate(newW / 2, newH / 2); ctx.rotate(rad)
                    ctx.drawImage(img, -width / 2, -height / 2, width, height)
                    ctx.restore()
                    canvas.toTempFilePath({ fileType: 'jpg', quality: 0.9, success: ({ tempFilePath }) => resolve(tempFilePath), fail: reject })
                }
                img.onerror = reject; img.src = filePath
            })
        })
    },

    /**
     * 上传图片操作，进行云存储并写入饮食日志数据库，自动识别食物名称
     * @param {*} filePath 图片的临时路径
     * @param {*} mealType 餐次类型
     */
    async uploadImage(filePath, mealType) {
        wx.showLoading({ title: '上传中...' });//显示加载状态

        try {
            // 1. 上传到云存储
            const cloudPath = `diet-log/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;//指定云存储路径，使用时间戳构建路径
            //调用API进行上传，fileID保存云端文件ID
            const { fileID } = await wx.cloud.uploadFile({
                cloudPath,
                filePath,
                config: { env: this.data.envId }
            });

            //调用云函数识别食物种类
            const recognitionRes = await wx.cloud.callFunction({
                name: 'foodRecognition',              // 云函数名称
                data: { fileID: fileID }    // 传入云端图片ID
            });

            //处理识别结果
            wx.hideLoading()
            if (recognitionRes.result.success) {
                this.setData({
                    foodInfo: recognitionRes.result,//更新识别结果
                    tempFileURL: filePath//图片的临时路径，用于展示
                })
            } else {
                wx.showToast({ title: '识别失败', icon: 'none' })
            }
            //调用formatTime记录标准化时间，生成格式化时间字符串，例如“14:30”，newDate()会返回一个时间对象
            const currentTime = this.formatTime(new Date()); // 调用格式化方法

            //使用刚刚获得的时间字符串更新前端显示
            this.setData({
                [`hasUploaded.${mealType}`]: currentTime // 存储前端显示格式化后的时间
            });

            //调用方法保存到数据库
            await this.saveDietRecord(mealType, fileID, recognitionRes);

        } catch (err) {//捕获异常
            console.error('上传失败:', err);
            wx.showToast({ title: '上传失败', icon: 'none' });
        } finally {
            wx.hideLoading();
        }
    },

    /**
     * 向数据库中diet_logs表中增加记录
     * @param {*} mealType //餐次类型
     * @param {*} fileID //上传文件的云存储地址
     * @param {*} recognitionRes  //图片识别的结果
     */
    async saveDietRecord(mealType, fileID, recognitionRes) {
        //用于构建数据库记录内容
        const record = {
            date: this.getTodayDate(), //自动生成当天的格式化时间字符串
            mealType, //餐次类型
            foodName: recognitionRes.result.foodName,//存储食物名称
            calorie: recognitionRes.result.calorie,//存储单位热量
            imageUrl: fileID, //上传的文件存储地址
            status: 'uploaded'//固定值
        }
        //调用云函数执行数据库插入，result为云函数返回值
        const { result } = await wx.cloud.callFunction(
            {
                name: 'dietLog',//云函数名称
                data: {
                    action: 'addRecord',//指定操作类型
                    ...record//展开全部参数作为参数
                }
            })
        return { ...result }//合并云函数返回值和该餐食的卡路里值作为返回值
    },

    /**
     * 更新日志状态
     * @param {*} mealType 餐次类别
     */
    updateUploadStatus(mealType) {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
        this.setData({ [`hasUploaded.${mealType}`]: time })
    },



    /*********************************
     * 推荐食谱
     *********************************/
    async loadRecommendedRecipes() {
        try {
            wx.showLoading({ title: '加载中', mask: true })
            const profile = await this.getHealthProfile()
            const { result } = await wx.cloud.callFunction({ name: 'getRecommendedRecipes', data: { conditions: profile.conditions || [] } })
            this.setData({ recommendedRecipes: result.data, loading: false })
        } catch (e) {
            console.error('加载食谱失败', e)
            wx.showToast({ title: '加载失败', icon: 'none' })
        } finally { wx.hideLoading() }
    },

    getHealthProfile() {
        return new Promise(resolve => {
            wx.cloud.callFunction({ name: 'getHealthProfile', success: r => resolve(r.result), fail: () => resolve({}) })
        })
    },

    checkReminderStatus() { this.setData({ reminderStatus: wx.getStorageSync('mealReminder') || {} }) },
    showHelp() { this.setData({ showHelpModal: true }) },
    hideHelp() { this.setData({ showHelpModal: false }) }
})
