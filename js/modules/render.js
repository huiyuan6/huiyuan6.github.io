/**
 * render.js — HTML 字符串构建（纯函数）+ DOM 装配薄壳（design.md 1.2.2 分层规则）
 * 安全：所有 innerHTML 路径必经 escapeHtml（XSS 防护，FR-07）；url 虽经 validate
 *   校验为 http(s)，属性上下文仍统一转义（引号/&，防御纵深）。
 * 一致性：卡片/友链结构与 noscript 静态基线逐节点对齐（D1 语义一致），
 *   默认头像 = 站名首字符（与静态基线「运/好/福/券/聚/号」一致）。
 */
(function (global) {
  'use strict';

  /** HTML 实体化 & < > " '（文本与属性上下文通用），中文原样保留 */
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** 头像：icon 合法（validate 净化后 ≤4 字符）则用 icon，否则站名首字符 */
  function avatarOf(entry) {
    var icon = entry && typeof entry.icon === 'string' ? entry.icon.trim() : '';
    if (icon) return icon;
    var name = entry && typeof entry.name === 'string' ? entry.name : '';
    return name.charAt(0) || '站';
  }

  /** 站点卡片 HTML（纯函数，结构对齐静态 .partner-card） */
  function siteCardHTML(entry) {
    var e = entry || {};
    return '<li class="partner-card">' +
      '<span class="partner-card__avatar" aria-hidden="true">' + escapeHtml(avatarOf(e)) + '</span>' +
      '<h3 class="partner-card__name">' + escapeHtml(e.name) + '</h3>' +
      '<p class="partner-card__desc">' + escapeHtml(e.desc) + '</p>' +
      '<a class="partner-card__link" href="' + escapeHtml(e.url) + '" target="_blank" rel="noopener noreferrer">访问站点</a>' +
      '</li>';
  }

  /** 友链 HTML（纯函数，结构对齐静态 .footer-link） */
  function footerLinkHTML(entry) {
    var e = entry || {};
    return '<li class="footer-link"><a href="' + escapeHtml(e.url) + '" target="_blank" rel="noopener noreferrer">' +
      escapeHtml(e.name) + '</a></li>';
  }

  /** 从容器解析既有链接为 LinkEntry[]（静态基线快照，供 merge 的 base） */
  function parseLinks(container) {
    var out = [], anchors = container.querySelectorAll('a[href]');
    for (var i = 0; i < anchors.length; i++) {
      out.push({ name: (anchors[i].textContent || '').trim(), url: anchors[i].getAttribute('href') || '' });
    }
    return out;
  }

  /** 合作站点卡片全量重渲染（data.js 为唯一真源，FR-07/15；entries 空时不调用本函数） */
  function renderSiteCards(container, entries) {
    container.innerHTML = (entries || []).map(siteCardHTML).join('');
  }

  /** 页脚友链并集合并重建（基线永不删除，D1 规则③）；返回合并结果供测试断言 */
  function syncFooterLinks(container, entries) {
    var mergeFn = global.HY && typeof global.HY.mergeLinkLists === 'function' ? global.HY.mergeLinkLists : null;
    var merged = mergeFn ? mergeFn(parseLinks(container), entries || []) : parseLinks(container);
    container.innerHTML = merged.map(footerLinkHTML).join('');
    return merged;
  }

  /** 统计数字写入：默认 rAF 400ms count-up（easeOutCubic）；reduced-motion / opts.animate=false / 无 rAF 直显（FR-05） */
  function updateStat(el, value, opts) {
    if (!el) return;
    var num = Number(value) || 0;
    var o = opts || {};
    var reduce = false;
    try { reduce = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}
    if (o.animate === false || reduce || typeof global.requestAnimationFrame !== 'function') {
      el.textContent = String(num);
      return;
    }
    if (el.__hyStatRaf) global.cancelAnimationFrame(el.__hyStatRaf); /* 防重入：取消同元素未完成动画 */
    var start = null, dur = 400;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      el.textContent = String(Math.round(num * (1 - Math.pow(1 - p, 3))));
      el.__hyStatRaf = p < 1 ? global.requestAnimationFrame(step) : null;
    }
    el.__hyStatRaf = global.requestAnimationFrame(step);
  }

  /** 统计选择器匹配数（DOM 只读查询；空容器 → 0） */
  function countElements(root, selector) {
    return root && typeof root.querySelectorAll === 'function' ? root.querySelectorAll(selector).length : 0;
  }

  /** 页脚年份回填（默认当前年份，可传定制年便于测试） */
  function setFooterYear(el, year) {
    if (el) el.textContent = String(typeof year === 'number' ? year : new Date().getFullYear());
  }

  var api = {
    escapeHtml: escapeHtml, siteCardHTML: siteCardHTML, footerLinkHTML: footerLinkHTML,
    renderSiteCards: renderSiteCards, syncFooterLinks: syncFooterLinks,
    updateStat: updateStat, countElements: countElements, setFooterYear: setFooterYear,
    /* 任务契约别名（同一实现，双名便于测试同事引用） */
    createCard: siteCardHTML, renderPartnerCards: renderSiteCards,
    renderFooterLinks: syncFooterLinks, renderStats: updateStat
  };

  /* UMD-lite：Node 测试走 module.exports，浏览器挂全局命名空间 HY */
  if (typeof module === 'object' && module.exports) { module.exports = api; }
  global.HY = global.HY || {};
  Object.assign(global.HY, api);
})(typeof window !== 'undefined' ? window : globalThis);
