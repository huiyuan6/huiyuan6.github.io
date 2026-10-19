# 会员权益（HuiYuan）官网

会员权益聚合导航官网：收录视频会员、音乐会员、网盘扩容、社交媒体服务、流量话费等数字权益优惠，提供权益分类、热门套餐推荐与合作站点入口。

线上地址：<https://huiyuan6.github.io/>

## 技术栈

- **纯静态站点**：无构建、无依赖、无 CDN，推送到 GitHub Pages 默认分支即发布。
- **HTML5 语义化**：单页 `index.html`，单一 `h1`，`header/nav/main/section/footer/details` 语义地标。
- **CSS**：单文件 `css/style.css`，CSS 自定义属性（设计令牌）+ 移动端优先媒体查询，明暗双主题（`html[data-theme]`）。
- **JavaScript**：原生 ES2018 经典脚本（`defer`），全局命名空间 `window.HY`，UMD-lite 包装兼容 Node 测试。
- **数据驱动**：`data.js` 顶层 `var MEMBER_SITE_DATA = [...]` 暴露全局变量，经 `<script src>` 加载（file:// 下同样可用，不用 fetch）。

## 站点板块

单页 `index.html` 自上而下共 15 个板块，锚点可直接用于导航与深链：

| 锚点 | 板块 | 说明 |
| --- | --- | --- |
| `#top` | 页头导航 | 站点标识 + 主导航（权益分类/覆盖平台/合作站点/热门权益/省钱攻略/常见问题）+ 主题切换 |
| `#hero` | 首屏主视觉 | 「一站式会员权益聚合导航」价值主张与快捷入口 |
| `#stats` | 数据统计 | 收录站点、权益类型等统计数据（标题对视觉隐藏） |
| `#categories` | 权益分类 | 视频/音乐/网盘/社媒/流量话费/组合套餐六大分类入口 |
| `#platforms` | 覆盖平台（v2 新增） | 视频/音乐/网盘/社媒/运营商/电商六大类平台清单 |
| `#partners` | 合作站点 | 经人工核验的站群合作站点清单（data.js 数据驱动） |
| `#steps` | 使用步骤 | 四步完成权益开通 |
| `#hot` | 热门权益 | 追剧/听歌/办公云盘/社媒经营等推荐套餐 |
| `#compare` | 权益速览对比（v2 新增） | 六大权益类型「适合人群/常含内容/省钱要点」速览对比表 |
| `#guides` | 省钱攻略（v2 新增） | 学生认证/联合会员/自动续费/号卡选购/家庭共享/季度盘点六篇攻略 |
| `#faq` | 常见问题 | 已扩至 9 问：站点定位、优惠、套餐选择、学生价、自动续费、收录标准、支付售后、隐私、问题反馈 |
| `#updates` | 收录动态（v2 新增） | 人工核验与定期复检的公开记录时间线 |
| `#trust` | 用户评价与信任保障 | 用户评价与信任背书 |
| `#contact` | 提交收录（v2 新增） | 收录标准、来信要求与联系邮箱 2667389861@qq.com |
| — | 页脚 | 友链互认、联系邮箱 2667389861@qq.com、回到顶部 |

站点收录申请与友链交换：邮件 2667389861@qq.com（附站点名称、网址、简介，人工核验后上架）。

## 目录结构

```
huiyuan6.github.io/
├── index.html          # 唯一页面：静态基线内容 + head 元数据 + JSON-LD + 脚本装配
├── data.js             # 站群站点清单：全局变量 MEMBER_SITE_DATA（6 条目）
├── css/
│   └── style.css       # 全站唯一样式表
├── js/
│   ├── main.js         # 编排入口 init()
│   └── modules/        # validate / merge / render / theme / accordion / reveal / nav
├── assets/
│   ├── favicon.svg     # 站点图标
│   └── og-image.png    # 社交分享卡片图（1200×630）
├── robots.txt          # 允许全部抓取 + 声明 sitemap
├── sitemap.xml         # 首页规范 URL
├── llms.txt            # AI 爬虫纯文本站点概览
├── tests/              # 浏览器测试运行器（tests/test.html 双击即跑）
└── 404.html            # 404 页面（noindex，返回首页用绝对 URL）
```

## 本地运行

两种方式，行为完全一致：

| 方式 | 操作 | 访问地址 |
| --- | --- | --- |
| file:// 直开 | 资源管理器双击 `index.html` | 无需服务器 |
| 本地静态服务器 | 仓库根目录执行 `python -m http.server 8000` 或 `npx serve` | `http://localhost:8000/` |

## 测试

- **浏览器（主路径）**：双击 `tests/test.html`（file:// 兼容），页面显示绿/红结果面板。
- **Node（可选辅）**：本机 Node ≥ 18 时执行 `node tests/run-node.js`（退出码 0 = 全部通过，可接入 CI），运行纯函数用例与 data.js 数据契约用例；无 Node 则跳过，不影响交付。

## data.js 字段说明与维护指南

`data.js` 是站群站点清单的**唯一维护入口**，一个条目 = 站群中的一个官网：

| 字段 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- |
| `name` | 是 | string | 站点显示名（同时是友链锚文本），非空 |
| `url` | 是 | string | 合法 http/https 绝对地址（`new URL()` 可解析） |
| `desc` | 是 | string | 一句话描述（建议 ≤30 汉字），非空 |
| `icon` | 否 | string | 卡片头像（≤4 字符，如 emoji/汉字）；缺省用默认图标 |
| 其他 | 否 | any | 扩展字段容忍不报错（`tag`/`category`/`type` 为预留位，本期不消费） |

维护方式：直接增删改条目并 `git push`，合作站点卡片、统计数字、页脚友链三处自动同步，无需改任何 HTML/JS。非法条目会被跳过并在控制台输出警告，不影响其余条目渲染。

## 发版同步清单（重要）

日常追加条目只需改 `data.js`；但**每次发版时**应把 data.js 最新内容同步到以下三处，保持无 JS 视图与结构化数据新鲜：

1. `index.html` 静态基线：`#partner-list` 合作站点卡片、`#footer-links` 页脚友链；
2. `index.html` head 内 JSON-LD `ItemList` 实体（合作站点清单）；
3. `llms.txt` 的「合作站点」段落。

> 防御机制：页脚友链采用「并集合并、永不删除静态基线」策略，即使 data.js 被误删条目，页脚仍完整展示基线 6 条。

## 部署

GitHub Pages 用户仓库，推送即发布：

```bash
git add .
git commit -m "更新站点内容"
git push
```

发布后线上验证：<https://huiyuan6.github.io/>、`/robots.txt`、`/sitemap.xml`、`/llms.txt`、`/assets/favicon.svg` 均可访问；禁用 JS 访问首页时全部板块文本与友链仍可获取。

回滚：`git revert` 后推送即回到上一发布版本。

## 设计文档

需求、技术与任务拆解文档位于 `.codearts/specs/membership-benefits-site/`（spec.md / design.md / tasks.md）。
