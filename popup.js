/**
 * 标签页会话管理器 - 核心逻辑
 * 
 * 功能：
 * 1. 保存当前窗口所有标签页为一个会话
 * 2. 搜索和筛选会话
 * 3. 恢复会话（在新窗口中打开所有标签页）
 * 4. 删除会话
 * 5. 编辑会话名称
 * 6. 预览会话内的标签页列表
 * 7. 将当前页面添加到会话
 */

// ========== 常量配置 ==========
const MAX_SESSIONS = 50; // 会话数量上限

// ========== DOM 元素引用 ==========
const saveBtn = document.getElementById('saveBtn');
const addCurrentPageBtn = document.getElementById('addCurrentPageBtn');
const searchInput = document.getElementById('searchInput');
const sessionsList = document.getElementById('sessionsList');
const sessionCount = document.getElementById('sessionCount');

// ========== 全局状态 ==========
let allSessions = []; // 存储所有会话数据

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
  loadSessions();
  bindEvents();
});

/**
 * 绑定所有事件监听器
 */
function bindEvents() {
  // 保存按钮点击事件
  saveBtn.addEventListener('click', saveCurrentSession);
  
  // 添加当前页面按钮点击事件
  addCurrentPageBtn.addEventListener('click', showSessionSelector);
  
  // 搜索框输入事件（实时筛选）
  searchInput.addEventListener('input', filterSessions);
  
  // 会话列表事件委托（处理所有按钮点击）
  sessionsList.addEventListener('click', handleSessionAction);
}

/**
 * 会话列表事件委托处理器
 * @param {Event} e - 点击事件
 */
function handleSessionAction(e) {
  const target = e.target;
  const card = target.closest('.session-card');
  if (!card) return;
  
  const sessionId = card.dataset.id;
  
  // 展开详情按钮
  if (target.classList.contains('btn-toggle')) {
    toggleTabsPreview(sessionId, target);
    return;
  }
  
  // 全部恢复按钮
  if (target.classList.contains('btn-restore')) {
    restoreSession(sessionId);
    return;
  }
  
  // 删除按钮
  if (target.classList.contains('btn-delete')) {
    deleteSession(sessionId);
    return;
  }
  
  // 会话名称（点击编辑）
  if (target.classList.contains('session-name')) {
    editSessionName(sessionId);
    return;
  }
  
  // 标签页标题（单独打开）
  if (target.classList.contains('tab-title')) {
    const url = target.dataset.url;
    if (url) openSingleTab(url);
    return;
  }
  
  // 删除单个标签页按钮
  if (target.classList.contains('tab-remove')) {
    const tabItem = target.closest('.tab-item');
    const index = parseInt(tabItem.dataset.index, 10);
    removeTabFromSession(sessionId, index);
    return;
  }
  
  // 快捷添加按钮（会话卡片上的 +添加 按钮）
  if (target.classList.contains('session-add-btn')) {
    addCurrentPageToSession(sessionId);
    return;
  }
}

// ========== 数据操作函数 ==========

/**
 * 从 chrome.storage.local 加载所有会话
 */
async function loadSessions() {
  try {
    const result = await chrome.storage.local.get('sessions');
    allSessions = result.sessions || [];
    updateSessionCount();
    refreshSessionList();
  } catch (error) {
    console.error('加载会话失败:', error);
    showToast('加载会话失败');
  }
}

/**
 * 保存所有会话到 chrome.storage.local
 */
async function saveSessions() {
  try {
    await chrome.storage.local.set({ sessions: allSessions });
    updateSessionCount();
  } catch (error) {
    console.error('保存会话失败:', error);
    showToast('保存失败');
  }
}

/**
 * 更新会话计数显示
 */
function updateSessionCount() {
  sessionCount.textContent = `已保存 ${allSessions.length}/${MAX_SESSIONS} 个会话`;
}

// ========== 核心功能函数 ==========

/**
 * 保存当前窗口所有标签页为一个会话
 */
async function saveCurrentSession() {
  try {
    // 检查会话数量是否已达上限
    if (allSessions.length >= MAX_SESSIONS) {
      showToast(`已达到会话上限（${MAX_SESSIONS}个），请先删除部分会话`);
      return;
    }
    
    // 禁用保存按钮，防止重复点击
    saveBtn.disabled = true;
    saveBtn.textContent = '正在保存...';
    
    // 获取当前窗口的所有标签页
    const tabs = await chrome.tabs.query({ currentWindow: true });
    
    // 过滤掉空白页和扩展页面
    const validTabs = tabs.filter(tab => {
      const url = tab.url || '';
      return url && 
             !url.startsWith('chrome://') && 
             !url.startsWith('chrome-extension://') &&
             !url.startsWith('edge://') &&
             !url.startsWith('about:blank');
    });
    
    // 如果没有有效标签页，提示用户
    if (validTabs.length === 0) {
      showToast('没有可保存的有效标签页');
      saveBtn.disabled = false;
      saveBtn.textContent = '保存当前窗口所有标签页';
      return;
    }
    
    // 生成会话名称
    const now = new Date();
    const dateStr = now.toLocaleDateString('zh-CN'); // 2026/5/12
    const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }); // 18:30
    const defaultName = `${dateStr} ${timeStr}（${validTabs.length}个标签页）`;
    
    // 构建会话对象
    const session = {
      id: Date.now().toString(), // 使用时间戳作为唯一ID
      name: defaultName,
      createdAt: now.toISOString(),
      tabs: validTabs.map(tab => ({
        title: tab.title || '无标题',
        url: tab.url,
        favIconUrl: tab.favIconUrl || null
      }))
    };
    
    // 添加到会话列表（最新的排在前面）
    allSessions.unshift(session);
    
    // 保存到存储
    await saveSessions();
    
    // 重新渲染列表
    refreshSessionList();
    
    // 显示成功提示
    showToast(`已保存为"${defaultName}"`);
    
  } catch (error) {
    console.error('保存会话失败:', error);
    showToast('保存失败，请重试');
  } finally {
    // 恢复按钮状态
    saveBtn.disabled = false;
    saveBtn.textContent = '保存当前窗口所有标签页';
  }
}

/**
 * 恢复会话（在新窗口中打开所有标签页）
 * @param {string} sessionId - 会话ID
 */
async function restoreSession(sessionId) {
  try {
    const session = allSessions.find(s => s.id === sessionId);
    if (!session) {
      showToast('会话不存在');
      return;
    }
    
    showToast(`正在恢复 ${session.tabs.length} 个标签页...`);
    
    // 创建新窗口
    const window = await chrome.windows.create({ focused: true });
    
    // 依次在新窗口中打开所有标签页
    let successCount = 0;
    for (const tab of session.tabs) {
      try {
        await chrome.tabs.create({
          windowId: window.id,
          url: tab.url,
          active: false
        });
        successCount++;
      } catch (error) {
        console.warn('无法打开标签页:', tab.url, error);
      }
    }
    
    // 关闭新窗口默认创建的空白标签页
    const tabs = await chrome.tabs.query({ windowId: window.id });
    const blankTab = tabs.find(t => t.url === 'chrome://newtab/' || t.url === 'about:blank');
    if (blankTab) {
      await chrome.tabs.remove(blankTab.id);
    }
    
    showToast(`已恢复 ${successCount}/${session.tabs.length} 个标签页`);
    
  } catch (error) {
    console.error('恢复会话失败:', error);
    showToast('恢复失败，请重试');
  }
}

/**
 * 删除会话
 * @param {string} sessionId - 会话ID
 */
async function deleteSession(sessionId) {
  const session = allSessions.find(s => s.id === sessionId);
  if (!session) return;
  
  // 弹出自定义确认弹窗
  const confirmed = await showConfirm('删除会话', `确定要删除"${session.name}"吗？包含 ${session.tabs.length} 个标签页`);
  if (!confirmed) return;
  
  try {
    // 从数组中移除
    allSessions = allSessions.filter(s => s.id !== sessionId);
    
    // 保存到存储
    await saveSessions();
    
    // 重新渲染列表
    refreshSessionList();
    
    showToast('已删除');
    
  } catch (error) {
    console.error('删除会话失败:', error);
    showToast('删除失败，请重试');
  }
}

/**
 * 编辑会话名称
 * @param {string} sessionId - 会话ID
 */
async function editSessionName(sessionId) {
  const session = allSessions.find(s => s.id === sessionId);
  if (!session) return;
  
  // 弹出输入对话框
  const newName = prompt('请输入新的会话名称:', session.name);
  
  // 用户点击取消或输入为空，不做修改
  if (!newName || newName.trim() === '') return;
  
  try {
    // 更新会话名称
    session.name = newName.trim();
    
    // 保存到存储
    await saveSessions();
    
    // 重新渲染列表
    refreshSessionList();
    
    showToast('已重命名');
    
  } catch (error) {
    console.error('重命名失败:', error);
    showToast('重命名失败');
  }
}

/**
 * 在新标签页中打开单个网址
 * @param {string} url - 网址
 */
async function openSingleTab(url) {
  try {
    await chrome.tabs.create({ url, active: true });
  } catch (error) {
    console.error('打开标签页失败:', error);
    showToast('无法打开此链接');
  }
}

/**
 * 从会话中删除单个标签页
 * @param {string} sessionId - 会话ID
 * @param {number} tabIndex - 标签页索引
 */
async function removeTabFromSession(sessionId, tabIndex) {
  const session = allSessions.find(s => s.id === sessionId);
  if (!session) return;
  
  const tab = session.tabs[tabIndex];
  if (!tab) return;
  
  // 弹出自定义确认弹窗
  const confirmed = await showConfirm('删除标签页', `确定要删除：${tab.title}`);
  if (!confirmed) return;
  
  try {
    // 从会话中移除该标签页
    session.tabs.splice(tabIndex, 1);
    
    // 如果会话中没有标签页了，删除整个会话
    if (session.tabs.length === 0) {
      allSessions = allSessions.filter(s => s.id !== sessionId);
      await saveSessions();
      refreshSessionList();
      showToast('已删除标签页，会话已清空');
      return;
    }
    
    // 更新会话名称中的标签页数量（如果是默认命名格式）
    updateSessionNameCount(session);
    
    // 保存到存储
    await saveSessions();
    
    // 检查是否有搜索词
    const keyword = searchInput.value.trim().toLowerCase();
    
    if (keyword) {
      // 有搜索词，重新渲染以保持搜索结果正确
      refreshSessionList();
      showToast('已删除标签页');
      return;
    }
    
    // 无搜索词，只更新该会话卡片的预览区域，保持展开状态
    const card = document.querySelector(`.session-card[data-id="${sessionId}"]`);
    if (card) {
      const preview = card.querySelector('.tabs-preview');
      const metaCount = card.querySelector('.session-meta span:last-child');
      const sessionName = card.querySelector('.session-name');
      
      // 更新会话名称显示
      if (sessionName) {
        sessionName.textContent = session.name;
      }
      
      // 更新标签页数量显示
      if (metaCount) {
        metaCount.textContent = `${session.tabs.length} 个标签页`;
      }
      
      // 更新预览列表
      if (preview && preview.style.display !== 'none') {
        preview.innerHTML = session.tabs.map((t, index) => `
          <div class="tab-item" data-index="${index}">
            <img class="tab-icon" src="${t.favIconUrl || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22><rect fill=%22%23ddd%22 width=%2216%22 height=%2216%22/></svg>'}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22><rect fill=%22%23ddd%22 width=%2216%22 height=%2216%22/></svg>'">
            <span class="tab-title" data-url="${escapeHtml(t.url)}" title="${escapeHtml(t.url)}">${escapeHtml(t.title)}</span>
            <button class="tab-remove" title="删除此标签页">×</button>
          </div>
        `).join('');
      }
    }
    
    showToast('已删除标签页');
    
  } catch (error) {
    console.error('删除标签页失败:', error);
    showToast('删除失败，请重试');
  }
}

/**
 * 更新会话名称中的标签页数量
 * @param {Object} session - 会话对象
 */
function updateSessionNameCount(session) {
  // 匹配默认命名格式：日期 时间（X个标签页）
  const pattern = /^(\d{4}\/\d{1,2}\/\d{1,2}\s+\d{2}:\d{2})（\d+个标签页）$/;
  const match = session.name.match(pattern);
  
  if (match) {
    // 更新名称中的标签页数量
    session.name = `${match[1]}（${session.tabs.length}个标签页）`;
  }
}

// ========== 搜索和筛选 ==========

/**
 * 刷新会话列表（保持当前搜索状态）
 */
function refreshSessionList() {
  const keyword = searchInput.value.trim().toLowerCase();
  
  if (!keyword) {
    // 无搜索词，直接渲染全部
    renderSessions(allSessions, '', null);
    return;
  }
  
  // 有搜索词，重新筛选
  filterSessions();
}

/**
 * 根据搜索关键词筛选会话
 */
function filterSessions() {
  const keyword = searchInput.value.trim().toLowerCase();
  
  // 如果没有关键词，显示所有会话
  if (!keyword) {
    renderSessions(allSessions, '', null);
    return;
  }
  
  // 计算匹配信息
  const matchInfo = new Map();
  
  allSessions.forEach(session => {
    const sessionMatch = {
      nameMatched: session.name.toLowerCase().includes(keyword),
      matchedTabIndexes: []
    };
    
    // 检查每个标签页是否匹配
    session.tabs.forEach((tab, index) => {
      const titleMatch = tab.title.toLowerCase().includes(keyword);
      const urlMatch = tab.url.toLowerCase().includes(keyword);
      if (titleMatch || urlMatch) {
        sessionMatch.matchedTabIndexes.push(index);
      }
    });
    
    // 如果会话名称匹配或有标签页匹配，记录该会话
    if (sessionMatch.nameMatched || sessionMatch.matchedTabIndexes.length > 0) {
      matchInfo.set(session.id, sessionMatch);
    }
  });
  
  // 筛选匹配的会话
  const filtered = allSessions.filter(session => matchInfo.has(session.id));
  
  // 渲染结果
  renderSessions(filtered, keyword, matchInfo);
}

// ========== 渲染函数 ==========

/**
 * 渲染会话列表
 * @param {Array} sessions - 要渲染的会话数组
 * @param {string} keyword - 搜索关键词
 * @param {Map} matchInfo - 匹配信息
 */
function renderSessions(sessions, keyword = '', matchInfo = null) {
  // 如果没有会话，显示空状态
  if (sessions.length === 0) {
    sessionsList.innerHTML = `
      <div class="empty-state">
        ${keyword ? '没有找到匹配的会话' : '暂无保存的会话，点击上方按钮开始保存'}
      </div>
    `;
    return;
  }
  
  // 生成会话卡片HTML
  sessionsList.innerHTML = sessions.map(session => {
    const date = new Date(session.createdAt);
    const timeStr = date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // 获取匹配信息
    const sessionMatch = matchInfo ? matchInfo.get(session.id) : null;
    const hasTabMatch = sessionMatch && sessionMatch.matchedTabIndexes.length > 0;
    
    // 判断是否需要自动展开（有标签页匹配时自动展开）
    const shouldExpand = hasTabMatch;
    
    // 计算显示数量文本
    let countText = `${session.tabs.length} 个标签页`;
    if (hasTabMatch) {
      countText = `匹配 ${sessionMatch.matchedTabIndexes.length} 个标签页`;
    }
    
    // 高亮会话名称
    const displayName = keyword && sessionMatch && sessionMatch.nameMatched
      ? highlightText(session.name, keyword)
      : escapeHtml(session.name);
    
    // 生成标签页预览内容（如果需要展开）
    let previewHtml = '';
    let previewStyle = 'display: none;';
    let toggleBtnText = '展开详情';
    
    if (shouldExpand) {
      toggleBtnText = '收起详情';
      previewStyle = 'display: block;';
      
      // 只显示匹配的标签页
      const matchedTabs = sessionMatch.matchedTabIndexes.map((originalIndex, displayIndex) => {
        const tab = session.tabs[originalIndex];
        return `
          <div class="tab-item" data-index="${originalIndex}">
            <img class="tab-icon" src="${tab.favIconUrl || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22><rect fill=%22%23ddd%22 width=%2216%22 height=%2216%22/></svg>'}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22><rect fill=%22%23ddd%22 width=%2216%22 height=%2216%22/></svg>'">
            <span class="tab-title" data-url="${escapeHtml(tab.url)}" title="${escapeHtml(tab.url)}">${highlightText(tab.title, keyword)}</span>
            <button class="tab-remove" title="删除此标签页">×</button>
          </div>
        `;
      }).join('');
      
      previewHtml = matchedTabs;
    }
    
    return `
      <div class="session-card" data-id="${session.id}">
        <div class="session-header">
          <span class="session-name">${displayName}</span>
          <button class="session-add-btn" title="添加当前页面到此会话">+添加</button>
        </div>
        <div class="session-meta">
          <span>保存时间：${timeStr}</span>
          <span>${countText}</span>
        </div>
        <div class="session-actions">
          <button class="btn btn-sm btn-toggle">${toggleBtnText}</button>
          <button class="btn btn-sm btn-restore">全部恢复</button>
          <button class="btn btn-sm btn-delete">删除</button>
        </div>
        <div class="tabs-preview" style="${previewStyle}">${previewHtml}</div>
      </div>
    `;
  }).join('');
}

/**
 * 切换标签页预览的展开/收起状态
 * @param {string} sessionId - 会话ID
 * @param {HTMLElement} btn - 触发按钮
 */
function toggleTabsPreview(sessionId, btn) {
  const card = btn.closest('.session-card');
  const preview = card.querySelector('.tabs-preview');
  
  // 如果预览区域是隐藏的，则展开
  if (preview.style.display === 'none') {
    const session = allSessions.find(s => s.id === sessionId);
    if (!session) return;
    
    // 生成标签页列表HTML，使用 data-url 和 data-index 属性
    preview.innerHTML = session.tabs.map((tab, index) => `
      <div class="tab-item" data-index="${index}">
        <img class="tab-icon" src="${tab.favIconUrl || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22><rect fill=%22%23ddd%22 width=%2216%22 height=%2216%22/></svg>'}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22><rect fill=%22%23ddd%22 width=%2216%22 height=%2216%22/></svg>'">
        <span class="tab-title" data-url="${escapeHtml(tab.url)}" title="${escapeHtml(tab.url)}">${escapeHtml(tab.title)}</span>
        <button class="tab-remove" title="删除此标签页">×</button>
      </div>
    `).join('');
    
    preview.style.display = 'block';
    btn.textContent = '收起详情';
  } else {
    // 收起预览
    preview.style.display = 'none';
    btn.textContent = '展开详情';
  }
}

// ========== 工具函数 ==========

/**
 * 显示Toast提示
 * @param {string} message - 提示消息
 */
function showToast(message) {
  // 移除已存在的toast
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  // 创建新的toast
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // 3秒后自动移除
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

/**
 * 转义HTML特殊字符，防止XSS攻击
 * @param {string} text - 原始文本
 * @returns {string} 转义后的文本
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 显示自定义确认弹窗
 * @param {string} title - 弹窗标题
 * @param {string} message - 提示消息
 * @returns {Promise<boolean>} 用户是否确认
 */
function showConfirm(title, message) {
  return new Promise((resolve) => {
    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    
    // 创建弹窗
    overlay.innerHTML = `
      <div class="confirm-dialog">
        <div class="confirm-title">${escapeHtml(title)}</div>
        <div class="confirm-message">${escapeHtml(message)}</div>
        <div class="confirm-actions">
          <button class="confirm-btn confirm-cancel">取消</button>
          <button class="confirm-btn confirm-ok">确定</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // 取消按钮
    overlay.querySelector('.confirm-cancel').addEventListener('click', () => {
      overlay.remove();
      resolve(false);
    });
    
    // 确定按钮
    overlay.querySelector('.confirm-ok').addEventListener('click', () => {
      overlay.remove();
      resolve(true);
    });
    
    // 点击遮罩层关闭
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
        resolve(false);
      }
    });
  });
}

// ========== 添加当前页面到会话 ==========

/**
 * 显示会话选择弹窗
 */
async function showSessionSelector() {
  // 获取当前页面信息
  const currentPage = await getCurrentPage();
  
  // 检查页面是否有效
  if (!currentPage || !isValidPage(currentPage.url)) {
    showToast('当前页面无法添加');
    return;
  }
  
  // 检查是否有可用会话
  if (allSessions.length === 0) {
    showToast('请先保存一个会话');
    return;
  }
  
  // 创建遮罩层
  const overlay = document.createElement('div');
  overlay.className = 'session-selector';
  
  // 创建弹窗
  overlay.innerHTML = `
    <div class="session-selector-dialog">
      <div class="session-selector-title">添加当前页面到会话</div>
      <div class="session-selector-page" title="${escapeHtml(currentPage.url)}">${escapeHtml(currentPage.title)}</div>
      <div class="session-selector-list">
        ${allSessions.map(session => `
          <div class="session-selector-item" data-session-id="${session.id}">
            <span class="session-selector-item-name">${escapeHtml(session.name)}</span>
            <span class="session-selector-item-count">${session.tabs.length} 个标签页</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // 点击会话项
  overlay.querySelectorAll('.session-selector-item').forEach(item => {
    item.addEventListener('click', () => {
      const sessionId = item.dataset.sessionId;
      overlay.remove();
      addCurrentPageToSession(sessionId);
    });
  });
  
  // 点击遮罩层关闭
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
}

/**
 * 将当前页面添加到指定会话
 * @param {string} sessionId - 会话ID
 */
async function addCurrentPageToSession(sessionId) {
  const session = allSessions.find(s => s.id === sessionId);
  if (!session) return;
  
  // 获取当前页面信息
  const currentPage = await getCurrentPage();
  
  // 检查页面是否有效
  if (!currentPage || !isValidPage(currentPage.url)) {
    showToast('当前页面无法添加');
    return;
  }
  
  // 检查页面是否已存在于会话中
  const existingTab = session.tabs.find(tab => tab.url === currentPage.url);
  if (existingTab) {
    showToast('该页面已在此会话中');
    return;
  }
  
  try {
    // 添加到会话
    session.tabs.push({
      title: currentPage.title,
      url: currentPage.url,
      favIconUrl: currentPage.favIconUrl || null
    });
    
    // 更新会话名称中的标签页数量
    updateSessionNameCount(session);
    
    // 保存到存储
    await saveSessions();
    
    // 重新渲染列表
    refreshSessionList();
    
    showToast(`已添加到「${session.name}」`);
    
  } catch (error) {
    console.error('添加页面失败:', error);
    showToast('添加失败，请重试');
  }
}

/**
 * 获取当前活动标签页信息
 * @returns {Object|null} 标签页信息
 */
async function getCurrentPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return null;
    
    return {
      title: tab.title || '无标题',
      url: tab.url,
      favIconUrl: tab.favIconUrl || null
    };
  } catch (error) {
    console.error('获取当前页面失败:', error);
    return null;
  }
}

/**
 * 检查页面URL是否有效
 * @param {string} url - 页面URL
 * @returns {boolean} 是否有效
 */
function isValidPage(url) {
  if (!url) return false;
  
  // 排除系统页面
  const invalidPrefixes = [
    'chrome://',
    'chrome-extension://',
    'edge://',
    'about:blank',
    'chrome-search://',
    'devtools://'
  ];
  
  return !invalidPrefixes.some(prefix => url.startsWith(prefix));
}

/**
 * 高亮文本中的关键词
 * @param {string} text - 原始文本
 * @param {string} keyword - 关键词
 * @returns {string} 高亮后的HTML
 */
function highlightText(text, keyword) {
  if (!keyword) return escapeHtml(text);
  
  // 转义原始文本
  const escapedText = escapeHtml(text);
  const escapedKeyword = escapeHtml(keyword);
  
  // 使用正则表达式进行大小写不敏感的替换
  const regex = new RegExp(`(${escapeRegExp(escapedKeyword)})`, 'gi');
  return escapedText.replace(regex, '<span class="highlight">$1</span>');
}

/**
 * 转义正则表达式特殊字符
 * @param {string} string - 原始字符串
 * @returns {string} 转义后的字符串
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
