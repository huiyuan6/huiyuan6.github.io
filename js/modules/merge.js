/**
 * merge.js — 友链合并（纯函数，无 DOM，双端可测）
 * 职责：URL 归一化去重键 + 页脚友链并集合并（design.md D1 规则③）。
 * 合并语义（刻意的不对称，防御 FR-12「6 条基线 URL 逐字符锁定」）：
 *   - base（静态基线）顺序保持、条目永不删除；
 *   - 同 URL（归一化后）时 name/desc/url 以 override（data.js）为准，位置仍在 base 处；
 *   - override 新增条目按其顺序追加到末尾。
 */
(function (global) {
  'use strict';

  /**
   * 生成去重键：小写协议+主机（WHATWG URL 规范化自动完成）、去 pathname 尾斜杠；
   * search/hash 原样参与比较；协议不同（http≠https）不合并。
   * 非法/非字符串输入 → 字符串原样返回（不抛错，保证可作 Map key）。
   * @param {string} url
   * @returns {string}
   */
  function normalizeUrl(url) {
    if (typeof url !== 'string') return url == null ? '' : String(url);
    var trimmed = url.trim();
    if (!trimmed) return '';
    try {
      var u = new URL(trimmed);
      var path = u.pathname.length > 1 ? u.pathname.replace(/\/+$/, '') : '';
      return u.protocol + '//' + u.host + path + u.search + u.hash;
    } catch (e) {
      return trimmed; /* 解析失败：原样返回（仅作 key，消费方已在上游校验过 URL） */
    }
  }

  /**
   * 并集合并（D1）。输入输出均为 LinkEntry 形状 {name, url, desc?}；
   * 非数组入参按空数组处理，坏条目（非对象/无 url）跳过，绝不抛错。
   * @param {Array} base 静态基线（永不删除）
   * @param {Array} override data.js 有效条目（值优先）
   * @returns {Array} 合并结果（浅拷贝对象，不污染输入）
   */
  function mergeLinkLists(base, override) {
    var result = [];
    var pos = Object.create(null); /* 归一化 URL → result 下标 */
    function add(entry, isOverride) {
      if (!entry || typeof entry !== 'object' || typeof entry.url !== 'string' || !entry.url.trim()) return;
      var key = normalizeUrl(entry.url);
      if (!key) return;
      var at = pos[key];
      if (at === undefined) {
        pos[key] = result.length;
        result.push({
          name: typeof entry.name === 'string' ? entry.name : '',
          url: entry.url,
          desc: typeof entry.desc === 'string' ? entry.desc : undefined
        });
      } else if (isOverride) {
        /* 同 URL：data.js 值优先（name 非空才覆盖），位置保持 base 的槽位 */
        var cur = result[at];
        if (typeof entry.name === 'string' && entry.name) cur.name = entry.name;
        if (typeof entry.desc === 'string') cur.desc = entry.desc;
        cur.url = entry.url;
      }
    }
    var b = Array.isArray(base) ? base : [];
    var o = Array.isArray(override) ? override : [];
    for (var i = 0; i < b.length; i++) add(b[i], false);
    for (var j = 0; j < o.length; j++) add(o[j], true);
    return result;
  }

  var api = {
    normalizeUrl: normalizeUrl,
    mergeLinkLists: mergeLinkLists,
    mergeLinks: mergeLinkLists /* 任务契约别名（同一实现） */
  };

  /* UMD-lite：Node 测试走 module.exports，浏览器挂全局命名空间 HY */
  if (typeof module === 'object' && module.exports) { module.exports = api; }
  global.HY = global.HY || {};
  Object.assign(global.HY, api);
})(typeof window !== 'undefined' ? window : globalThis);
