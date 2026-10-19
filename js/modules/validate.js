/**
 * validate.js — 数据校验（纯函数，无 DOM，双端可测）
 * 职责：对 data.js 条目做类型净化与合法性校验，坏条目隔离不阻断整页（FR-16/17）。
 * 设计说明：本模块只做「数据层净化」（白名单字段 + 类型强制 + trim）；
 *   HTML 转义在 render.escapeHtml 输出时进行——两层分离，避免「净化时转义 + 渲染时再转义」
 *   的双重转义缺陷（&amp;amp; 这类常见 XSS 防护事故）。
 */
(function (global) {
  'use strict';

  /**
   * 判断是否合法 http/https 绝对 URL。
   * 大写主机合法（WHATWG 解析自动小写）；无协议、ftp/javascript 协议、空串、非字符串均非法。
   * @param {unknown} value
   * @returns {boolean}
   */
  function isValidHttpUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return false;
    try {
      var u = new URL(value);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch (e) { return false; }
  }

  /**
   * 净化任意输入为安全条目形状（白名单：name/url/desc/icon）。
   * 非对象 → null；字符串字段强制 trim；未知扩展字段丢弃（FR-16 容忍、不报错）；
   * icon 非短字符串（空或 >4 字符）→ 忽略（渲染回退默认头像，见 render.avatarOf）。
   * @param {unknown} value
   * @returns {{name:string,url:string,desc:string,icon?:string}|null}
   */
  function sanitizeEntry(value) {
    if (!value || typeof value !== 'object') return null;
    var out = {
      name: typeof value.name === 'string' ? value.name.trim() : '',
      url: typeof value.url === 'string' ? value.url.trim() : '',
      desc: typeof value.desc === 'string' ? value.desc.trim() : ''
    };
    var icon = typeof value.icon === 'string' ? value.icon.trim() : '';
    if (icon && icon.length <= 4) out.icon = icon;
    return out;
  }

  /**
   * 单条目校验并规范化（index 用于错误信息定位，design.md 4.2.2 警告格式）。
   * @returns {{valid:boolean, entry:Object|null, sanitized:Object|null, errors:string[]}}
   *   entry 与 sanitized 同值（规范化条目）——双字段名兼容任务契约与设计文档契约。
   */
  function validateEntry(entry, index) {
    var i = typeof index === 'number' ? index : -1;
    var errors = [];
    var clean = sanitizeEntry(entry);
    if (!clean) {
      errors.push('[data] 条目 #' + i + '：不是有效对象');
      return { valid: false, entry: null, sanitized: null, errors: errors };
    }
    if (!clean.name) errors.push('[data] 条目 #' + i + '：name 缺失或为空');
    if (!isValidHttpUrl(clean.url)) errors.push('[data] 条目 #' + i + '：url 缺失或不是合法的 http/https 绝对地址');
    if (!clean.desc) errors.push('[data] 条目 #' + i + '：desc 缺失或为空');
    /* desc >30 汉字仅提示不拒绝（4.2.2）——纯函数不产生副作用，交由渲染层自然截断显示 */
    var valid = errors.length === 0;
    return { valid: valid, entry: valid ? clean : null, sanitized: valid ? clean : null, errors: errors };
  }

  /**
   * 列表校验：好坏分离。null / 非数组 → 空报告不抛错（FR-17 降级保护）。
   * @returns {{valid:Array, invalid:Array<{index:number, entry:unknown, errors:string[]}>}}
   */
  function validateEntries(list) {
    var report = { valid: [], invalid: [] };
    if (!Array.isArray(list)) return report;
    for (var i = 0; i < list.length; i++) {
      var r = validateEntry(list[i], i);
      if (r.valid) report.valid.push(r.entry);
      else report.invalid.push({ index: i, entry: list[i], errors: r.errors });
    }
    return report;
  }

  var api = {
    isValidHttpUrl: isValidHttpUrl,
    sanitizeEntry: sanitizeEntry,
    validateEntry: validateEntry,
    validateEntries: validateEntries
  };

  /* UMD-lite：Node 测试走 module.exports，浏览器挂全局命名空间 HY（扁平注册，design.md 2.1.1） */
  if (typeof module === 'object' && module.exports) { module.exports = api; }
  global.HY = global.HY || {};
  Object.assign(global.HY, api);
})(typeof window !== 'undefined' ? window : globalThis);
