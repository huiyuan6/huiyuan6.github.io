/**
 * assertions.js — 轻量断言库 TestKit（零依赖，浏览器 / Node 双路径）
 * 浏览器：window.TestKit；Node：module.exports（同时挂 global.TestKit）。
 * 设计：断言失败抛 Error，由 test() 捕获记账；reporter 可注入
 *   （默认 console：仅打印分组头 / 失败明细 / 汇总；浏览器可注入 DOM 渲染器）。
 */
(function (global) {
  'use strict';

  var currentGroup = '';
  var results = { total: 0, pass: 0, fail: 0, groups: {}, failures: [] };

  /* ---- 值格式化（失败消息「期望 vs 实际」） ---- */
  function fmt(v) {
    if (typeof v === 'string') return JSON.stringify(v);
    if (v === null) return 'null';
    if (v === undefined) return 'undefined';
    if (Array.isArray(v)) return '[' + v.map(fmt).join(', ') + ']';
    if (typeof v === 'object') {
      return '{' + Object.keys(v).map(function (k) { return k + ': ' + fmt(v[k]); }).join(', ') + '}';
    }
    return String(v);
  }

  /* ---- reporter ---- */
  var reporter = function (type, payload) {
    if (type === 'group') {
      console.log('\n■ ' + payload);
    } else if (type === 'fail') {
      console.log('  ✗ ' + payload.name);
      console.log('    ' + payload.message);
    } else if (type === 'summary') {
      console.log('\n==============================');
      console.log('通过 ' + payload.pass + ' / ' + payload.total +
        (payload.fail === 0 ? ' —— 全部通过 ✓' : ' —— 失败 ' + payload.fail + ' ✗'));
    }
  };
  function setReporter(fn) { reporter = fn; }

  /* ---- 断言原语 ---- */
  function ok(value, msg) {
    if (!value) throw new Error((msg || '应为真值') + '（实际：' + fmt(value) + '）');
  }

  function eq(actual, expected, msg) {
    if (!Object.is(actual, expected)) {
      throw new Error((msg || '相等断言失败') + '——期望：' + fmt(expected) + '，实际：' + fmt(actual));
    }
  }

  function deepDiff(a, b, path) {
    var where = path ? '（路径 ' + path + '）' : '';
    if (Object.is(a, b)) return null;
    if (typeof a !== typeof b) return where + '类型不同：期望 ' + fmt(b) + '，实际 ' + fmt(a);
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return where + '长度不同：期望 ' + b.length + '，实际 ' + a.length;
      for (var i = 0; i < a.length; i++) {
        var d = deepDiff(a[i], b[i], path + '[' + i + ']');
        if (d) return d;
      }
      return null;
    }
    if (a && b && typeof a === 'object') {
      var ka = Object.keys(a), kb = Object.keys(b), i;
      for (i = 0; i < ka.length; i++) if (!(ka[i] in b)) return where + '实际缺少键 ' + ka[i];
      for (i = 0; i < kb.length; i++) if (!(kb[i] in a)) return where + '实际多余键 ' + kb[i];
      for (i = 0; i < ka.length; i++) {
        var dd = deepDiff(a[ka[i]], b[ka[i]], path + '.' + ka[i]);
        if (dd) return dd;
      }
      return null;
    }
    return where + '期望：' + fmt(b) + '，实际：' + fmt(a);
  }

  function deepEq(actual, expected, msg) {
    var diff = deepDiff(actual, expected, '');
    if (diff) throw new Error((msg || '深度相等断言失败') + '——' + diff);
  }

  function contains(haystack, needle, msg) {
    if (String(haystack).indexOf(needle) === -1) {
      throw new Error((msg || '应包含子串') + '——应包含：' + fmt(needle) + '，实际：' + fmt(haystack));
    }
  }

  function notContains(haystack, needle, msg) {
    if (String(haystack).indexOf(needle) !== -1) {
      throw new Error((msg || '不应包含子串') + '——不应包含：' + fmt(needle) + '，实际：' + fmt(haystack));
    }
  }

  function throws(fn, msg) {
    var threw = false;
    try { fn(); } catch (e) { threw = true; }
    if (!threw) throw new Error(msg || '期望抛出异常但未抛出');
  }

  /* ---- 用例记账 ---- */
  function group(name, fn) {
    currentGroup = name;
    if (!results.groups[name]) results.groups[name] = { pass: 0, fail: 0 };
    reporter('group', name);
    fn();
    currentGroup = '';
  }

  function test(name, fn) {
    results.total++;
    var g = results.groups[currentGroup] || (results.groups[currentGroup] = { pass: 0, fail: 0 });
    try {
      fn();
      results.pass++;
      g.pass++;
      reporter('pass', { group: currentGroup, name: name });
    } catch (e) {
      results.fail++;
      g.fail++;
      var message = e && e.message ? e.message : String(e);
      results.failures.push({ group: currentGroup, name: name, message: message });
      reporter('fail', { group: currentGroup, name: name, message: message });
    }
  }

  function reportSummary() { reporter('summary', results); }

  var TestKit = {
    test: test, group: group,
    ok: ok, eq: eq, deepEq: deepEq,
    contains: contains, notContains: notContains,
    throws: throws, fmt: fmt,
    setReporter: setReporter, reportSummary: reportSummary,
    results: results
  };

  /* UMD-lite：Node 测试走 module.exports，浏览器挂 window.TestKit */
  if (typeof module === 'object' && module.exports) { module.exports = TestKit; }
  global.TestKit = TestKit;
})(typeof window !== 'undefined' ? window : globalThis);
