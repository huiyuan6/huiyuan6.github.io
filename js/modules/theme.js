/**
 * theme.js — 主题切换与持久化（design.md D4）
 * 契约：localStorage key 'hy-theme'（值仅 'light'|'dark'），html[data-theme] 属性承载主题态。
 * FOUC：head 内联同步脚本已在首帧前设置 data-theme；本模块 initTheme 与其幂等
 *   （同源读取 localStorage + matchMedia，重复应用同一值无闪烁），只负责切换/持久化/系统跟随。
 * 降级：localStorage 不可用（隐私模式等）→ try/catch 包裹，会话内生效、不记忆、不报错（NFR-14）。
 */
(function (global) {
  'use strict';

  var KEY = 'hy-theme';

  /** 安全获取宿主 localStorage（访问本身可能抛异常，如受限环境） */
  function safeStorage() {
    try { return global.localStorage || null; } catch (e) { return null; }
  }

  /** 读取持久化主题：垃圾值 → null；存储抛异常 → null 不炸（FR-03/NFR-14） */
  function getStoredTheme(storage) {
    try {
      var v = storage && storage.getItem(KEY);
      return v === 'light' || v === 'dark' ? v : null;
    } catch (e) { return null; }
  }

  /** 三态解析：显式记忆优先，否则跟随系统偏好（四种组合见 design.md 1.3.6 用例） */
  function resolveTheme(stored, prefersDark) {
    if (stored === 'light' || stored === 'dark') return stored;
    return prefersDark ? 'dark' : 'light';
  }

  /** 应用主题：设置 data-theme + 同步 #theme-toggle 的 aria-label（日/月图标显隐由 CSS 按 data-theme 处理） */
  function applyTheme(root, theme) {
    if (!root) return;
    root.setAttribute('data-theme', theme);
    var btn = root.querySelector ? root.querySelector('#theme-toggle') : null;
    if (btn) btn.setAttribute('aria-label', theme === 'dark' ? '切换到亮色主题' : '切换到暗色主题');
  }

  /** 取反当前主题 → 应用 → 持久化（try/catch）；返回切换后的主题 */
  function toggleTheme(root, storage) {
    if (!root && typeof document !== 'undefined') root = document.documentElement;
    storage = storage || safeStorage();
    var current = root && root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    var next = current === 'dark' ? 'light' : 'dark';
    applyTheme(root, next);
    try { if (storage) storage.setItem(KEY, next); } catch (e) { /* 不可用则仅会话内生效 */ }
    return next;
  }

  /**
   * 初始化：读取 → 解析 → 应用（与内联脚本幂等）→ 绑定切换按钮 → 无记忆时跟随系统偏好。
   * 幂等：data-hy-theme-init 标记防重复绑定；opts.storage 可注入 mock 存储（测试）。
   * @returns {string} 解析出的当前主题
   */
  function initTheme(doc, opts) {
    doc = doc || (typeof document !== 'undefined' ? document : null);
    if (!doc) return 'light';
    var o = opts || {};
    var storage = o.storage || safeStorage();
    var root = doc.documentElement;
    var view = doc.defaultView || global;
    var stored = getStoredTheme(storage);
    var prefersDark = false;
    try { prefersDark = !!(view.matchMedia && view.matchMedia('(prefers-color-scheme: dark)').matches); } catch (e) {}
    var theme = resolveTheme(stored, prefersDark);
    applyTheme(root, theme); /* 与 head 内联脚本结果一致，无闪烁 */

    if (root.getAttribute('data-hy-theme-init') === '1') return theme;
    root.setAttribute('data-hy-theme-init', '1');

    var btn = doc.getElementById('theme-toggle');
    if (btn) btn.addEventListener('click', function () { toggleTheme(root, storage); });

    /* 无记忆时实时跟随系统切换；一旦手动切换过（有记忆）则不再跟随（D4 第 3 点） */
    try {
      if (stored === null && view.matchMedia) {
        var mq = view.matchMedia('(prefers-color-scheme: dark)');
        var onChange = function (e) {
          if (getStoredTheme(storage) !== null) return; /* 已有记忆，停止跟随 */
          applyTheme(root, e.matches ? 'dark' : 'light');
        };
        if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
        else if (typeof mq.addListener === 'function') mq.addListener(onChange); /* 旧版 Safari */
      }
    } catch (e) {}
    return theme;
  }

  var api = {
    getStoredTheme: getStoredTheme, resolveTheme: resolveTheme, applyTheme: applyTheme,
    toggleTheme: toggleTheme, initTheme: initTheme
  };

  /* UMD-lite：Node 测试走 module.exports，浏览器挂全局命名空间 HY */
  if (typeof module === 'object' && module.exports) { module.exports = api; }
  global.HY = global.HY || {};
  Object.assign(global.HY, api);
})(typeof window !== 'undefined' ? window : globalThis);
