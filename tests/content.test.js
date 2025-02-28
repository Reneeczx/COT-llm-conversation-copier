// 模拟 Chrome API
global.chrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn()
    }
  }
};

// 导入被测试的函数
const fs = require('fs');
const path = require('path');
const contentScript = fs.readFileSync(path.resolve(__dirname, '../content/content.js'), 'utf8');
eval(contentScript);

describe('对话选择功能测试', () => {
  // 在每个测试前重置 DOM
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="chat-container">
        <div class="text-base user-message">
          <div class="text-base">用户问题 1</div>
        </div>
        <div class="text-base">
          <div class="text-base">AI 回答 1</div>
          <div class="thinking-steps">思考过程 1</div>
        </div>
        <div class="claude-message from-user">
          <div class="claude-message-content">用户问题 2</div>
        </div>
        <div class="claude-message">
          <div class="claude-message-content">AI 回答 2</div>
          <div class="intermediate-steps">思考过程 2</div>
        </div>
      </div>
    `;
  });

  test('启动选择模式', () => {
    startSelectionMode();
    
    // 检查选择模式是否正确启动
    expect(isSelectionMode).toBe(true);
    expect(document.body.classList.contains('llm-copier-selection-mode')).toBe(true);
    
    // 检查对话元素是否添加了可选择类
    const selectableElements = document.querySelectorAll('.llm-copier-selectable');
    expect(selectableElements.length).toBeGreaterThan(0);
  });

  test('对话时间顺序初始化', () => {
    initializeDialogueOrder();
    
    // 检查是否正确记录了对话顺序
    expect(dialogueTimeOrder.size).toBeGreaterThan(0);
    
    // 检查顺序是否正确
    const dialogues = Array.from(dialogueTimeOrder.keys());
    expect(dialogueTimeOrder.get(dialogues[0])).toBeLessThan(dialogueTimeOrder.get(dialogues[1]));
  });

  test('对话选择切换', () => {
    startSelectionMode();
    
    // 模拟点击第一个对话
    const firstDialogue = document.querySelector('.text-base');
    firstDialogue.click();
    
    // 检查选择状态
    expect(selectedDialogues.has(firstDialogue)).toBe(true);
    expect(firstDialogue.classList.contains('llm-copier-selected')).toBe(true);
    
    // 再次点击取消选择
    firstDialogue.click();
    expect(selectedDialogues.has(firstDialogue)).toBe(false);
    expect(firstDialogue.classList.contains('llm-copier-selected')).toBe(false);
  });

  test('内容提取', () => {
    startSelectionMode();
    
    // 选择所有对话
    document.querySelectorAll('.text-base, .claude-message').forEach(dialogue => {
      dialogue.click();
    });
    
    const content = getSelectedContent();
    
    // 检查提取的内容
    expect(content).toEqual(expect.arrayContaining([
      expect.objectContaining({
        role: 'user',
        content: expect.any(String),
        thinking: expect.any(String)
      }),
      expect.objectContaining({
        role: 'assistant',
        content: expect.any(String),
        thinking: expect.any(String)
      })
    ]));
  });

  test('角色判断', () => {
    const userMessage = document.querySelector('.user-message');
    const assistantMessage = document.querySelector('.text-base:not(.user-message)');
    
    expect(determineRole(userMessage)).toBe('user');
    expect(determineRole(assistantMessage)).toBe('assistant');
  });

  test('思考过程提取', () => {
    const dialogue = document.querySelector('.text-base:not(.user-message)');
    const thinking = extractThinking(dialogue);
    
    expect(thinking).toBe('思考过程 1');
  });

  test('清理选择模式', () => {
    startSelectionMode();
    
    // 选择一些对话
    document.querySelector('.text-base').click();
    
    cleanupSelectionMode();
    
    // 检查清理效果
    expect(isSelectionMode).toBe(false);
    expect(document.body.classList.contains('llm-copier-selection-mode')).toBe(false);
    expect(document.querySelectorAll('.llm-copier-selected').length).toBe(0);
    expect(selectedDialogues.size).toBe(0);
  });
}); 