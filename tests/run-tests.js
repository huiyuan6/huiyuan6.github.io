/**
 * run-tests.js — 用例主体（浏览器 / Node 双路径共用，design.md 1.3.6）
 * 设计：runSuite(ctx) 接收注入的 TestKit 与各模块引用，不在本文件内
 *   直接 require / 读全局——由宿主（test.html 驱动脚本 / run-node.js）负责装配。
 * 用例与被测源码版本对应（撰写时基线）：
 *   data.js / js/modules/{validate,merge,render,theme,accordion,reveal,nav}.js / js/main.js
 */
(function (global) {
  'use strict';

  /* ===== 测试辅助 mock（仅测试侧使用，不触碰被测源码） ===== */

  /** 记录型属性容器：模拟 Element 的 set/getAttribute */
  function recorder() {
    var store = {};
    return {
      attrs: store,
      setAttribute: function (k, v) { store[k] = v; },
      getAttribute: function (k) {
        return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null;
      },
      querySelector: function () { return null; }
    };
  }

  /** 极简 classList 模拟（支持 add / remove / toggle(force) / contains） */
  function fakeClassList() {
    var list = [];
    return {
      add: function (c) { if (list.indexOf(c) === -1) list.push(c); },
      remove: function (c) { var i = list.indexOf(c); if (i !== -1) list.splice(i, 1); },
      contains: function (c) { return list.indexOf(c) !== -1; },
      toggle: function (c, force) {
        var on = force === undefined ? list.indexOf(c) === -1 : !!force;
        if (on) { this.add(c); } else { this.remove(c); }
      }
    };
  }

  /** 模拟 <details> 元素（accordion 用） */
  function makeDetails(open) {
    return { open: !!open, classList: fakeClassList() };
  }

  /** 模拟带 classList 的普通元素（reveal 用） */
  function makeEl() {
    return { classList: fakeClassList() };
  }

  /** 临时替换宿主全局属性，结束后还原（原不存在的属性用 delete 清理） */
  function withGlobal(host, key, value, fn) {
    var had = key in host;
    var saved = host[key];
    host[key] = value;
    try { fn(); } finally {
      if (had) { host[key] = saved; }
      else { try { delete host[key]; } catch (e) { host[key] = undefined; } }
    }
  }

  /** data.js 基线常量（FR-12：URL 逐字符锁定） */
  var BASE_NAMES = ['运来网络', '好运权益', '福来流量站', '券宝', '聚合优惠', '号卡'];
  var BASE_URLS = [
    'https://wcbblll.99kami.com',
    'https://wcbblll.im01.cn',
    'http://35568.qcxmt.cn',
    'https://jdjdndn.github.io/',
    'https://wcbblll.cc',
    'https://dlhaoka.com'
  ];
  var BASE_DESCS = [
    '视频/音乐/网盘等权益',
    '视频/音乐/网盘等权益',
    '粉丝/关注/点赞/阅读服务',
    '优惠券领取与省钱攻略',
    '全网优惠信息聚合导航',
    '大流量手机号卡在线办理'
  ];

  /* ===== 用例主体 ===== */

  /**
   * 运行全部用例。
   * @param {Object} ctx 注入上下文：
   *   TestKit            断言库
   *   HY                 扁平命名空间（浏览器 window.HY / Node globalThis.HY）
   *   data               MEMBER_SITE_DATA（6 条基线）
   *   validate/merge/render/theme/accordion/reveal/nav/main  各模块 api
   * @returns {Object} TestKit.results（total/pass/fail/groups/failures）
   */
  function runSuite(ctx) {
    var T = ctx.TestKit;
    var HY = ctx.HY;
    var data = ctx.data;
    var validate = ctx.validate, merge = ctx.merge, render = ctx.render, theme = ctx.theme;
    var accordion = ctx.accordion, reveal = ctx.reveal, nav = ctx.nav, main = ctx.main;

    /* ---------- a. data.js 基线契约（FR-12 逐字符锁定） ---------- */
    T.group('a. data.js 基线契约（6 站逐字符锁定）', function () {

      T.test('MEMBER_SITE_DATA 存在且为数组', function () {
        T.ok(Array.isArray(data), 'MEMBER_SITE_DATA 应为数组');
      });

      T.test('站点清单恰好 6 条', function () {
        T.eq(data.length, 6, 'data.js 应包含 6 个站点条目');
      });

      T.test('每条目均为含非空 name/url/desc 字符串的对象', function () {
        for (var i = 0; i < data.length; i++) {
          var e = data[i];
          T.ok(e && typeof e === 'object', '条目 #' + i + ' 应为对象');
          T.eq(typeof e.name, 'string', '条目 #' + i + ' 的 name 应为字符串');
          T.eq(typeof e.url, 'string', '条目 #' + i + ' 的 url 应为字符串');
          T.eq(typeof e.desc, 'string', '条目 #' + i + ' 的 desc 应为字符串');
          T.ok(e.name.length > 0, '条目 #' + i + ' 的 name 非空');
          T.ok(e.url.length > 0, '条目 #' + i + ' 的 url 非空');
          T.ok(e.desc.length > 0, '条目 #' + i + ' 的 desc 非空');
        }
      });

      T.test('站点名称顺序与逐字符基线', function () {
        T.deepEq(data.map(function (e) { return e.name; }), BASE_NAMES);
      });

      T.test('URL 逐字符基线 · 运来网络（https + 99kami 域）', function () {
        T.eq(data[0].url, 'https://wcbblll.99kami.com');
      });

      T.test('URL 逐字符基线 · 好运权益（im01 域）', function () {
        T.eq(data[1].url, 'https://wcbblll.im01.cn');
      });

      T.test('URL 逐字符基线 · 福来流量站（http 协议 + qcxmt 拼写）', function () {
        T.eq(data[2].url, 'http://35568.qcxmt.cn', '福来流量站保持 http 协议，不得强转 https');
      });

      T.test('URL 逐字符基线 · 券宝（github.io + 尾斜杠）', function () {
        T.eq(data[3].url, 'https://jdjdndn.github.io/', '券宝 URL 尾斜杠属于基线的一部分');
      });

      T.test('URL 逐字符基线 · 聚合优惠（裸根域）', function () {
        T.eq(data[4].url, 'https://wcbblll.cc');
      });

      T.test('URL 逐字符基线 · 号卡（dlhaoka 域）', function () {
        T.eq(data[5].url, 'https://dlhaoka.com');
      });

      T.test('desc 逐字符基线（6 条全表）', function () {
        T.deepEq(data.map(function (e) { return e.desc; }), BASE_DESCS);
      });

      T.test('数据 × 校验器闭环：6 条全部通过 validateEntries', function () {
        var report = validate.validateEntries(data);
        T.eq(report.valid.length, 6, '基线数据应全部合法');
        T.eq(report.invalid.length, 0, '基线数据不应有非法条目');
      });
    });

    /* ---------- b. validate 数据校验 ---------- */
    T.group('b. validate 数据校验（合法 / 非法 / XSS 职责分离）', function () {

      T.test('isValidHttpUrl：https / http 绝对地址合法（含大写主机）', function () {
        T.eq(validate.isValidHttpUrl('https://example.com'), true);
        T.eq(validate.isValidHttpUrl('https://wcbblll.99kami.com'), true);
        T.eq(validate.isValidHttpUrl('http://35568.qcxmt.cn'), true, 'http 协议同样合法');
        T.eq(validate.isValidHttpUrl('https://EXAMPLE.com/Path'), true, '大写主机应被接受');
        T.eq(validate.isValidHttpUrl('https://a.com/x/y?z=1#h'), true, '带查询与锚点的地址合法');
      });

      T.test('isValidHttpUrl：非 http(s) 协议一律拒绝', function () {
        T.eq(validate.isValidHttpUrl('ftp://example.com'), false);
        T.eq(validate.isValidHttpUrl('javascript:alert(1)'), false, 'javascript: 伪协议必须拒绝');
        T.eq(validate.isValidHttpUrl('data:text/html,x'), false);
      });

      T.test('isValidHttpUrl：相对路径 / 空串 / 非字符串拒绝', function () {
        T.eq(validate.isValidHttpUrl('/relative/path'), false);
        T.eq(validate.isValidHttpUrl('example.com'), false, '无协议的裸域名应拒绝');
        T.eq(validate.isValidHttpUrl(''), false);
        T.eq(validate.isValidHttpUrl('   '), false, '纯空白应拒绝');
        T.eq(validate.isValidHttpUrl(null), false);
        T.eq(validate.isValidHttpUrl(undefined), false);
        T.eq(validate.isValidHttpUrl(123), false);
      });

      T.test('sanitizeEntry：字段 trim 规范化 + 白名单外字段丢弃', function () {
        var out = validate.sanitizeEntry({
          name: ' 运来网络 ', url: ' https://a.com ', desc: ' 描述 ', tag: '内测', extra: 1
        });
        T.eq(out.name, '运来网络');
        T.eq(out.url, 'https://a.com');
        T.eq(out.desc, '描述');
        T.deepEq(Object.keys(out).sort(), ['desc', 'name', 'url'], '只保留 name/url/desc 白名单字段');
      });

      T.test('sanitizeEntry：null / undefined / 字符串 / 数字一律返回 null', function () {
        T.eq(validate.sanitizeEntry(null), null);
        T.eq(validate.sanitizeEntry(undefined), null);
        T.eq(validate.sanitizeEntry('字符串'), null);
        T.eq(validate.sanitizeEntry(42), null);
      });

      T.test('sanitizeEntry：icon 规则（trim 后 1-4 字符保留，超长/空白丢弃）', function () {
        var withIcon = validate.sanitizeEntry({ name: 'a', url: 'https://a.com', desc: 'd', icon: ' ★ ' });
        T.eq(withIcon.icon, '★', 'icon 应 trim 后保留');
        var tooLong = validate.sanitizeEntry({ name: 'a', url: 'https://a.com', desc: 'd', icon: '超长图标呀' });
        T.ok(!('icon' in tooLong), '5 字符 icon 应被丢弃');
        var blank = validate.sanitizeEntry({ name: 'a', url: 'https://a.com', desc: 'd', icon: '   ' });
        T.ok(!('icon' in blank), '空白 icon 应被丢弃');
      });

      T.test('validateEntry：合法条目 → valid:true + 规范化 entry/sanitized + 零错误', function () {
        var r = validate.validateEntry(
          { name: ' 运来网络 ', url: ' https://wcbblll.99kami.com ', desc: ' 视频/音乐/网盘等权益 ' }, 0);
        T.eq(r.valid, true);
        T.eq(r.errors.length, 0);
        T.eq(r.entry.name, '运来网络');
        T.eq(r.entry.url, 'https://wcbblll.99kami.com');
        T.eq(r.entry.desc, '视频/音乐/网盘等权益');
        T.eq(r.entry, r.sanitized, 'entry 与 sanitized 应为同一规范化对象');
      });

      T.test('validateEntry：缺 name → 报错并带索引定位', function () {
        var r = validate.validateEntry({ url: 'https://a.com', desc: 'x' }, 2);
        T.eq(r.valid, false);
        T.eq(r.entry, null);
        T.eq(r.sanitized, null);
        T.contains(r.errors.join('；'), 'name 缺失或为空');
        T.contains(r.errors[0], '#2', '错误信息应包含条目索引');
      });

      T.test('validateEntry：url 非法 → 报「不是合法的 http/https 绝对地址」', function () {
        var r = validate.validateEntry({ name: 'a', url: 'javascript:alert(1)', desc: 'x' }, 0);
        T.eq(r.valid, false);
        T.contains(r.errors.join('；'), 'url 缺失或不是合法的 http/https 绝对地址');
      });

      T.test('validateEntry：缺 desc → 报错', function () {
        var r = validate.validateEntry({ name: 'a', url: 'https://a.com' }, 0);
        T.eq(r.valid, false);
        T.contains(r.errors.join('；'), 'desc 缺失或为空');
      });

      T.test('validateEntry：三字段全空 → 恰好 3 条错误', function () {
        var r = validate.validateEntry({ name: '', url: '', desc: '' }, 0);
        T.eq(r.valid, false);
        T.eq(r.errors.length, 3, 'name/url/desc 各报一条');
      });

      T.test('validateEntry：非对象入参 → 单条「不是有效对象」错误', function () {
        var r = validate.validateEntry('hello', 7);
        T.eq(r.valid, false);
        T.eq(r.entry, null);
        T.eq(r.sanitized, null);
        T.eq(r.errors.length, 1);
        T.contains(r.errors[0], '不是有效对象');
        T.contains(r.errors[0], '#7', '错误信息应包含条目索引');
      });

      T.test('validateEntries：好坏条目正确分离（invalid 保留原始引用与索引）', function () {
        var good = { name: '好站', url: 'https://good.com', desc: '描述' };
        var bad = { name: '', url: 'ftp://x', desc: '' };
        var report = validate.validateEntries([good, bad, { name: '又好', url: 'https://g2.com', desc: '二' }]);
        T.eq(report.valid.length, 2);
        T.eq(report.invalid.length, 1);
        T.eq(report.invalid[0].index, 1, 'invalid 应记录原始列表索引');
        T.eq(report.invalid[0].entry, bad, 'invalid 应保留原始条目引用');
        T.ok(report.invalid[0].errors.length >= 2, '坏条目至少包含 name 与 url 两类错误');
      });

      T.test('validateEntries：null / 非数组入参 → 空报告且不抛错', function () {
        var r1 = validate.validateEntries(null);
        T.eq(r1.valid.length, 0);
        T.eq(r1.invalid.length, 0);
        var r2 = validate.validateEntries('nope');
        T.eq(r2.valid.length, 0);
        T.eq(r2.invalid.length, 0);
      });

      T.test('XSS 职责分离：校验层只净化不转义（转义归 render，防双重转义）', function () {
        var r = validate.validateEntry(
          { name: '<script>alert(1)</script>', url: 'https://a.com', desc: '<b>&</b>' });
        T.eq(r.valid, true, '含 HTML 的字符串字段本身合法');
        T.eq(r.entry.name, '<script>alert(1)</script>', '校验层不得转义 name');
        T.eq(r.entry.desc, '<b>&</b>', '校验层不得转义 desc');
      });
    });

    /* ---------- c. merge / normalizeUrl ---------- */
    T.group('c. merge / normalizeUrl（归一化 / 并集 / 基线永不删除）', function () {

      T.test('normalizeUrl：根路径尾斜杠去除（券宝基线形态）', function () {
        T.eq(merge.normalizeUrl('https://jdjdndn.github.io/'), 'https://jdjdndn.github.io');
      });

      T.test('normalizeUrl：多级路径尾斜杠去除', function () {
        T.eq(merge.normalizeUrl('https://a.com/x/y/'), 'https://a.com/x/y');
      });

      T.test('normalizeUrl：主机大写归一为小写', function () {
        T.eq(merge.normalizeUrl('https://A.COM/x'), 'https://a.com/x');
      });

      T.test('normalizeUrl：http 协议保持 http（不强转 https）', function () {
        T.eq(merge.normalizeUrl('http://35568.qcxmt.cn'), 'http://35568.qcxmt.cn');
        T.ok(merge.normalizeUrl('http://a.com') !== merge.normalizeUrl('https://a.com'),
          'http 与 https 归一化后仍应可区分');
      });

      T.test('normalizeUrl：search 与 hash 原样保留', function () {
        T.eq(merge.normalizeUrl('https://a.com/p?x=1#h'), 'https://a.com/p?x=1#h');
      });

      T.test('normalizeUrl：非法字符串 / 空串 / 空白容错', function () {
        T.eq(merge.normalizeUrl('not a url'), 'not a url', '解析失败的字符串原样返回');
        T.eq(merge.normalizeUrl(''), '');
        T.eq(merge.normalizeUrl('   '), '');
      });

      T.test('normalizeUrl：非字符串入参容错（null → 空串，数字 → 字符串）', function () {
        T.eq(merge.normalizeUrl(null), '');
        T.eq(merge.normalizeUrl(123), '123');
      });

      T.test('mergeLinkLists：override 新站点追加在基线之后（并集语义）', function () {
        var merged = merge.mergeLinkLists(
          [{ name: '基线站', url: 'https://a.com' }],
          [{ name: '新增站', url: 'https://b.com' }]
        );
        T.eq(merged.length, 2);
        T.eq(merged[0].name, '基线站', '基线条目保持在前');
        T.eq(merged[1].name, '新增站', '新增条目追加在后');
      });

      T.test('mergeLinkLists：同站点归一合并（大小写 + 尾斜杠差异视为同站，override 值优先）', function () {
        var merged = merge.mergeLinkLists(
          [{ name: '旧名', url: 'https://A.com/' }],
          [{ name: '新名', desc: '新描述', url: 'https://a.com' }]
        );
        T.eq(merged.length, 1, '归一化后同站应合并为一条');
        T.eq(merged[0].name, '新名', 'override 的 name 应覆盖基线');
        T.eq(merged[0].desc, '新描述');
        T.eq(merged[0].url, 'https://a.com');
      });

      T.test('mergeLinkLists：基线永不删除（空 override 全保留 / 新增只追加）', function () {
        var merged = merge.mergeLinkLists(data, []);
        T.eq(merged.length, 6, 'override 为空时基线 6 条完整保留');
        T.deepEq(merged.map(function (e) { return e.name; }), BASE_NAMES, '基线顺序与名称不变');
        var m2 = merge.mergeLinkLists(data, [{ name: '新站', url: 'https://new.com' }]);
        T.eq(m2.length, 7, '新增一条 → 7 条');
        T.eq(m2[6].name, '新站', '新增条目位于尾部');
      });

      T.test('mergeLinkLists：http 与 https 是不同站点键，不合并', function () {
        var m = merge.mergeLinkLists(
          [{ name: 'HTTP站', url: 'http://a.com' }],
          [{ name: 'HTTPS站', url: 'https://a.com' }]
        );
        T.eq(m.length, 2, '协议不同不应视为同站');
      });

      T.test('mergeLinkLists：坏条目（null / 字符串 / 无 url / 空白 url）安全跳过', function () {
        var m = merge.mergeLinkLists(
          [null, 'x', {}, { name: '无url' }, { name: '空url', url: '   ' }],
          [{ name: '好站', url: 'https://ok.com' }]
        );
        T.eq(m.length, 1, '坏条目全部跳过，只保留合法 override 条目');
        T.eq(m[0].name, '好站');
      });

      T.test('mergeLinkLists：非数组入参容错（按空数组处理，不抛错）', function () {
        T.eq(merge.mergeLinkLists(null, 'x').length, 0);
        var only = merge.mergeLinkLists([{ name: 'A', url: 'https://a.com' }], undefined);
        T.eq(only.length, 1);
        T.eq(only[0].name, 'A');
      });

      T.test('mergeLinkLists：返回浅拷贝，不污染输入对象', function () {
        var baseEntry = { name: '原名', url: 'https://a.com' };
        var m = merge.mergeLinkLists([baseEntry], [{ name: '改名', url: 'https://a.com' }]);
        m[0].name = '被改了';
        T.eq(baseEntry.name, '原名', '修改返回结果不应影响输入条目');
      });

      T.test('mergeLinkLists：override 空 name 不覆盖基线名（desc 仍以 override 为准）', function () {
        var m = merge.mergeLinkLists(
          [{ name: '基线名', url: 'https://a.com' }],
          [{ name: '', url: 'https://a.com', desc: 'D' }]
        );
        T.eq(m[0].name, '基线名', '空 name 不应覆盖');
        T.eq(m[0].desc, 'D');
      });

      T.test('mergeLinks 别名契约：与 mergeLinkLists 同引用', function () {
        T.eq(merge.mergeLinks, merge.mergeLinkLists, 'mergeLinks 应为 mergeLinkLists 的导出别名');
      });
    });

    /* ---------- d. render HTML 构建 ---------- */
    T.group('d. render HTML 构建（class 契约 / noopener / sanitize）', function () {

      T.test('siteCardHTML：卡片结构 class 契约（partner-card 及四个子元素）', function () {
        var html = render.siteCardHTML(
          { name: '运来网络', url: 'https://wcbblll.99kami.com', desc: '视频/音乐/网盘等权益' });
        T.contains(html, 'class="partner-card"', '卡片根类名');
        T.contains(html, 'partner-card__avatar', '头像子元素类名');
        T.contains(html, 'partner-card__name', '名称子元素类名');
        T.contains(html, 'partner-card__desc', '描述子元素类名');
        T.contains(html, 'partner-card__link', '链接子元素类名');
        T.contains(html, 'aria-hidden="true"', '装饰性头像应对读屏器隐藏');
        T.contains(html, '<h3', '名称用标题元素');
        T.contains(html, '<p', '描述用段落元素');
      });

      T.test('siteCardHTML：链接属性契约（href 逐字符 / target=_blank / rel 含 noopener）', function () {
        var html = render.siteCardHTML(
          { name: '运来网络', url: 'https://wcbblll.99kami.com', desc: '视频/音乐/网盘等权益' });
        T.contains(html, 'href="https://wcbblll.99kami.com"', 'href 逐字符');
        T.contains(html, 'target="_blank"');
        T.contains(html, 'rel="noopener noreferrer"', '新窗口链接须带 noopener noreferrer');
        T.contains(html, '>访问站点</a>', '链接文案');
      });

      T.test('siteCardHTML：默认头像 = 站名首字符', function () {
        var html = render.siteCardHTML(
          { name: '好运权益', url: 'https://wcbblll.im01.cn', desc: '视频/音乐/网盘等权益' });
        T.contains(html, 'aria-hidden="true">好</span>', '好运权益头像应为「好」');
        var html2 = render.siteCardHTML(
          { name: '号卡', url: 'https://dlhaoka.com', desc: '大流量手机号卡在线办理' });
        T.contains(html2, 'aria-hidden="true">号</span>', '号卡头像应为「号」');
      });

      T.test('siteCardHTML：显式 icon 优先于站名首字符', function () {
        var html = render.siteCardHTML(
          { name: '券宝', url: 'https://jdjdndn.github.io/', desc: '优惠券领取与省钱攻略', icon: '★' });
        T.contains(html, 'aria-hidden="true">★</span>', '有 icon 时头像取 icon');
        T.notContains(html, 'aria-hidden="true">券</span>', '不应回退到站名首字符');
      });

      T.test('siteCardHTML：name 注入 XSS 时输出转义（<script> 不得存活）', function () {
        var html = render.siteCardHTML(
          { name: '<script>alert(1)</script>', url: 'https://a.com', desc: 'd' });
        T.notContains(html, '<script', '输出不得包含未转义的 <script');
        T.contains(html, '&lt;script&gt;alert(1)&lt;/script&gt;', '应输出转义后的实体');
      });

      T.test('siteCardHTML：url 属性上下文转义（引号逃逸防御纵深）', function () {
        var html = render.siteCardHTML(
          { name: 'n', url: 'https://a.com/"onmouseover="x', desc: 'd' });
        T.notContains(html, '"onmouseover="', '不得出现可逃逸属性的双引号');
        T.contains(html, '&quot;onmouseover=&quot;', '双引号应转义为 &quot;');
      });

      T.test('siteCardHTML：desc 转义且中文原样保留', function () {
        var html = render.siteCardHTML(
          { name: 'n', url: 'https://a.com', desc: '优惠券 & <b>攻略</b>' });
        T.contains(html, '优惠券 &amp; &lt;b&gt;攻略&lt;/b&gt;');
        T.notContains(html, '<b>', 'desc 中的标签必须转义');
      });

      T.test('footerLinkHTML：结构与属性逐字符精确输出', function () {
        var html = render.footerLinkHTML({ name: '运来网络', url: 'https://wcbblll.99kami.com' });
        T.eq(html,
          '<li class="footer-link"><a href="https://wcbblll.99kami.com" ' +
          'target="_blank" rel="noopener noreferrer">运来网络</a></li>');
      });

      T.test('escapeHtml：五个敏感字符全部转义', function () {
        T.eq(render.escapeHtml('&<>"\''), '&amp;&lt;&gt;&quot;&#39;');
      });

      T.test('escapeHtml：null/undefined → 空串；中文原样保留', function () {
        T.eq(render.escapeHtml(null), '');
        T.eq(render.escapeHtml(undefined), '');
        T.eq(render.escapeHtml('会员权益'), '会员权益');
      });

      T.test('导出别名契约：createCard / renderPartnerCards / renderFooterLinks / renderStats', function () {
        T.eq(render.createCard, render.siteCardHTML, 'createCard 应为 siteCardHTML 别名');
        T.eq(render.renderPartnerCards, render.renderSiteCards, 'renderPartnerCards 别名');
        T.eq(render.renderFooterLinks, render.syncFooterLinks, 'renderFooterLinks 别名');
        T.eq(render.renderStats, render.updateStat, 'renderStats 别名');
      });

      T.test('renderSiteCards：全量重渲染（整体替换而非追加）', function () {
        var container = { innerHTML: '旧内容' };
        render.renderSiteCards(container, data);
        T.contains(container.innerHTML, '<li class="partner-card">');
        T.eq(container.innerHTML.split('<li class="partner-card">').length - 1, 6, '6 条全量渲染');
        T.notContains(container.innerHTML, '旧内容', '重渲染应整体替换');
        render.renderSiteCards(container, []);
        T.eq(container.innerHTML, '', '空列表清空容器（由调用方守卫数据有效性）');
      });

      T.test('syncFooterLinks：静态基线 ∪ 数据条目（合并重建并返回结果）', function () {
        var anchors = [
          { textContent: ' 运来网络 ', getAttribute: function () { return 'https://wcbblll.99kami.com'; } },
          { textContent: '外部站', getAttribute: function () { return 'https://ext.com'; } }
        ];
        var container = {
          innerHTML: '静态基线',
          querySelectorAll: function (sel) {
            T.eq(sel, 'a[href]', '应以 a[href] 选择器收集静态链接');
            return anchors;
          }
        };
        var merged = render.syncFooterLinks(container, [{ name: '数据站', url: 'https://data.com' }]);
        T.eq(merged.length, 3, '静态 2 条 + 新增 1 条');
        T.eq(merged[0].name, '运来网络', 'parseLinks 应 trim 锚文本');
        T.eq(merged[0].url, 'https://wcbblll.99kami.com');
        T.eq(merged[2].name, '数据站', '数据条目追加尾部');
        T.eq(container.innerHTML.split('<li class="footer-link">').length - 1, 3, '容器重建为 3 条友链');
        T.contains(container.innerHTML, 'https://ext.com', '静态独有的外部站保留');
      });

      T.test('countElements：按选择器计数 + 容错（null / 无查询能力 → 0）', function () {
        T.eq(render.countElements(
          { querySelectorAll: function () { return { length: 3 }; } }, '.x'), 3);
        T.eq(render.countElements(null, '.x'), 0);
        T.eq(render.countElements({}, '.x'), 0, '无 querySelectorAll 的对象按 0 处理');
      });

      T.test('setFooterYear：定制年份直写 / 缺省回填当前年 / null 容器安全', function () {
        var el = { textContent: '' };
        render.setFooterYear(el, 2024);
        T.eq(el.textContent, '2024');
        render.setFooterYear(el);
        T.eq(el.textContent, String(new Date().getFullYear()), '缺省时回填当前年份');
        render.setFooterYear(null, 2024);
      });

      T.test('updateStat：animate:false 立即写入（不依赖 requestAnimationFrame）', function () {
        var el = { textContent: '' };
        render.updateStat(el, 6, { animate: false });
        T.eq(el.textContent, '6');
        render.updateStat(el, 0, { animate: false });
        T.eq(el.textContent, '0');
        render.updateStat(el, '12', { animate: false });
        T.eq(el.textContent, '12', '数字字符串应数值化输出');
        render.updateStat(el, NaN, { animate: false });
        T.eq(el.textContent, '0', '非法数值回退为 0');
      });

      T.test('updateStat：null 元素安全跳过；Node 无 rAF 时默认立即写入', function () {
        render.updateStat(null, 99, { animate: false });
        if (typeof window === 'undefined') {
          var el = { textContent: '' };
          render.updateStat(el, 42);
          T.eq(el.textContent, '42', 'Node 环境无 requestAnimationFrame → 立即路径');
        }
      });
    });

    /* ---------- e. theme / readSiteData 守卫 ---------- */
    T.group('e. theme 三态解析与持久化守卫 / main.readSiteData', function () {

      T.test('resolveTheme：显式选择优先（dark / light 均覆盖系统偏好）', function () {
        T.eq(theme.resolveTheme('dark', false), 'dark');
        T.eq(theme.resolveTheme('light', true), 'light');
      });

      T.test('resolveTheme：无记忆时跟随系统（prefersDark → dark，否则 light）', function () {
        T.eq(theme.resolveTheme(null, true), 'dark');
        T.eq(theme.resolveTheme(null, false), 'light');
      });

      T.test('resolveTheme：垃圾记忆值按无记忆处理', function () {
        T.eq(theme.resolveTheme('blue', true), 'dark', '非 dark/light 的存储值应被忽略');
      });

      T.test('getStoredTheme：合法存储值读取（键名 hy-theme）', function () {
        T.eq(theme.getStoredTheme(
          { getItem: function (k) { T.eq(k, 'hy-theme'); return 'dark'; } }), 'dark');
        T.eq(theme.getStoredTheme(
          { getItem: function () { return 'light'; } }), 'light');
      });

      T.test('getStoredTheme：垃圾值 / 无值 → null', function () {
        T.eq(theme.getStoredTheme({ getItem: function () { return 'blue'; } }), null);
        T.eq(theme.getStoredTheme({ getItem: function () { return null; } }), null);
      });

      T.test('getStoredTheme：无 storage / getItem 抛异常 → null 且不炸', function () {
        T.eq(theme.getStoredTheme(null), null);
        T.eq(theme.getStoredTheme(
          { getItem: function () { throw new Error('SecurityError'); } }), null, '隐私模式等异常场景安全降级');
      });

      T.test('applyTheme：设置 data-theme 并同步切换按钮 aria-label', function () {
        var root = recorder();
        var btn = recorder();
        root.querySelector = function (sel) {
          T.eq(sel, '#theme-toggle');
          return btn;
        };
        theme.applyTheme(root, 'dark');
        T.eq(root.attrs['data-theme'], 'dark');
        T.eq(btn.attrs['aria-label'], '切换到亮色主题', '暗色态按钮应提示切到亮色');
        theme.applyTheme(root, 'light');
        T.eq(root.attrs['data-theme'], 'light');
        T.eq(btn.attrs['aria-label'], '切换到暗色主题', '亮色态按钮应提示切到暗色');
        theme.applyTheme(null, 'dark');
      });

      T.test('toggleTheme：light → dark 切换并持久化（setItem hy-theme）', function () {
        var root = recorder();
        var calls = [];
        var next = theme.toggleTheme(root, {
          setItem: function (k, v) { calls.push([k, v]); }
        });
        T.eq(next, 'dark');
        T.eq(root.attrs['data-theme'], 'dark');
        T.eq(calls.length, 1, '应写入一次存储');
        T.eq(calls[0][0], 'hy-theme');
        T.eq(calls[0][1], 'dark');
      });

      T.test('toggleTheme：storage.setItem 抛异常时不影响切换', function () {
        var root = recorder();
        var next = theme.toggleTheme(root, {
          setItem: function () { throw new Error('QuotaExceeded'); }
        });
        T.eq(next, 'dark');
        T.eq(root.attrs['data-theme'], 'dark', '主题已应用，仅持久化失败');
      });

      T.test('toggleTheme：无 root 回退守卫不抛错（Node 无 document 时返回切换值）', function () {
        if (typeof window !== 'undefined') {
          /* 浏览器下 root 为空会回退到真实 documentElement，此处只验证不抛错 */
          theme.toggleTheme(null, { setItem: function () {} });
        } else {
          var calls = [];
          var next = theme.toggleTheme(null, {
            setItem: function (k, v) { calls.push([k, v]); }
          });
          T.eq(next, 'dark', '无 root 无 document：当前视为 light，切到 dark');
          T.eq(calls.length, 1);
        }
      });

      T.test('initTheme：无文档守卫（Node 下返回 light，不抛错）', function () {
        if (typeof window !== 'undefined') {
          /* 浏览器下传 null 会回退到真实 document（其本身即守卫行为），仅验证不抛错 */
          var t = theme.initTheme(null);
          T.ok(t === 'light' || t === 'dark', '应返回解析后的有效主题');
        } else {
          T.eq(theme.initTheme(null), 'light');
        }
      });

      T.test('initTheme：mock 文档全流程（读取记忆 → 应用主题 → 幂等标记）', function () {
        var root = recorder();
        var doc = {
          documentElement: root,
          defaultView: {
            matchMedia: function (q) { return { matches: q.indexOf('dark') !== -1 }; }
          },
          getElementById: function () { return null; }
        };
        var storage = { getItem: function () { return 'dark'; }, setItem: function () {} };
        var t = theme.initTheme(doc, { storage: storage });
        T.eq(t, 'dark', '存储记忆 dark 应被采用');
        T.eq(root.attrs['data-theme'], 'dark');
        T.eq(root.attrs['data-hy-theme-init'], '1', '应打上初始化标记');
        var t2 = theme.initTheme(doc, { storage: storage });
        T.eq(t2, 'dark', '二次调用幂等返回同一主题');
      });

      T.test('readSiteData：正常读取注入的全局数据（原样引用）', function () {
        T.eq(main.readSiteData({ MEMBER_SITE_DATA: data }), data);
      });

      T.test('readSiteData：缺失 / 异常形态一律返回 null 不抛错', function () {
        T.eq(main.readSiteData({}), null);
        T.eq(main.readSiteData(null), null);
        T.eq(main.readSiteData(undefined), null);
        T.eq(main.readSiteData({ MEMBER_SITE_DATA: null }), null);
        T.eq(main.readSiteData({ MEMBER_SITE_DATA: 0 }), null, '假值数据按缺失处理');
      });
    });

    /* ---------- f. 模块加载契约与无 DOM 守卫 ---------- */
    T.group('f. 8 模块加载契约（Node require / 浏览器 script）与无 DOM 守卫', function () {

      function expectFunctions(mod, names, label) {
        T.test(label, function () {
          for (var i = 0; i < names.length; i++) {
            T.eq(typeof mod[names[i]], 'function', names[i] + ' 应为函数');
          }
        });
      }

      expectFunctions(validate,
        ['isValidHttpUrl', 'sanitizeEntry', 'validateEntry', 'validateEntries'],
        'validate 模块导出契约（4 个函数）');
      expectFunctions(merge,
        ['normalizeUrl', 'mergeLinkLists', 'mergeLinks'],
        'merge 模块导出契约（normalizeUrl + 合并主/别名）');
      expectFunctions(render,
        ['escapeHtml', 'siteCardHTML', 'footerLinkHTML', 'renderSiteCards',
          'syncFooterLinks', 'updateStat', 'countElements', 'setFooterYear', 'createCard'],
        'render 模块导出契约（8 函数 + createCard 别名）');
      expectFunctions(theme,
        ['getStoredTheme', 'resolveTheme', 'applyTheme', 'toggleTheme', 'initTheme'],
        'theme 模块导出契约（5 个函数）');
      expectFunctions(accordion,
        ['enforceSingleOpen', 'initFaq', 'initAccordion'],
        'accordion 模块导出契约（3 个函数）');
      expectFunctions(reveal,
        ['setupReveal', 'initReveal'],
        'reveal 模块导出契约（2 个函数）');
      expectFunctions(nav,
        ['initMobileNav', 'initSmoothScroll', 'initBackTop', 'initNav'],
        'nav 模块导出契约（4 个函数）');
      expectFunctions(main,
        ['readSiteData', 'init'],
        'main 模块导出契约（readSiteData / init）');

      T.test('HY 扁平命名空间：8 模块 API 全部注册（浏览器全局 / Node require 副作用）', function () {
        var names = [
          'isValidHttpUrl', 'validateEntries',
          'normalizeUrl', 'mergeLinkLists',
          'siteCardHTML', 'syncFooterLinks', 'updateStat', 'countElements', 'setFooterYear', 'createCard',
          'resolveTheme', 'applyTheme', 'toggleTheme', 'initTheme',
          'enforceSingleOpen', 'initAccordion',
          'setupReveal', 'initReveal',
          'initNav',
          'readSiteData', 'init'
        ];
        for (var i = 0; i < names.length; i++) {
          T.eq(typeof HY[names[i]], 'function', 'HY.' + names[i] + ' 应为函数');
        }
      });

      T.test('main.init：无 DOM 环境安全 no-op 且幂等（Node 深检）', function () {
        T.eq(typeof main.init, 'function');
        T.eq(typeof main.init.done, 'boolean');
        if (typeof window !== 'undefined') {
          /* 浏览器：main.js 已注册 DOMContentLoaded 兜底，此处不主动触发 */
          return;
        }
        T.eq(main.init.done, false, 'Node 下 require 不应触发 init');
        main.init();
        T.eq(main.init.done, true, '首次调用后置幂等标记');
        main.init();
      });

      T.test('accordion 无 DOM 守卫：initAccordion / initFaq(null) / enforceSingleOpen(null) 不抛错', function () {
        accordion.initAccordion();
        accordion.initFaq(null);
        accordion.enforceSingleOpen(null);
      });

      T.test('reveal 无 DOM 守卫：initReveal / setupReveal(null) / 空目标列表不抛错', function () {
        reveal.initReveal();
        reveal.setupReveal(null);
        reveal.setupReveal({ querySelectorAll: function () { return []; } });
      });

      T.test('nav 无 DOM 守卫：initNav 与三个子初始化器不抛错', function () {
        nav.initNav();
        nav.initMobileNav(undefined);
        nav.initSmoothScroll(undefined);
        nav.initBackTop(undefined);
      });

      T.test('enforceSingleOpen：指定保留项时其余展开项互斥收起', function () {
        var d1 = makeDetails(true), d2 = makeDetails(true), d3 = makeDetails(false);
        var container = {
          querySelectorAll: function (sel) {
            T.eq(sel, 'details', '应以 details 选择器收集条目');
            return [d1, d2, d3];
          }
        };
        accordion.enforceSingleOpen(container, d2);
        T.eq(d1.open, false, '非保留的展开项应收起');
        T.ok(!d1.classList.contains('is-open'), '收起项应移除 is-open 状态类');
        T.eq(d2.open, true, '保留项保持展开');
        T.ok(d2.classList.contains('is-open'), '保留项应有 is-open 状态类');
        T.eq(d3.open, false, '本就收起的项不受影响');
      });

      T.test('enforceSingleOpen：未指定保留项时默认保留第一个展开项', function () {
        var a = makeDetails(true), b = makeDetails(true);
        accordion.enforceSingleOpen({ querySelectorAll: function () { return [a, b]; } });
        T.eq(a.open, true, '第一个展开项默认保留');
        T.ok(a.classList.contains('is-open'));
        T.eq(b.open, false, '后续展开项收起');
        T.ok(!b.classList.contains('is-open'));
      });

      T.test('initFaq：幂等绑定（data-hy-faq-bound 标记防重复）', function () {
        var qCalls = 0;
        var attrs = {};
        var container = {
          querySelectorAll: function (sel) {
            T.eq(sel, 'details');
            qCalls++;
            return [];
          },
          getAttribute: function (k) {
            return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null;
          },
          setAttribute: function (k, v) { attrs[k] = v; }
        };
        accordion.initFaq(container);
        T.eq(attrs['data-hy-faq-bound'], '1', '首次绑定应打标记');
        var afterFirst = qCalls;
        accordion.initFaq(container);
        T.eq(qCalls, afterFirst, '二次调用应早退，不再查询条目');
      });

      T.test('setupReveal 降级①：无 IntersectionObserver 时目标全部立即可见', function () {
        var r1 = makeEl(), r2 = makeEl();
        var root = {
          querySelectorAll: function (sel) {
            T.eq(sel, '[data-reveal]', '应以 [data-reveal] 选择器收集目标');
            return [r1, r2];
          }
        };
        var host = typeof window !== 'undefined' ? window : globalThis;
        withGlobal(host, 'IntersectionObserver', undefined, function () {
          reveal.setupReveal(root);
        });
        T.ok(r1.classList.contains('is-visible'), '降级路径应立即加 is-visible');
        T.ok(r2.classList.contains('is-visible'));
      });

      T.test('setupReveal 降级②：prefers-reduced-motion 时立即可见（优先于观察器）', function () {
        var r = makeEl();
        var root = { querySelectorAll: function () { return [r]; } };
        var host = typeof window !== 'undefined' ? window : globalThis;
        withGlobal(host, 'matchMedia', function () { return { matches: true }; }, function () {
          reveal.setupReveal(root);
        });
        T.ok(r.classList.contains('is-visible'), '减少动效偏好下不应等待滚动');
      });
    });

    return T.results;
  }

  /* UMD-lite：Node 走 module.exports，浏览器挂 HY_TEST_SUITE 供驱动脚本调用 */
  var api = { runSuite: runSuite };
  if (typeof module === 'object' && module.exports) { module.exports = api; }
  global.HY_TEST_SUITE = api;
})(typeof window !== 'undefined' ? window : globalThis);
