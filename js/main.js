/**
 * main.js — 编排入口（无可测业务逻辑，只装配，design.md D1 渲染管线）
 * 流水线：读 MEMBER_SITE_DATA → validate（坏条目隔离警告）→ 卡片重渲染 + 统计联动
 *   → 友链并集合并 → 主题/手风琴/reveal/导航绑定 → 页脚年份回填。
 * 稳健性：每个步骤独立 try/catch——任何模块异常仅 console.warn，不阻塞其余模块
 *   （如 data.js 完全未加载 → 保留静态 noscript 内容，页面照常可用）。
 * 幂等：init 只执行一次（defer 正常时序 + DOMContentLoaded 兜底双路径防重复）。
 */
(function (global) {
  'use strict';

  /** 安全读取数据全局变量：脚本加载失败/未定义 → null，不抛 ReferenceError */
  function readSiteData(globalObj) {
    try { return (globalObj && globalObj.MEMBER_SITE_DATA) || null; } catch (e) { return null; }
  }

  function warn() {
    if (global.console && typeof global.console.warn === 'function') global.console.warn.apply(global.console, arguments);
  }

  /** 步骤隔离执行器：异常仅警告不中断 */
  function step(name, fn) {
    try { fn(); } catch (e) { warn('[init] ' + name + ' 模块初始化失败（已跳过，不影响其他功能）：', e); }
  }

  /** 数据联动（D1 算法：① 全量重渲染 ② 统计联动 ⑤ 友链并集合并） */
  function initData(doc, HY) {
    var report = HY.validateEntries(readSiteData(global));
    /* 坏条目逐条隔离警告（FR-17），其余条目照常渲染 */
    for (var i = 0; i < report.invalid.length; i++) {
      warn('[data] 无效条目 #' + report.invalid[i].index + '：' + report.invalid[i].errors.join('；'));
    }
    var valid = report.valid;
    var list = doc.getElementById('partner-list');
    if (valid.length >= 1 && list) {
      HY.renderSiteCards(list, valid); /* data.js 为唯一真源：静态卡片 → 数据驱动卡片 */
      HY.updateStat(doc.getElementById('stat-sites'), valid.length);
    } else if (valid.length === 0) {
      /* 数据缺失/全非法：不碰 DOM，保留静态 noscript 内容（不白屏、不报错） */
      warn('[data] MEMBER_SITE_DATA 缺失或无有效条目，已保留静态内容');
    }
    /* 友链合并：valid 为空时结果=静态原样（基线永不删除），安全无副作用 */
    var footer = doc.getElementById('footer-links');
    if (footer) HY.syncFooterLinks(footer, valid);
    /* 分类/套餐统计：DOM 计数联动（当前 6/4；HTML 若增删卡片统计自动跟随） */
    var main = doc.getElementById('main');
    if (main) {
      HY.updateStat(doc.getElementById('stat-categories'), HY.countElements(main, '.category-card'));
      HY.updateStat(doc.getElementById('stat-packages'), HY.countElements(main, '.hot-card'));
    }
  }

  /** 入口：装配全部模块；重复调用无副作用 */
  function init() {
    if (init.done) return;
    init.done = true;
    var doc = global.document;
    if (!doc) return;
    var HY = global.HY || {};
    step('data', function () { initData(doc, HY); });
    step('theme', function () { HY.initTheme(doc); });
    step('accordion', function () { HY.initAccordion(); });
    step('reveal', function () { HY.initReveal(); });
    step('nav', function () { HY.initNav(); });
    step('footer-year', function () { HY.setFooterYear(doc.getElementById('footer-year')); });
  }
  init.done = false;

  var api = { readSiteData: readSiteData, init: init };

  /* UMD-lite：Node 测试走 module.exports，浏览器挂全局命名空间 HY（扁平注册） */
  if (typeof module === 'object' && module.exports) { module.exports = api; }
  global.HY = global.HY || {};
  Object.assign(global.HY, api);

  /* defer 脚本执行时 readyState 已是 interactive（DOM 就绪）；晚加载/测试场景兜底 */
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
