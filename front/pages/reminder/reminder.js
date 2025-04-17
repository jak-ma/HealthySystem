Page({
  data: {
      medecines: [],
      inputValue: '',
      inputTime: '00:00',
      inputNotes: '',
      showInputModal: false,
      inputModalTitle: '',
      inputModalPlaceholder: '',
      inputModalValue: '',
      currentEditId: null,
      currentEditType: null
  },

  onInput: function (e) {
      this.setData({
          inputValue: e.detail.value
      });
  },

  onTimeInput: function (e) {
      this.setData({
          inputTime: e.detail.value
      });
  },

  onNotesInput: function (e) {
      this.setData({
          inputNotes: e.detail.value
      });
  },

  addMedecineremind: function () {
      const { inputValue, inputTime, inputNotes } = this.data;
      if (inputValue.trim()!== '') {
          const timeParts = inputTime.split(':');
          const remindTimeInMinutes = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);
          const newData = {
              name: inputValue,
              time: inputTime,
              notes: inputNotes,
              completed: false,
              remindTimeInMinutes: remindTimeInMinutes
          };
          wx.cloud.database().collection('medecineremind').add({
              data: newData,
              success: res => {
                  this.fetchMedecines();
                  this.setData({
                      inputValue: '',
                      inputTime: '00:00',
                      inputNotes: ''
                  });
              },
              fail: err => {
                  console.error('添加药品提醒失败', err);
              }
          });
      }
  },

  deleteMedecineremind: function (e) {
      const medecine_id = e.currentTarget.dataset.todoid;
      wx.cloud.database().collection('medecineremind').doc(medecine_id).remove({
          success: res => {
              this.fetchMedecines();
          },
          fail: err => {
              console.error('删除药品提醒失败', err);
          }
      });
  },

  complete: function (e) {
      const medecine_id = e.currentTarget.dataset.todoid;
      const isCompleted = e.detail.value;
      wx.cloud.database().collection('medecineremind').doc(medecine_id).update({
          data: {
              completed: isCompleted
          },
          success: res => {
              this.fetchMedecines();
          },
          fail: err => {
              console.error('更新药品提醒状态失败', err);
          }
      });
  },

  calculateRemainTime: function (remindTimeInMinutes) {
      const currentTime = new Date();
      const currentTimeInMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
      const remainTime = remindTimeInMinutes - currentTimeInMinutes;
      return remainTime > 0? remainTime : 0;
  },

  editTime: function (e) {
      const medecineId = e.currentTarget.dataset.id;
      const medecine = this.data.medecines.find(m => m._id === medecineId);
      this.setData({
          showInputModal: true,
          inputModalTitle: '修改服药时间',
          inputModalPlaceholder: medecine.time,
          currentEditId: medecineId,
          currentEditType: 'time'
      });
  },

  editNotes: function (e) {
      const medecineId = e.currentTarget.dataset.id;
      const medecine = this.data.medecines.find(m => m._id === medecineId);
      this.setData({
          showInputModal: true,
          inputModalTitle: '修改注意事项',
          inputModalPlaceholder: medecine.notes,
          currentEditId: medecineId,
          currentEditType: 'notes'
      });
  },

  onInputModalInput: function (e) {
      this.setData({
          inputModalValue: e.detail.value
      });
  },

  confirmInputModal: function () {
      const { currentEditId, currentEditType, inputModalValue } = this.data;
      if (currentEditType === 'time') {
          const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
          if (timeRegex.test(inputModalValue)) {
              const timeParts = inputModalValue.split(':');
              const newRemindTimeInMinutes = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);
              wx.cloud.database().collection('medecineremind').doc(currentEditId).update({
                  data: {
                      time: inputModalValue,
                      remindTimeInMinutes: newRemindTimeInMinutes
                  },
                  success: res => {
                      this.fetchMedecines();
                      this.setData({
                          showInputModal: false,
                          inputModalValue: ''
                      });
                  },
                  fail: err => {
                      console.error('修改时间失败', err);
                      this.setData({
                          showInputModal: false,
                          inputModalValue: ''
                      });
                  }
              });
          } else {
              wx.showToast({
                  title: '请输入有效的时间格式（HH:MM）',
                  icon: 'none'
              });
          }
      } else if (currentEditType === 'notes') {
          if (inputModalValue.trim()!== '') {
              wx.cloud.database().collection('medecineremind').doc(currentEditId).update({
                  data: {
                      notes: inputModalValue
                  },
                  success: res => {
                      this.fetchMedecines();
                      this.setData({
                          showInputModal: false,
                          inputModalValue: ''
                      });
                  },
                  fail: err => {
                      console.error('修改注意事项失败', err);
                      this.setData({
                          showInputModal: false,
                          inputModalValue: ''
                      });
                  }
              });
          } else {
              wx.showToast({
                  title: '注意事项不能为空',
                  icon: 'none'
              });
          }
      }
  },

  hideInputModal: function () {
      this.setData({
          showInputModal: false,
          inputModalValue: ''
      });
  },

  preventBubble: function (e) {
      if (e && e.target && typeof e.stopPropagation === 'function') {
          e.stopPropagation();
      }
  },

  fetchMedecines: function () {
      wx.cloud.database().collection('medecineremind').get({
          success: res => {
              this.setData({
                  medecines: res.data
              });
              this.setupTimers();
          },
          fail: err => {
              console.error('获取药品提醒列表失败', err);
          }
      });
  },

  setupTimers: function () {
      const currentTime = new Date();
      const currentTimeInMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
      const { medecines } = this.data;
      medecines.forEach(medecine => {
          if (!medecine.completed) {
              // 清除之前的定时器
              if (medecine.earlyTimerId) clearTimeout(medecine.earlyTimerId);
              if (medecine.timerId) clearTimeout(medecine.timerId);
              if (medecine.overdueTimerId) clearTimeout(medecine.overdueTimerId);
              
              if (medecine.remindTimeInMinutes > currentTimeInMinutes) {
                  // 提前一小时提醒
                  const earlyRemindTime = medecine.remindTimeInMinutes - 60;
                  if (earlyRemindTime > currentTimeInMinutes) {
                      const earlyDiff = (earlyRemindTime - currentTimeInMinutes) * 60 * 1000;
                      const earlyTimerId = setTimeout(() => {
                          wx.vibrateShort();
                          wx.showToast({
                              title: `即将服用${medecine.name}`,
                              icon: 'none',
                              duration: 3000
                          });
                      }, earlyDiff);
                      medecine.earlyTimerId = earlyTimerId;
                  }
                  
                  // 准时提醒
                  const timeDiffInSeconds = (medecine.remindTimeInMinutes - currentTimeInMinutes) * 60 * 1000;
                  const timerId = setTimeout(() => {
                      wx.vibrateShort({
                          type: 'heavy'
                      });
                      wx.showModal({
                          title: '用药提醒',
                          content: `该服用${medecine.name}了，注意事项：${medecine.notes}`,
                          showCancel: false,
                          confirmText: '已服用',
                          success: (res) => {
                              if (res.confirm) {
                                  wx.cloud.database().collection('medecineremind').doc(medecine._id).update({
                                      data: {
                                          completed: true
                                      }
                                  });
                              }
                          }
                      });
                  }, timeDiffInSeconds);
                  medecine.timerId = timerId;
              } else {
                  // 超时未完成提醒
                  const overdueTimerId = setTimeout(() => {
                      wx.vibrateShort({
                          type: 'heavy'
                      });
                      wx.showModal({
                          title: '用药提醒',
                          content: `您还未服用${medecine.name}，请尽快服用！`,
                          showCancel: false,
                          success: (res) => {
                              if (res.confirm) {
                                  wx.cloud.database().collection('medecineremind').doc(medecine._id).update({
                                      data: {
                                          completed: true
                                      }
                                  });
                              }
                          }
                      });
                  }, 1000 * 60 * 60); // 1小时后提醒
                  medecine.overdueTimerId = overdueTimerId;
              }
          }
      });
      this.setData({
          medecines: medecines
      });
  },

  onLoad(options) {
      this.fetchMedecines();
  },

  onShow() {
      this.setupTimers();
  },

  onHide() {
      const { medecines } = this.data;
      medecines.forEach(medecine => {
          if (medecine.timerId) {
              clearTimeout(medecine.timerId);
          }
      });
  },

  onUnload() {
      const { medecines } = this.data;
      medecines.forEach(medecine => {
          if (medecine.timerId) {
              clearTimeout(medecine.timerId);
          }
      });
  }
});