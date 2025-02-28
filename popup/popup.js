// 初始化侧边栏功能
function initializePopup() {
  console.log('Initializing side panel...');
  
  // 获取所有需要的元素
  const container = document.getElementById('llm-copier-popup');
  const startSelectBtn = document.getElementById('startSelect');
  const copyMarkdownBtn = document.getElementById('copyMarkdown');
  const includeThinkingCheckbox = document.getElementById('includeThinking');
  const statusDiv = document.getElementById('status');
  
  // 添加状态跟踪变量
  let isSelectionModeActive = false;
  
  // 检查当前页面是否支持
  checkCurrentPageSupport();
  
  // 新增：检查当前页面是否支持扩展功能
  function checkCurrentPageSupport() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs.length === 0) {
        showStatus('请在LLM对话页面上使用本功能', 'error');
        disableButtons(true);
        return;
      }
      
      const currentTab = tabs[0];
      
      // 向background script发送检查请求
      chrome.runtime.sendMessage(
        { action: 'checkPageSupport', url: currentTab.url },
        function(response) {
          if (!response || !response.isSupported) {
            showStatus('当前页面不支持，请在ChatGPT、Claude或Google AI页面使用', 'error');
            disableButtons(true);
          } else {
            showStatus('当前页面已支持，可以开始使用', 'info');
            disableButtons(false);
          }
        }
      );
    });
  }
  
   
  // 新增：根据当前状态更新UI
  function updateSelectionUI() {
    const selectionStatus = document.getElementById('selectionStatus');
    if (!selectionStatus) return;
    
    const statusIcon = selectionStatus.querySelector('.status-icon');
    const statusText = selectionStatus.querySelector('.status-text');
    
    if (isSelectionModeActive) {
      statusIcon.className = 'status-icon success';
      statusText.textContent = '选择模式：已激活';
      startSelectBtn.textContent = '结束选择';
    } else {
      statusIcon.className = 'status-icon';
      statusText.textContent = '选择模式：未开始';
      startSelectBtn.textContent = '开始选择';
    }
  }
  
  // 禁用/启用按钮
  function disableButtons(disabled) {
    startSelectBtn.disabled = disabled;
    copyMarkdownBtn.disabled = disabled;
    
    if (disabled) {
      startSelectBtn.classList.add('disabled');
      copyMarkdownBtn.classList.add('disabled');
    } else {
      startSelectBtn.classList.remove('disabled');
      copyMarkdownBtn.classList.remove('disabled');
    }
  }
  
  // 调试日志：检查元素是否获取成功
  console.log('Elements found:', {
    container: !!container,
    startSelectBtn: !!startSelectBtn,
    copyMarkdownBtn: !!copyMarkdownBtn,
    includeThinkingCheckbox: !!includeThinkingCheckbox,
    statusDiv: !!statusDiv
  });
  
  // 确保所有元素都存在
  if (!container || !startSelectBtn || 
      !copyMarkdownBtn || !includeThinkingCheckbox || !statusDiv) {
    console.error('侧边栏初始化失败：缺少必要元素');
    return;
  }
  
  // 从存储获取上次的选项设置
  chrome.storage.sync.get(['includeThinking'], (result) => {
    if (result.includeThinking !== undefined) {
      includeThinkingCheckbox.checked = result.includeThinking;
    }
  });
  
  // 保存选项设置
  includeThinkingCheckbox.addEventListener('change', () => {
    chrome.storage.sync.set({
      includeThinking: includeThinkingCheckbox.checked
    });
  });
  
  // 开始选择按钮
  startSelectBtn.addEventListener('click', () => {
    try {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (!tabs || tabs.length === 0) {
          showStatus('无法获取当前标签页信息', 'error');
          return;
        }
        
        console.log('🔄 发送消息到 content script');
        
        // 根据当前状态决定发送的消息类型
        const messageType = isSelectionModeActive ? 'END_SELECTION' : 'START_SELECTION';
        
        chrome.tabs.sendMessage(tabs[0].id, {
          source: 'llm-copier',
          type: messageType
        }, response => {
          if (chrome.runtime.lastError) {
            console.error('发送消息错误:', chrome.runtime.lastError);
            showStatus('无法与页面通信，请确保在支持的LLM对话页面上并刷新后重试', 'error');
          } else if (response && response.success === false) {
            showStatus(`无法${isSelectionModeActive ? '结束' : '启动'}选择模式，请确保在支持的LLM对话页面上`, 'error');
          } else if (response) {
            // 从响应中更新状态
            if (response.isSelectionMode !== undefined) {
              isSelectionModeActive = response.isSelectionMode;
              updateSelectionUI();
            }
          }
        });
      });
    } catch (error) {
      handleError(error);
    }
  });
  
  // 复制为 Markdown 按钮
  copyMarkdownBtn.addEventListener('click', () => {
    try {
      const includeThinking = includeThinkingCheckbox.checked;
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (!tabs || tabs.length === 0) {
          showStatus('无法获取当前标签页信息', 'error');
          return;
        }
        
        chrome.tabs.sendMessage(tabs[0].id, {
          source: 'llm-copier',
          type: 'COPY_CONTENT',
          includeThinking
        }, response => {
          if (chrome.runtime.lastError) {
            console.error('发送复制请求错误:', chrome.runtime.lastError);
            showStatus('无法与页面通信，请刷新页面后重试', 'error');
          }
        });
      });
    } catch (error) {
      handleError(error);
    }
  });
  
  // 监听来自 content script 的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
      if (message.source === 'llm-copier-content') {
        console.log('popup收到消息:', message);
        
        switch (message.type) {
          // 可以注释掉或移除这部分，因为不再使用这种方式更新选择状态
          // case 'SELECTION_STATUS':
          //   if (message.isSelectionMode !== undefined) {
          //     isSelectionModeActive = message.isSelectionMode;
          //   }
          //   updateSelectionUI();
          //   break;
            
          case 'COPY_RESULT':
            handleCopyResult(message.content);
            break;
            
          case 'ERROR':
            handleError(message.error);
            break;
        }
      }
    } catch (error) {
      handleError(error);
    }
    return false;
  });
  
  // 错误处理
  function handleError(error) {
    console.error('Popup Error:', error);
    showStatus(error.message || '发生未知错误', 'error');
  }
  
  // 显示状态信息
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + (type || 'info');
    
    // 3秒后自动清除成功消息
    if (type === 'success') {
      setTimeout(() => {
        statusDiv.textContent = '';
        statusDiv.className = 'status';
      }, 3000);
    }
  }
  
  // 处理复制结果
  function handleCopyResult(content) {
    if (!content || content.length === 0) {
      showStatus('请先选择要复制的对话内容', 'error');
      return;
    }

    try {
      const formattedContent = formatContent(content);
      navigator.clipboard.writeText(formattedContent)
        .then(() => {
          showStatus('复制成功！', 'success');
        })
        .catch(error => {
          console.error('Copy failed:', error);
          showStatus('复制失败，请重试', 'error');
        });
    } catch (error) {
      console.error('Format error:', error);
      showStatus('内容格式化失败', 'error');
    }
  }
  
  // 格式化内容函数
  function formatContent(content) {
    if (!Array.isArray(content)) {
      return String(content);
    }
    
    return content.map(item => {
      let formattedItem = '';
      
      // 添加角色标记
      if (item.role === 'user') {
        formattedItem += '## 用户:\n\n';
      } else if (item.role === 'assistant') {
        formattedItem += '## 助手:\n\n';
      }
      
      // 添加思考过程（如果存在）
      if (item.thinking) {
        formattedItem += '**思考过程:**\n\n';
        // 处理思考过程内容，确保对象被正确转换为字符串
        if (typeof item.thinking === 'object') {
          if (Array.isArray(item.thinking)) {
            // 如果是数组，格式化每个元素
            formattedItem += item.thinking.map(t => 
              typeof t === 'object' ? JSON.stringify(t, null, 2) : String(t)
            ).join('\n\n');
          } else {
            // 如果是单个对象，使用JSON.stringify进行格式化
            //JSON.stringify(item.thinking, null, 2)对象转换为字符串，还添加了2个空格
            formattedItem += JSON.stringify(item.thinking, null, 2);
          }
        } else {
          // 如果是字符串或其他基本类型，直接使用
          formattedItem += item.thinking;
        }
        formattedItem += '\n\n';
      }
      
      // 添加主要内容
      if (item.content) {
        formattedItem += item.content;
      }
      
      return formattedItem;
    }).join('\n\n');
  }
}

// 确保初始化函数被调用
document.addEventListener('DOMContentLoaded', initializePopup); 