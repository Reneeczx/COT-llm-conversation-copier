// 模拟 DOM 环境
require('jsdom-global')();

// 模拟 Chrome API
global.chrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn()
    }
  },
  tabs: {
    query: jest.fn()
  }
}; 