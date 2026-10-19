/**
 * accordion.js — FAQ 手风琴渐进增强（FR-10，NFR-07）
 * 底线：主线用原生 <details>，禁 JS / JS 失败时手风琴原生可用（点 summary 展开收起）。
 * 本模块仅做体验增强：
 *   ① 互斥单开——打开任一项自动收起其他项；
 *   ② is-open 状态类同步——供 CSS 做 .faq-item__answer 展开过渡动画（状态类钩子，动画归 CSS）。
 * 实现注意：details 的 toggle 事件不冒泡，故逐项直接绑定（容器数量小，无性能问题）。
 */
(function (global) {
  'use strict';

  /**
   * 互斥单开（纯 DOM 操作，可独立调用或事件驱动）。
   * @param {Element} container FAQ 容器
   * @param {HTMLDetailsElement} [keepOpen] 要保留展开的项；缺省时保留容器内第一个展开项
   */
  function enforceSingleOpen(container, keepOpen) {
    if (!container) return;
    var items = container.querySelectorAll('details');
    var kept = false;
    for (var i = 0; i < items.length; i++) {
      var d = items[i];
      d.classList.toggle('is-open', !!d.open); /* 状态类同步（CSS 动画钩子） */
      if (d === keepOpen && d.open) { kept = true; continue; }
      if (d.open) {
        if (!kept && !keepOpen) { kept = true; continue; } /* 无指定保留项：保留第一个展开项 */
        d.open = false;
        d.classList.remove('is-open');
      }
    }
  }

  /**
   * 绑定 FAQ 容器：toggle 事件驱动互斥单开。幂等（data-hy-faq-bound 防重复绑定）。
   * @param {Element} container #faq 或 .faq-list 容器
   */
  function initFaq(container) {
    if (!container || container.getAttribute('data-hy-faq-bound') === '1') return;
    container.setAttribute('data-hy-faq-bound', '1');
    var items = container.querySelectorAll('details');
    for (var i = 0; i < items.length; i++) {
      (function (d) {
        d.addEventListener('toggle', function () {
          if (d.open) enforceSingleOpen(container, d);
        });
      })(items[i]);
    }
  }

  /** 入口（任务契约名，无参）：定位页面 FAQ 容器并绑定；容器缺失静默跳过（原生保底仍在） */
  function initAccordion() {
    if (typeof document === 'undefined') return;
    initFaq(document.getElementById('faq') || document.querySelector('.faq-list'));
  }

  var api = { enforceSingleOpen: enforceSingleOpen, initFaq: initFaq, initAccordion: initAccordion };

  /* UMD-lite：Node 测试走 module.exports，浏览器挂全局命名空间 HY */
  if (typeof module === 'object' && module.exports) { module.exports = api; }
  global.HY = global.HY || {};
  Object.assign(global.HY, api);
})(typeof window !== 'undefined' ? window : globalThis);
