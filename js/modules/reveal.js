/**
 * reveal.js — 滚动入场显现（FR-19，NFR-07）
 * CSS 契约（与 D-2 对齐）：[data-reveal] 的初始隐藏态选择器为 `.js [data-reveal]`——
 *   即只有 <html> 带 js 类时才隐藏内容。因此必须在 reveal.js 顶层（加载顺序中 main.js
 *   之前、最早的可行位置）同步添加该类：JS 加载失败 → 无 js 类 → 内容永不隐藏。
 * 显现触发：元素加 is-visible 类，过渡动画（opacity/translateY）完全由 CSS 负责。
 * 降级：无 IntersectionObserver（旧浏览器）或 prefers-reduced-motion → 全部立即可见。
 */
(function (global) {
  'use strict';

  /* 尽早标注 JS 可用——defer 时序下先于 main.js 与首屏交互，CSS 据此启用 reveal 初始态 */
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.classList.add('js');
  }

  /** 是否偏好减少动效（matchMedia 不可用时按无偏好处理） */
  function prefersReducedMotion() {
    try {
      return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { return false; }
  }

  /**
   * 观察 root 内 [data-reveal]：进入视口 → 加 is-visible（一次性，unobserve 防重复触发）。
   * @param {Document|Element} root 默认 document（全页）；传容器可做局部测试
   */
  function setupReveal(root) {
    root = root || (typeof document !== 'undefined' ? document : null);
    if (!root || typeof root.querySelectorAll !== 'function') return;
    var els = root.querySelectorAll('[data-reveal]');
    if (!els.length) return;

    /* 降级路径：无 IO 或减少动效 → 立即全部呈现（不依赖任何观察器） */
    if (typeof global.IntersectionObserver !== 'function' || prefersReducedMotion()) {
      for (var k = 0; k < els.length; k++) els[k].classList.add('is-visible');
      return;
    }

    var io = new global.IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          entries[i].target.classList.add('is-visible');
          io.unobserve(entries[i].target); /* 一次性显现，不随滚动反复触发 */
        }
      }
    }, { threshold: 0 }); /* 元素任一部分进入视口即触发，首屏元素立即入场 */

    for (var j = 0; j < els.length; j++) io.observe(els[j]);
  }

  /** 入口（任务契约名，无参）：全页观察 */
  function initReveal() {
    setupReveal(typeof document !== 'undefined' ? document : null);
  }

  var api = { setupReveal: setupReveal, initReveal: initReveal };

  /* UMD-lite：Node 测试走 module.exports，浏览器挂全局命名空间 HY */
  if (typeof module === 'object' && module.exports) { module.exports = api; }
  global.HY = global.HY || {};
  Object.assign(global.HY, api);
})(typeof window !== 'undefined' ? window : globalThis);
