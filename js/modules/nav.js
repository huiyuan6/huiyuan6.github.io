/**
 * nav.js — 导航交互（FR-01/02，NFR-13）
 * ① 移动端汉堡：#nav-toggle 开合 #site-nav-links（aria-expanded + aria-label 翻转、
 *    body nav-open 类 + 滚动锁、Esc 关闭并归还焦点、点击导航外区域关闭、
 *    点击菜单内链接后自动收起、视口 ≥768px 时自动重置）；
 * ② 锚点焦点管理：点击页内锚点后 focus 目标（preventScroll 避免打断 CSS 平滑滚动）；
 * ③ 回到顶部：#back-top 滚动超过约一屏加 is-visible（显隐交给 CSS），点击经
 *    原生锚点 + html{scroll-behavior:smooth} 平滑回顶。
 */
(function (global) {
  'use strict';

  var DESKTOP = '(min-width: 768px)'; /* 断点阈值与 CSS/设计文档一致（D-2 契约） */

  function isDesktop(view) {
    try { return !!(view && view.matchMedia && view.matchMedia(DESKTOP).matches); } catch (e) { return false; }
  }

  /** 汉堡菜单开合；容器级标记幂等，锚点缺失静默跳过 */
  function initMobileNav(doc) {
    doc = doc || (typeof document !== 'undefined' ? document : null);
    if (!doc) return;
    var toggle = doc.getElementById('nav-toggle');
    var links = doc.getElementById('site-nav-links');
    if (!toggle || !links || toggle.getAttribute('data-hy-nav-bound') === '1') return;
    toggle.setAttribute('data-hy-nav-bound', '1');
    var body = doc.body;
    var view = doc.defaultView || global;

    function isOpen() { return toggle.getAttribute('aria-expanded') === 'true'; }
    function setOpen(open) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? '关闭导航菜单' : '打开导航菜单');
      if (body) {
        body.classList.toggle('nav-open', open); /* 供 CSS 全宽下拉布局 */
        body.style.overflow = open ? 'hidden' : ''; /* 滚动锁双保险：不依赖 CSS 实现到位 */
      }
    }

    toggle.addEventListener('click', function () { setOpen(!isOpen()); });
    /* 菜单内点击链接 → 锚点跳转后自动收起，不滞留遮罩态 */
    links.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('a')) setOpen(false);
    });
    /* Esc 关闭并归还焦点给汉堡按钮（键盘可达性） */
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) { setOpen(false); toggle.focus(); }
    });
    /* 点击导航区域外关闭（汉堡自身在导航内，不误触） */
    doc.addEventListener('click', function (e) {
      if (isOpen() && e.target && e.target.closest && !e.target.closest('.site-nav')) setOpen(false);
    });
    /* 进入桌面态自动重置（清滚动锁，避免残留 overflow:hidden） */
    try {
      var mq = view.matchMedia(DESKTOP);
      var onMQ = function () { if (isDesktop(view)) setOpen(false); };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onMQ);
      else if (typeof mq.addListener === 'function') mq.addListener(onMQ);
    } catch (e) {}
  }

  /** 锚点点击 → focus 目标板块（preventScroll:true 让 CSS smooth 滚动不被打断）；documentElement 级标记幂等 */
  function initSmoothScroll(doc) {
    doc = doc || (typeof document !== 'undefined' ? document : null);
    if (!doc) return;
    var mark = doc.documentElement;
    if (!mark || mark.getAttribute('data-hy-smooth-bound') === '1') return;
    mark.setAttribute('data-hy-smooth-bound', '1');
    doc.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (href.length < 2) return; /* 跳过纯 '#' */
      var target = doc.getElementById(href.slice(1));
      if (target && typeof target.focus === 'function') target.focus({ preventScroll: true });
    });
  }

  /** #back-top 显隐：滚动超过约一屏加 is-visible（初始态与过渡由 CSS 控制，无 CSS 时恒可见无害降级） */
  function initBackTop(doc) {
    doc = doc || (typeof document !== 'undefined' ? document : null);
    if (!doc) return;
    var btn = doc.getElementById('back-top');
    var view = doc.defaultView || global;
    if (!btn || !view || btn.getAttribute('data-hy-backtop-bound') === '1') return;
    btn.setAttribute('data-hy-backtop-bound', '1');
    function onScroll() {
      var y = view.scrollY || view.pageYOffset || 0;
      btn.classList.toggle('is-visible', y > (view.innerHeight || 0) * 0.8);
    }
    view.addEventListener('scroll', onScroll, { passive: true }); /* passive：不阻塞滚动线程 */
    onScroll(); /* 初始即校准（页面可能加载在中部） */
  }

  /** 入口（任务契约名，无参）：装配三件导航能力 */
  function initNav() {
    if (typeof document === 'undefined') return;
    initMobileNav(document);
    initSmoothScroll(document);
    initBackTop(document);
  }

  var api = { initMobileNav: initMobileNav, initSmoothScroll: initSmoothScroll, initBackTop: initBackTop, initNav: initNav };

  /* UMD-lite：Node 测试走 module.exports，浏览器挂全局命名空间 HY */
  if (typeof module === 'object' && module.exports) { module.exports = api; }
  global.HY = global.HY || {};
  Object.assign(global.HY, api);
})(typeof window !== 'undefined' ? window : globalThis);
