// 配置常量
const CONFIG = {
  SUPPORTED_DOMAINS: [
    'chat.openai.com',
    'claude.ai',
    'aistudio.google.com',
    'yuanbao.tencent.com'
  ],
  STORAGE_KEYS: {
    INCLUDE_THINKING: 'includeThinking'
  }
};

// 监听扩展安装
chrome.runtime.onInstalled.addListener(async () => {
  try {
    // 初始化存储的设置
    await chrome.storage.sync.set({
      [CONFIG.STORAGE_KEYS.INCLUDE_THINKING]: true
    });
    console.log('Extension installed successfully');
    
    // 配置侧边栏
    chrome.sidePanel.setOptions({
      path: 'popup/popup.html',
      enabled: true
    });
  } catch (error) {
    console.error('Failed to initialize storage:', error);
  }
});

// 检查页面支持
function checkPageSupport(url) {
  try {
    const pageUrl = new URL(url);
    return CONFIG.SUPPORTED_DOMAINS.some(domain => 
      pageUrl.hostname.includes(domain)
    );
  } catch (error) {
    console.error('Invalid URL:', error);
    return false;
  }
}

// 监听消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkPageSupport') {
    const isSupported = checkPageSupport(request.url || (sender.tab && sender.tab.url));
    sendResponse({ isSupported });
  }
  return false; // 同步操作
});

// 监听图标点击
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({tabId: tab.id});
});

/**
 * TODO: 实现导出功能
 * @param {string} format - 导出格式 ('markdown'|'pdf'|'image')
 * @param {Object} content - 要导出的内容
 * @returns {Promise<string|Blob>} 导出的内容
 */
async function exportContent(format, content) {
  switch (format) {
    case 'markdown':
      return convertToMarkdown(content);
    case 'pdf':
      return exportToPDF(content);
    case 'image':
      return exportToImage(content);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

// 需要实现：
// 1. Markdown转换逻辑
// 2. PDF导出功能
// 3. 图片导出功能
// 4. 格式保留机制

// 1. Markdown转换逻辑
function convertToMarkdown(content) {
  // 实现代码...
}

// 2. PDF导出功能
async function exportToPDF(content) {
  // 实现代码...
}

// 3. 图片导出功能
async function exportToImage(content) {
  // 实现代码...
} 