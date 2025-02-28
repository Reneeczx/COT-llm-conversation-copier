console.log('LLM Copier Content Script 已加载', new Date().toISOString());

// 避免重复声明
if (typeof window.llmCopierState === 'undefined') {
  // 使用全局对象存储状态
  window.llmCopierState = {
    selectedDialogues: new Set(),
    isSelectionMode: false,
    dialogueTimeOrder: new Map(),
    status: 'idle'  // 新增：状态管理 ['idle', 'selecting', 'copying', 'error']
  };
  
  // 初始加载确认
  console.log('🔧 LLM Copier 状态已初始化');
}

// 监听来自侧边栏的消息 - 增强版
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 收到消息:', message);
  //全部同步消息处理
  try {
    if (message.source === 'llm-copier') {
      switch (message.type) {
        case 'START_SELECTION':
          console.log('✨ LLM Copier: Starting Selection Mode');
          const success = startSelectionMode();
          
          // 只使用直接响应
          sendResponse({ 
            success: success, 
            isSelectionMode: window.llmCopierState.isSelectionMode,
            // 额外添加之前在广播消息中的状态信息
            status: success ? 'success' : 'error',
            message: success ? '' : '无法启动选择模式，请确保在支持的 LLM 对话页面上'
          });
          break;
          
        case 'COPY_CONTENT':
          // 立即发送接收确认
          sendResponse({ received: true, isSelectionMode: window.llmCopierState.isSelectionMode });
          // 然后异步处理复制请求
          setTimeout(() => handleCopyRequest(message.includeThinking), 0);
          break;
        
        case 'END_SELECTION':
          cleanupSelectionMode();
          sendResponse({ success: true, isSelectionMode: window.llmCopierState.isSelectionMode });
          break;
               
        default:
          // 对于未处理的消息类型，也发送响应
          sendResponse({ success: false, error: "未知的消息类型" });
      }
    } else {
      // 对于未处理的消息源，也发送响应
      sendResponse({ success: false, error: "未知的消息源" });
    }
  } catch (error) {
    console.error('LLM Copier Error:', error);
    window.llmCopierState.status = 'error';
    
    // 只在页面上显示错误提示
    showToastMessage('操作失败: ' + (error.message || '未知错误'));
    
    // 只通过直接响应返回错误
    sendResponse({ 
      success: false, 
      error: error.message || '发生未知错误',
      details: {
        stack: error.stack,
        timestamp: new Date().toISOString()
      }
    });
  }
  
  // 不需要异步响应，返回false
  return false;
});

// 发送消息到侧边栏
function sendToPopup(message) {
  chrome.runtime.sendMessage({
    source: 'llm-copier-content',
    ...message
  });
}

// 错误处理
function handleError(error) {
  console.error('LLM Copier Error:', error);
  window.llmCopierState.status = 'error';
  
  // 向侧边栏发送详细错误信息
  sendToPopup({
    type: 'ERROR',
    error: {
      message: error.message || '发生未知错误',
      stack: error.stack,
      timestamp: new Date().toISOString()
    }
  });
  
  // 在页面上也显示错误提示
  showToastMessage('操作失败: ' + (error.message || '未知错误'));
}

// 恢复状态
function restoreState() {
  if (window.llmCopierState.selectedDialogues.size > 0) {
    // 更新状态
    sendToPopup({
      type: 'SELECTION_STATUS',
      status: 'success'
    });
  }
}

// 处理复制请求
async function handleCopyRequest(includeThinking) {
  try {
    window.llmCopierState.status = 'copying';
    const content = await getSelectedContent(includeThinking);
    sendToPopup({
      type: 'COPY_RESULT',
      content
    });
  } catch (error) {
    handleError(error);
  } finally {
    window.llmCopierState.status = 'idle';
  }
}

// 启动选择模式
function startSelectionMode() {
  // 如果已经处于选择模式，先恢复到初始状态，并返回，即结束选择模式
  if (window.llmCopierState.isSelectionMode) {
    cleanupSelectionMode();
    return true;
  }
  
  const platform = detectPlatform();
  if (!platform) return false;
  
  window.llmCopierState.isSelectionMode = true;
  
  // 清除之前的选择
  window.llmCopierState.selectedDialogues.clear();
  window.llmCopierState.dialogueTimeOrder.clear();
  
  // 初始化对话时间顺序
  initializeDialogueOrder();
  
  // 添加选择模式的视觉提示
  document.body.classList.add('llm-copier-selection-mode');
  
  // 激活选择模式的视觉效果
  activateSelectionMode();
  
  // 为所有对话单元添加点击事件
  addDialogueClickListeners();
  
  return true;
}

// 初始化对话时间顺序
function initializeDialogueOrder() {
  const platform = detectPlatform();
  if (!platform) return;

  const dialogues = document.querySelectorAll([
    platform.user,
    platform.assistant
  ].join(','));
  
  dialogues.forEach((dialogue, index) => {
    window.llmCopierState.dialogueTimeOrder.set(dialogue, index);
  });
}

// 修改激活选择模式函数
function activateSelectionMode() {
  const platform = detectPlatform();
  if (!platform) return;
  
  console.log('🔍 正在激活选择模式');
  
  const dialogues = document.querySelectorAll([
    platform.user,
    platform.assistant
  ].join(','));
  
  console.log(`找到 ${dialogues.length} 个对话元素`);
  
  dialogues.forEach((dialogue, index) => {
    console.log('对话元素:', {
      index,
      tagName: dialogue.tagName,
      classes: dialogue.className,
      isThinking: dialogue.matches(platform.thinking) || 
                  dialogue.querySelector(platform.thinking) !== null
    });
    
    // 添加可选择类
    dialogue.classList.add('llm-copier-selectable');
    
    // 添加复选框指示器
    const checkbox = document.createElement('div');
    checkbox.className = 'checkbox-indicator';
    checkbox.setAttribute('data-index', index);
    
    // 添加点击事件
    dialogue.removeEventListener('click', handleDialogueClick); // 移除可能存在的旧事件
    dialogue.addEventListener('click', handleDialogueClick);
    
    // 复选框点击事件 - 简单处理，触发父元素点击
    checkbox.addEventListener('click', function(event) {
      console.log('📦 复选框被点击', index);
      // 阻止事件冒泡，防止事件触发两次
      event.stopPropagation();
      
      // 直接调用处理函数，而不是触发另一个点击事件
      toggleSelection(dialogue);
      
    });
    
    dialogue.appendChild(checkbox);
  });
  
  console.log('✅ 已添加选择框到', dialogues.length, '个对话元素');
}

// 修改toggleSelection函数中处理思考过程的部分
function toggleSelection(dialogue) {
  const isSelected = window.llmCopierState.selectedDialogues.has(dialogue);
  const checkbox = dialogue.querySelector('.checkbox-indicator');
  
  if (isSelected) {
    // 取消选中对话
    window.llmCopierState.selectedDialogues.delete(dialogue);
    dialogue.classList.remove('llm-copier-selected');
    
    // 重置复选框样式
    if (checkbox) {
      checkbox.textContent = '';
      checkbox.style.backgroundColor = 'white';
      checkbox.style.color = '';
      checkbox.style.fontWeight = '';
      checkbox.style.textAlign = '';
    }
    
    // 取消选中时不改变思考过程状态
    console.log('✅ 取消选中对话');
  } else {
    // 选中对话
    window.llmCopierState.selectedDialogues.add(dialogue);
    dialogue.classList.add('llm-copier-selected');
    
    // 设置选中状态样式
    if (checkbox) {
      checkbox.textContent = '✓';
      checkbox.style.backgroundColor = 'rgba(0, 120, 255, 0.1)';
      checkbox.style.color = 'rgb(0, 120, 255)';
      checkbox.style.fontWeight = 'bold';
      checkbox.style.textAlign = 'center';
      checkbox.style.lineHeight = '16px';
    }
    
    // 获取当前平台和思考元素
    /*
    const platform = detectPlatform();
    if (platform) {
      // 只在选中对话且思考过程折叠时展开思考过程
      const thinkingElement = dialogue.querySelector(platform.thinking);
      if (thinkingElement && !thinkingElement.classList.contains('mat-expanded')) {
       // console.log('🔄 展开思考过程 (因为是选中且折叠状态)');
       // setTimeout(() => thinkingElement.click(), 100);     
      }
    }
    */
    
    console.log('✅ 选中对话');
  }
}

// 修改对话单元点击处理函数
function handleDialogueClick(event) {
  // 如果不在选择模式，则不处理 
  if (!window.llmCopierState.isSelectionMode) return;
  
  console.log('🖱️ 对话单元被点击', {
    target: event.target.tagName,
    class: event.target.className
  });
  
  // 如果点击的是复选框，让复选框自己的处理程序处理
  if (event.target.classList.contains('checkbox-indicator')) {
    return; // 复选框有自己的点击处理程序
  }
  
  // 阻止事件冒泡
  event.preventDefault();
  event.stopPropagation();
  
  // 切换选择状态
  toggleSelection(event.currentTarget);
}

// 简化addDialogueClickListeners - 这在activateSelectionMode中已处理
function addDialogueClickListeners() {
  // 现在在activateSelectionMode中处理添加监听器
  console.log('对话单元点击监听器已添加');
}

// 获取选中的内容
function getSelectedContent(includeThinking) {
  // 将选中的对话按时间顺序排序
  const sortedDialogues = Array.from(window.llmCopierState.selectedDialogues)
    .sort((a, b) => window.llmCopierState.dialogueTimeOrder.get(a) - window.llmCopierState.dialogueTimeOrder.get(b));
    
  // 提取对话内容, role包括uesr和assistant，其中assistant包括思考过程
  return sortedDialogues.map(dialogue => {
    const role = determineRole(dialogue);
    const content = extractContent(dialogue);
    const thinking = includeThinking ? extractThinking(dialogue) : null;
    
    // 创建返回对象
    const returnObj = {
      role,
      // 如果是 assistant 角色，先返回思考过程
      ...(role === 'assistant' && thinking ? { thinking } : {}),
      content,
    };
    
    // 调试输出 - 查看每个对话元素的详细信息
    console.log('对话信息:', {
      角色: role,
      '是否有思考过程': !!thinking,
      '思考过程内容': thinking,
      '主要内容': content,
      '返回对象结构': returnObj
    });
    
    return returnObj;
  });
}

// 判断对话角色（用户/AI）
function determineRole(dialogue) {
  const platform = detectPlatform();
  if (!platform) return 'unknown';

  // 根据不同平台的 DOM 结构判断
  if (dialogue.matches(platform.user)) {
    return 'user';
  }
  return 'assistant';
}

// 平台选择器配置 - 用于支持多个 LLM 平台
const PLATFORM_SELECTORS = {
  'aistudio.google.com': {
    // 每个平台特定的选择器配置
    user: '.chat-turn-container.user.render',  // 确保选中已渲染的用户消息
    assistant: '.model-prompt-container[data-turn-role="Model"]',  // 这个是正确的
    thinking: 'mat-accordion.compact-accordion mat-expansion-panel',  // 直接选中面板
    // 内容选择器
    content: {
      user: '.turn-content ms-text-chunk ms-cmark-node.user-chunk',  // 用户消息内容
      assistant: '.turn-content ms-text-chunk ms-cmark-node.gmat-body-medium',  // AI回复内容
      thinking: '.mat-expansion-panel-body ms-text-chunk ms-cmark-node'  // 思考过程内容
    }
  }
  // 后续可以添加其他平台的选择器
};

/**
 * 检测当前页面所属的 LLM 平台
 * @returns {Object|undefined} 返回平台特定的选择器配置
 */
function detectPlatform() {
  const hostname = window.location.hostname;
  return PLATFORM_SELECTORS[hostname];
}

/**
 * 提取对话内容
 * @param {Element} dialogue - 对话元素
 * @returns {string} 提取的文本内容
 */
function extractContent(dialogue) {
  try {
    const platform = detectPlatform();
    if (!platform) return '';

    const role = determineRole(dialogue);
    const contentElement = dialogue.querySelector(
      platform.content[role]
    );
    
    console.log('📝 LLM Copier: 提取内容', {
      role,
      selector: platform.content[role],
      found: !!contentElement
    });
    
    // 使用新的格式保留提取方法
    return contentElement ? extractFormattedContent(contentElement) : '';
  } catch (error) {
    console.error('❌ LLM Copier: 提取内容失败', {
      error,
      dialogue: dialogue.outerHTML,
      stack: error.stack
    });
    return '';
  }
}

// 提取思考过程时不需要再处理展开/折叠
async function extractThinking(dialogue) {
  try {
    const platform = detectPlatform();
    if (!platform) return '';
  
    const thinkingElement = dialogue.querySelector(platform.thinking);
    if (!thinkingElement) return '';
  
    // 直接提取内容
    const content = Array.from(thinkingElement.querySelectorAll(platform.content.thinking))
      .map(node => extractFormattedContent(node))
      .filter(text => text)
      .join('\n\n');

    console.log('📝 LLM Copier: 提取思考过程', {
      content
    }); 
     
    return content;
  } catch (error) {
    console.error('提取思考过程失败:', {
      error,
      dialogue: dialogue.outerHTML,
      platform: detectPlatform(),
      stack: error.stack
    });
    handleError(error);
    return '';
  }
}

// 清理选择模式
function cleanupSelectionMode() {
  console.log('Cleaning up selection mode');
  
  // 更新状态
  window.llmCopierState.isSelectionMode = false;
  
  // 移除选择模式的视觉提示
  document.body.classList.remove('llm-copier-selection-mode');
  
  // 获取当前平台
  /*
  const platform = detectPlatform();
  if (platform) {
    // 恢复所有展开的思考过程到原始状态
    document.querySelectorAll(platform.thinking).forEach(thinkingElement => {
      if (thinkingElement.classList.contains('mat-expanded')) {
        thinkingElement.click();
      }
    });
  }
  */    
  // 移除所有选择相关的类和元素
  document.querySelectorAll('.llm-copier-selectable').forEach(el => {
    el.classList.remove('llm-copier-selectable', 'llm-copier-selected');
    el.removeEventListener('click', handleDialogueClick);
    el.querySelector('.checkbox-indicator')?.remove();
  });
}

// 改进格式保留
function extractFormattedContent(element) {
  if (!element) return '';

  // 递归处理所有子节点
  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }

    let content = '';
    const nodeName = node.nodeName.toLowerCase();

    // 处理不同的格式
    switch (nodeName) {
      case 'code':
        return `\`${node.textContent}\``;
      case 'pre':
        return `\n\`\`\`\n${node.textContent}\n\`\`\`\n`;
      case 'strong':
      case 'b':
        return `**${Array.from(node.childNodes).map(processNode).join('')}**`;
      case 'em':
      case 'i':
        return `*${Array.from(node.childNodes).map(processNode).join('')}*`;
      case 'ul':
        return '\n' + Array.from(node.children).map(li => `- ${processNode(li)}`).join('\n') + '\n';
      case 'ol':
        return '\n' + Array.from(node.children).map((li, i) => `${i + 1}. ${processNode(li)}`).join('\n') + '\n';
      case 'blockquote':
        return `\n> ${Array.from(node.childNodes).map(processNode).join('')}\n`;
      case 'p':
        return `\n${Array.from(node.childNodes).map(processNode).join('')}\n`;
      case 'br':
        return '\n';
      default:
        return Array.from(node.childNodes).map(processNode).join('');
    }
  }

  return processNode(element).trim();
} 