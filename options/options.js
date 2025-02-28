// 获取页面元素
const includeThinkingCheckbox = document.getElementById('includeThinking');
const statusDiv = document.getElementById('status');

// 加载保存的设置
chrome.storage.sync.get(
  {
    includeThinking: true  // 默认值
  },
  (items) => {
    includeThinkingCheckbox.checked = items.includeThinking;
  }
);

// 保存设置
function saveOptions() {
  chrome.storage.sync.set(
    {
      includeThinking: includeThinkingCheckbox.checked
    },
    () => {
      showStatus('设置已保存');
    }
  );
}

// 显示状态信息
function showStatus(message, type = 'success') {
  statusDiv.textContent = message;
  statusDiv.className = 'status ' + type;
  setTimeout(() => {
    statusDiv.className = 'status';
  }, 3000);
}

// 添加事件监听器
includeThinkingCheckbox.addEventListener('change', saveOptions); 