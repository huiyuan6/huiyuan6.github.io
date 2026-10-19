#!/usr/bin/env node
/**
 * run-node.js — Node 辅路径测试入口（design.md 1.3.6）
 * 用法：node tests/run-node.js
 * 退出码：0 = 全部通过；1 = 存在失败（可接入 CI）。
 * 说明：require 顺序与 index.html / test.html 的脚本加载顺序保持一致
 *   （merge 先于 render，保证 render.syncFooterLinks 依赖的 HY.mergeLinkLists 就绪）。
 */
'use strict';

var path = require('path');
var TestKit = require('./assertions.js');
var suite = require('./run-tests.js');

var ROOT = path.join(__dirname, '..');

var data = require(path.join(ROOT, 'data.js'));
var validate = require(path.join(ROOT, 'js/modules/validate.js'));
var merge = require(path.join(ROOT, 'js/modules/merge.js'));
var render = require(path.join(ROOT, 'js/modules/render.js'));
var theme = require(path.join(ROOT, 'js/modules/theme.js'));
var accordion = require(path.join(ROOT, 'js/modules/accordion.js'));
var reveal = require(path.join(ROOT, 'js/modules/reveal.js'));
var nav = require(path.join(ROOT, 'js/modules/nav.js'));
var main = require(path.join(ROOT, 'js/main.js'));

console.log('会员权益官网单元测试（Node 辅路径）\n');

var results = suite.runSuite({
  TestKit: TestKit,
  HY: globalThis.HY, /* require 副作用：8 模块已在全局 HY 扁平注册（与浏览器一致） */
  data: data,
  validate: validate,
  merge: merge,
  render: render,
  theme: theme,
  accordion: accordion,
  reveal: reveal,
  nav: nav,
  main: main
});

/* 分组统计 */
var names = Object.keys(results.groups);
console.log('\n分组统计：');
for (var i = 0; i < names.length; i++) {
  var g = results.groups[names[i]];
  console.log('  ' + names[i] + '：' + g.pass + ' / ' + (g.pass + g.fail) + ' 通过');
}

TestKit.reportSummary();

if (results.fail > 0) {
  console.log('\n失败明细：');
  for (var j = 0; j < results.failures.length; j++) {
    var f = results.failures[j];
    console.log('  [' + f.group + '] ' + f.name);
    console.log('    ' + f.message);
  }
  process.exitCode = 1;
} else {
  process.exitCode = 0;
}
