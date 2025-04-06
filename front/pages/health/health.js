// health页面逻辑
Page({
  data: {
    // 折叠面板状态
    expanded: {
      upload: true,     // 数据上传模块默认展开
      monitor: false,   // 体征监测模块默认折叠
      history: false    // 历史记录模块默认折叠
    },
    currentVital: 'heartRate', // 当前选中的体征类型
    vitalData: {
      value: '75',
      unit: '次/分',
      statusText: '正常',
      statusClass: 'status-normal'
    },
    vitalHistory: [
      { time: '今天 08:30', value: '75', statusText: '正常', statusClass: 'status-normal' },
      { time: '昨天 20:15', value: '82', statusText: '正常', statusClass: 'status-normal' },
      { time: '昨天 12:00', value: '88', statusText: '偏高', statusClass: 'status-warning' }
    ],
    // 各项体征的参考范围
    vitalRanges: {
      heartRate: { min: 60, max: 100, unit: '次/分', name: '心率' },
      bloodPressure: { min: 90, max: 140, unit: 'mmHg', name: '血压' },
      bloodSugar: { min: 3.9, max: 6.1, unit: 'mmol/L', name: '血糖' },
      oxygen: { min: 95, max: 100, unit: '%', name: '血氧' }
    }
  },

  onLoad() {
    // 页面加载时初始化图表
    this.initChart();
  },

  onReady() {
    // 确保组件已完全渲染
    setTimeout(() => {
      this.updateChart();
    }, 300);
  },
  
  // 切换面板展开/折叠状态
  togglePanel(e) {
    const type = e.currentTarget.dataset.type;
    const expandedKey = `expanded.${type}`;
    const currentValue = this.data.expanded[type];
    
    // 切换状态
    this.setData({
      [expandedKey]: !currentValue
    });
    
    // 如果是展开体征监测面板，更新图表
    if (type === 'monitor' && !currentValue) {
      setTimeout(() => {
        this.updateChart();
      }, 300);
    }
    
    // 提供触觉反馈
    wx.vibrateShort({
      type: 'medium'
    });
  },

  // 切换体征类型
  switchVital(e) {
    const type = e.currentTarget.dataset.type;
    if (type === this.data.currentVital) return;
    
    // 更新当前选中的体征类型
    this.setData({ currentVital: type });
    
    // 根据类型更新数据和图表
    this.updateVitalData(type);
    this.updateChart();
  },

  // 更新体征数据
  updateVitalData(type) {
    // 模拟数据 - 实际应用中应从服务器或本地存储获取
    const mockData = {
      heartRate: { value: '75', history: [
        { time: '今天 08:30', value: '75', statusText: '正常', statusClass: 'status-normal' },
        { time: '昨天 20:15', value: '82', statusText: '正常', statusClass: 'status-normal' },
        { time: '昨天 12:00', value: '88', statusText: '偏高', statusClass: 'status-warning' }
      ]},
      bloodPressure: { value: '125/85', history: [
        { time: '今天 09:00', value: '125/85', statusText: '正常', statusClass: 'status-normal' },
        { time: '昨天 19:30', value: '135/90', statusText: '偏高', statusClass: 'status-warning' },
        { time: '前天 08:45', value: '145/95', statusText: '高血压', statusClass: 'status-alert' }
      ]},
      bloodSugar: { value: '5.6', history: [
        { time: '今天 07:15', value: '5.6', statusText: '正常', statusClass: 'status-normal' },
        { time: '昨天 19:00', value: '6.3', statusText: '偏高', statusClass: 'status-warning' },
        { time: '昨天 07:30', value: '5.8', statusText: '正常', statusClass: 'status-normal' }
      ]},
      oxygen: { value: '98', history: [
        { time: '今天 10:00', value: '98', statusText: '正常', statusClass: 'status-normal' },
        { time: '昨天 22:30', value: '97', statusText: '正常', statusClass: 'status-normal' },
        { time: '昨天 15:45', value: '96', statusText: '正常', statusClass: 'status-normal' }
      ]}
    };
    
    // 获取当前体征的参考范围
    const range = this.data.vitalRanges[type];
    
    // 更新数据
    this.setData({
      'vitalData.value': mockData[type].value,
      'vitalData.unit': range.unit,
      'vitalData.statusText': this.getStatusText(mockData[type].value, type),
      'vitalData.statusClass': this.getStatusClass(mockData[type].value, type),
      vitalHistory: mockData[type].history
    });
  },

  // 获取状态文本
  getStatusText(value, type) {
    // 特殊处理血压
    if (type === 'bloodPressure') {
      const systolic = parseInt(value.split('/')[0]);
      if (systolic >= 140) return '高血压';
      if (systolic >= 120) return '偏高';
      if (systolic < 90) return '偏低';
      return '正常';
    }
    
    // 其他体征
    const range = this.data.vitalRanges[type];
    const numValue = parseFloat(value);
    
    if (numValue > range.max) return '偏高';
    if (numValue < range.min) return '偏低';
    return '正常';
  },

  // 获取状态样式类
  getStatusClass(value, type) {
    // 特殊处理血压
    if (type === 'bloodPressure') {
      const systolic = parseInt(value.split('/')[0]);
      if (systolic >= 140) return 'status-alert';
      if (systolic >= 120) return 'status-warning';
      if (systolic < 90) return 'status-warning';
      return 'status-normal';
    }
    
    // 其他体征
    const range = this.data.vitalRanges[type];
    const numValue = parseFloat(value);
    
    if (numValue > range.max) return 'status-warning';
    if (numValue < range.min) return 'status-warning';
    if (numValue > range.max * 1.2 || numValue < range.min * 0.8) return 'status-alert';
    return 'status-normal';
  },

  // 初始化图表
  initChart() {
    // 创建画布上下文
    this.ctx = wx.createCanvasContext('vitalChart');
  },

  // 更新图表
  updateChart() {
    const ctx = this.ctx;
    const type = this.data.currentVital;
    const range = this.data.vitalRanges[type];
    let value = this.data.vitalData.value;
    
    // 特殊处理血压值
    if (type === 'bloodPressure') {
      value = parseInt(value.split('/')[0]); // 只取收缩压
    } else {
      value = parseFloat(value);
    }
    
    // 计算百分比
    let percent = 0;
    if (type === 'oxygen') {
      // 血氧特殊处理，因为正常范围很窄
      percent = (value - 90) / (100 - 90);
      percent = Math.max(0, Math.min(1, percent));
    } else {
      // 其他体征
      const min = range.min * 0.5; // 扩展下限
      const max = range.max * 1.5; // 扩展上限
      percent = (value - min) / (max - min);
      percent = Math.max(0, Math.min(1, percent));
    }
    
    // 绘制环形进度
    this.drawGauge(ctx, percent, type);
  },

  // 绘制仪表盘
  drawGauge(ctx, percent, type) {
    const width = 300; // 画布宽度
    const height = 300; // 画布高度
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 10;
    
    // 清空画布
    ctx.clearRect(0, 0, width, height);
    
    // 绘制背景圆环
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.setLineWidth(20);
    ctx.setStrokeStyle('#EEEEEE');
    ctx.stroke();
    
    // 确定颜色
    let color = '#7ED321'; // 默认绿色
    const statusClass = this.data.vitalData.statusClass;
    if (statusClass === 'status-warning') {
      color = '#FFC107'; // 黄色
    } else if (statusClass === 'status-alert') {
      color = '#FF4757'; // 红色
    }
    
    // 绘制进度圆环
    if (percent > 0) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * percent);
      ctx.setLineWidth(20);
      ctx.setStrokeStyle(color);
      ctx.setLineCap('round');
      ctx.stroke();
    }
    
    // 绘制刻度
    this.drawScale(ctx, centerX, centerY, radius, type);
    
    // 应用绘制
    ctx.draw();
  },

  // 绘制刻度
  drawScale(ctx, centerX, centerY, radius, type) {
    const range = this.data.vitalRanges[type];
    const scaleRadius = radius + 15;
    
    // 绘制刻度文字
    ctx.setFontSize(14);
    ctx.setFillStyle('#999999');
    
    // 最小值
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(-Math.PI / 4);
    ctx.fillText(range.min.toString(), -scaleRadius, 0);
    ctx.restore();
    
    // 最大值
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(Math.PI / 4);
    ctx.fillText(range.max.toString(), scaleRadius - 30, 0);
    ctx.restore();
    
    // 中间值
    const midValue = Math.round((range.min + range.max) / 2);
    ctx.fillText(midValue.toString(), centerX, centerY - scaleRadius + 15);
  }
});