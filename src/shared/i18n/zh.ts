import type { I18nDict } from './en';

export const zh: I18nDict = {
  panel: {
    count: '{n} 条调用',
    toolbar: {
      search: '按方法或来源筛选',
      clear: '清空',
      export: '导出',
      settings: '设置',
      monitoring: '监控',
      record: '记录',
      pause: '暂停',
      filter: { kind: '类型', origin: '来源', chain: '链' },
    },
    filters: {
      all: '全部', read: '读取', write: '写入', sign: '签名',
      errors: '错误', mocked: '模拟',
    },
    list: { method: '方法', origin: '来源', status: '状态', duration: '耗时', ts: '时间' },
    detail: {
      tabs: { params: '参数', result: '返回值', timing: '耗时', raw: '原始数据' },
      sec: {
        params: '请求参数',
        result: '返回值',
        timing: '耗时分解 · {n} 毫秒',
        raw: '原始 JSON-RPC 报文',
      },
      timing: {
        dapp: 'DApp 发送',
        queue: '扩展排队',
        approval: '钱包授权',
        rpc: 'RPC 往返',
        return: '返回给 DApp',
      },
      replay: '重放', mock: '模拟', block: '拦截',
      disabledHint: 'P1 功能 — 即将推出',
      empty: '选择一条调用查看详情',
    },
    status: {
      connected: '已连接',
      idle: '空闲',
      total: '{n} 条记录',
      shortcut: '搜索 · {k}',
    },
    empty: {
      waiting: { title: '等待调用', hint: '在 DApp 上操作以捕获 RPC 活动' },
      noDapp: { title: '未检测到 DApp', hint: '此页面未暴露 Web3 Provider' },
    },
  },
  popup: {
    title: 'DApp Inspector',
    monitoring: '监控',
    openFull: '查看完整调用记录',
    openPanel: '打开 DevTools 面板',
    currentTab: '当前标签页',
    detected: '检测到 DApp',
    provider: 'Provider',
    chain: '链',
    last: '最近',
    calls120: '{n} 次 / 120 秒',
    agoS: '{n} 秒前',
    variants: {
      active: { heading: '已连接', hint: '正在检查活动' },
      off: { heading: '监控已关闭', hint: '打开以开始捕获' },
      noDapp: { heading: '此处无 DApp', hint: '访问 Web3 DApp 以开始' },
    },
    recent: '近期活动',
  },
  options: {
    nav: { general: '常规', capture: '抓取', mock: '模拟', advanced: '高级', about: '关于' },
    general: {
      theme: '主题', themeSystem: '跟随系统', themeLight: '浅色', themeDark: '深色',
      lang: '语言',
    },
    capture: {
      retention: '保留条数',
      ignoredMethods: '忽略方法',
      storage: '存储占用',
    },
    mock: {
      locked: 'Mock 规则 — P1 版本',
      lockedHint: '拦截 RPC 请求并返回自定义响应。下一版本推出。',
    },
    advanced: {
      clearHistory: '清空全部历史',
      clearHistoryConfirm: '输入 CLEAR 确认',
      resetSettings: '重置全部设置',
    },
    about: { version: '版本', links: '资源', changelog: '更新日志' },
  },
  common: { on: '开', off: '关', cancel: '取消', confirm: '确认', save: '保存' },
};
