/**
 * data.js — 站群站点清单（会员权益 HuiYuan 的数据驱动配置）
 * 语义：一个条目 = 站群中的一个官网；本站与各站点通过底部友情链接互跳。
 * 维护：直接增删改下方条目并推送即可，页面自动同步（无需改任何 HTML/JS）。
 * 校验：name/url/desc 三字段必填；url 必须是 http/https 绝对地址，非法条目会被跳过。
 */
var MEMBER_SITE_DATA = [
  /* —— data.js 原有 3 站（逐字符保持，勿动） —— */
  { name: '运来网络', url: 'https://wcbblll.99kami.com', desc: '视频/音乐/网盘等权益' },
  { name: '好运权益', url: 'https://wcbblll.im01.cn', desc: '视频/音乐/网盘等权益' },
  { name: '福来流量站', url: 'http://35568.qcxmt.cn', desc: '粉丝/关注/点赞/阅读服务' },
  /* —— 用户指定友链 3 站（URL 逐字符锁定，desc 为内容阶段基线文案） —— */
  { name: '券宝', url: 'https://jdjdndn.github.io/', desc: '优惠券领取与省钱攻略' },
  { name: '聚合优惠', url: 'https://wcbblll.cc', desc: '全网优惠信息聚合导航' },
  { name: '号卡', url: 'https://dlhaoka.com', desc: '大流量手机号卡在线办理' },
  /* —— 扩展字段示例（可选，本期渲染 icon，其余容忍忽略）：
  { name: '示例站', url: 'https://example.com', desc: '扩展字段示例', icon: '🚀', tag: '内测' },
  —— */
];

/* Node 测试环境导出（浏览器下此分支不执行；保持 data.js 零依赖、零构建） */
if (typeof module === 'object' && module.exports) { module.exports = MEMBER_SITE_DATA; }
