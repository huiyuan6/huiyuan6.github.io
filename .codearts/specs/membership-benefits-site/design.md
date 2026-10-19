# 会员权益官网 技术设计文档

| 项目名称 | 会员权益官网（membership-benefits-site） |
| --- | --- |
| 上游文档 | spec.md v1.0（`.codearts/specs/membership-benefits-site/spec.md`） |
| 文档版本 | v1.0 |
| 文档状态 | 已完成，待团队评审 |
| 创建日期 | 2026-10-19 |
| 阶段 | Phase B：技术设计（SDD） |

> 本文档承接 spec.md 的全部 19 条 FR、16 条 NFR、38 项验收标准与 5 个设计决策问题（D1–D5），只定义"怎么做（How）"，不改变"做什么（What）"。
> 文档约定：JS 接口使用 TypeScript/JSDoc 风格类型标注描述设计契约（实现语言为原生 JavaScript，编码阶段以 JSDoc `@typedef` 落实类型安全）；所有草稿文案（FAQ、套餐、评价、新站点描述）为设计基线，内容阶段可微调，但 **6 个友链 URL、data.js 原有 3 条数据逐字符锁定，不得变更**。

**章节覆盖映射**（团队任务要求的 10 项内容 ↔ 本文档章节）：

| # | 任务要求内容 | 本文档章节 |
| --- | --- | --- |
| 1 | 技术选型与总体架构（文件结构树） | 1.2 |
| 2 | D1–D5 设计决策与理由 | 1.3.1 |
| 3 | data.js 数据模型设计 | 4.2 |
| 4 | 页面结构与板块设计 | 1.3.2 |
| 5 | 设计系统规范（CSS 变量表） | 1.3.3 |
| 6 | SEO/AI 设计（meta/JSON-LD/robots/sitemap/llms.txt） | 1.3.4 |
| 7 | JS 模块划分与函数签名（可测点） | 1.2.2 + 2.2 |
| 8 | 测试策略 | 1.3.6 |
| 9 | 无障碍与性能设计要点 | 1.3.5 |
| 10 | 部署方案 | 1.3.7 |

---

# **1. 实现模型**

## **1.1 上下文视图**

本站是纯静态单页站点，部署于 GitHub Pages 用户仓库。它处于"站群数据维护 → 静态托管 → 三类消费方（人类访客 / 搜索引擎 / AI 系统）"的上下文中：

```
┌───────────────────────────────────────────────────────────────────┐
│                        GitHub Pages（静态托管）                     │
│   正式地址：https://huiyuan6.github.io/                             │
│   index.html · css/ · js/ · data.js · assets/                      │
│   robots.txt · sitemap.xml · llms.txt                              │
└────────┬──────────────────┬─────────────────────┬──────────────────┘
         │ HTTP GET         │ HTTP GET            │ HTTP GET
┌────────▼────────┐ ┌───────▼────────┐ ┌──────────▼─────────┐
│    访客浏览器     │ │  搜索引擎爬虫   │ │   AI 爬虫/助手      │
│  （JS 开启/关闭） │ │ （可不执行 JS） │ │  （llms.txt 优先）  │
└────────┬────────┘ └────────────────┘ └────────────────────┘
         │ <script src> 经典脚本加载（file:// 与 https:// 一致）
┌────────▼────────┐
│     data.js      │◄──── 站群站长：编辑条目 → git push → 自动发布
│ MEMBER_SITE_DATA │
│  （全局数据变量）  │
└──────────────────┘
```

### 参与方与交互契约

| 参与方 | 输入 | 输出/行为 | 对应需求 |
| --- | --- | --- | --- |
| 访客（人类） | 浏览页面、点击锚点/卡片/友链、切换主题、展开 FAQ | 平滑滚动、数据驱动卡片跳转（新标签页）、主题记忆 | FR-01~04, FR-06~13, FR-18~19 |
| 访客（无 JS 环境） | 禁用 JS 或脚本加载失败 | 静态基线内容完整可读，6 个友链可点击 | NFR-07 |
| 站群站长 | 编辑 data.js 条目（增删改） | 推送后合作站点板块/统计/页脚联动，无需改页面代码 | FR-14~17，3.1 节角色 |
| 搜索引擎爬虫 | 抓取 HTML | 语义化结构 + meta + JSON-LD + robots/sitemap 收录 | NFR-01~05 |
| AI 爬虫/助手 | 读取 llms.txt / HTML | 理解站点定位、板块结构、合作站点清单 | NFR-06~07 |
| GitHub Pages | 仓库默认分支根目录推送 | 自动发布静态资源 | NFR-15 |
| 本地开发者 | 双击 index.html（file://）或本地静态服务器 | 全功能可用（数据加载、主题、FAQ、友链） | NFR-14 |

### 关键上下文约束（决定架构形态）

1. **file:// 必须完整可用**：`fetch()`/XHR/ES Modules 在 file:// 下受 CORS 限制，因此数据只能经**经典 `<script src>` 标签**以全局变量方式注入（data.js），模块间依赖也用经典脚本 + 全局命名空间，不用 `import/export`。
2. **推送即部署**：无 CI、无构建，所有产物都是仓库根目录的静态文件；资源引用必须用**相对路径**（`css/style.css` 而非 `/css/style.css`），否则 file:// 下会解析到盘符根目录而 404。
3. **双真源问题**：SEO/无 JS 要求核心内容静态存在于 HTML；数据驱动要求可见内容随 data.js 变化。二者通过 D1 的"静态基线 + JS 一致性合并"调和。

## **1.2 服务/组件总体架构**

### 1.2.1 技术选型

| 维度 | 选型 | 理由（对应需求） |
| --- | --- | --- |
| 页面形态 | 单页 `index.html`（唯一页面） | 内容型导航站，spec 范围"单页为主"；单页保证 sitemap/canonical 简单可靠 |
| 标记 | 原生 HTML5 语义化标签（header/nav/main/section/article/footer/details） | NFR-01 语义化与标题层级；`<details>` 原生支持无 JS 的 FAQ 折叠 |
| 样式 | 单文件 `css/style.css`，CSS 自定义属性（设计令牌）+ 移动端优先媒体查询 | NFR-08 无依赖；D3 设计系统 |
| 脚本 | 原生 JavaScript（ES2018 语法基线），**经典脚本 + `defer`**，全局命名空间 `window.HY`，UMD-lite 包装兼容 Node `require` | NFR-08/14：无构建、无模块加载器、file:// 可用；D5 可测性 |
| 数据 | `data.js` 顶层 `var MEMBER_SITE_DATA = [...]`（浏览器全局变量 + Node 导出） | FR-14、6.1 改造硬约束 |
| 字体 | 系统字体栈（system-ui 中文优先），零网络字体 | NFR-08 体积预算、NFR-09 首屏性能（D3） |
| 图标 | 内联 SVG（stroke=currentColor），页面零图片请求 | NFR-08/09；favicon.svg + og-image.png 例外（见 1.3.4） |
| 主题 | `data-theme` 属性 + CSS 变量切换；`localStorage` 记忆；head 内联引导脚本防 FOUC | FR-03、D4 |
| 测试 | 浏览器端运行器 `tests/test.html`（file:// 可双击运行）+ 可选 `node --test` 双路径 | D5 |
| 部署 | GitHub Pages 用户仓库根目录，推送默认分支即发布 | NFR-15 |

**明确不引入**：任何前端框架、构建工具、包管理器运行时依赖、CSS 预处理器、Web 字体、ES Modules、Service Worker、第三方统计脚本。

### 1.2.2 前端分层架构

```
┌───────────────────────────── index.html ─────────────────────────────┐
│ 静态基线（SSR 等价物）：                                                │
│  全部板块的完整文本 + 6 张合作站点卡片 + 6 条页脚友链 + 全部 FAQ 问答    │
│  → 满足 SEO（爬虫不执行 JS 也能读到）与 NFR-07（禁用 JS 可用）          │
└───────────────┬──────────────────────────────────────────────────────┘
                │ <script src> defer × N（顺序即依赖：data → modules → main）
┌───────────────▼──────────────────────────────────────────────────────┐
│ 数据层  data.js        → 全局变量 MEMBER_SITE_DATA（6 条站点记录）      │
├──────────────────────────────────────────────────────────────────────┤
│ 逻辑层  js/modules/                                                 │
│   validate.js  纯函数：条目校验（FR-16 扩展字段兼容 / FR-17 坏数据隔离）│
│   merge.js     纯函数：URL 归一化 + 友链并集合并（D1 一致性合并）        │
│   render.js    HTML 字符串构建（纯）+ DOM 装配（渲染锚点契约 2.1.3）    │
│   theme.js     主题解析/应用/切换/持久化（FR-03，D4）                   │
│   accordion.js FAQ 单开模式（FR-10）                                  │
│   reveal.js    滚动入场动效 + reduced-motion 降级（FR-19）             │
│   nav.js       平滑滚动焦点管理 + 移动端汉堡菜单（FR-02，NFR-13）        │
├──────────────────────────────────────────────────────────────────────┤
│ 编排层  js/main.js     → init()：读数据 → 校验 → 渲染联动 → 绑定交互     │
└───────────────┬──────────────────────────────────────────────────────┘
                │ DOM 增强（仅在 JS 可用时发生）
                ▼
  ① 合作站点卡片按 data.js 全量重渲染（data.js 为唯一真源，FR-07/15）
  ② 数据统计区合作站点数联动（FR-05）
  ③ 页脚友链与静态基线并集合并（基线 6 条永不删除，FR-12 防御）
  ④ 主题切换/记忆、FAQ 单开、入场动效、锚点焦点、年份回填
```

分层规则：**逻辑层纯函数不触碰 DOM**（输入→输出，可在 Node 中测）；**DOM 装配函数不做业务计算**（只消费纯函数的结果）；**编排层不含可测逻辑**（只做装配与绑定）。

### 1.2.3 文件结构树（每个文件一句话职责）

```
huiyuan6.github.io/                       ← GitHub Pages 用户仓库根目录
├── index.html                            ← 唯一页面：静态基线内容 + head 元数据 + JSON-LD + 脚本装配
├── data.js                               ← 站群站点清单：暴露全局变量 MEMBER_SITE_DATA（6 条目，见 4.2）
├── css/
│   └── style.css                         ← 全站唯一样式表：设计令牌（CSS 变量）+ 布局 + 组件 + 动效 + 暗色主题
├── js/
│   ├── main.js                           ← 编排入口 init()：读数据→校验→渲染联动→绑定全部交互
│   └── modules/
│       ├── validate.js                   ← 纯函数：单条目/列表校验（必填字段、URL 合法性、扩展字段兼容）
│       ├── merge.js                      ← 纯函数：URL 归一化 normalizeUrl、友链并集合并 mergeLinkLists
│       ├── render.js                     ← HTML 字符串构建（siteCardHTML 等，纯）+ DOM 装配（renderSiteCards 等）
│       ├── theme.js                      ← 主题三态解析、应用、切换、localStorage 持久化、系统偏好跟随
│       ├── accordion.js                  ← FAQ 手风琴单开模式（details 互斥）
│       ├── reveal.js                     ← IntersectionObserver 滚动入场动效 + 无 IO/reduced-motion 降级
│       └── nav.js                        ← 锚点平滑滚动 + 焦点管理、移动端汉堡菜单开合
├── assets/
│   ├── favicon.svg                       ← 站点图标（渐变圆角方块 + 品牌字形，<2KB）
│   └── og-image.png                      ← 社交分享卡片图（1200×630，编码阶段从 SVG 导出，不计入资源预算）
├── robots.txt                            ← 允许全部抓取 + 声明 sitemap（NFR-05）
├── sitemap.xml                           ← 首页规范 URL（NFR-05）
├── llms.txt                              ← AI 爬虫纯文本站点概览（NFR-06）
├── tests/
│   ├── test.html                         ← 浏览器测试运行器：双击即跑（file:// 兼容），绿/红结果面板
│   ├── assert.js                         ← 轻量断言库：ok/eq/deepEq/throws + 汇总报告
│   ├── cases.js                          ← 双运行器共享的用例注册表（UMD-lite，浏览器与 Node 共用）
│   ├── browser-runner.js                 ← 浏览器端执行器：跑共享用例 + DOM 类用例，渲染结果面板
│   └── node/
│       └── run-tests.js                  ← Node 端执行器：node --test 加载共享用例（纯函数 + data.js 契约）
├── README.md                             ← 更新为项目说明：本地运行/测试/部署指引
└── .codearts/
    └── specs/
        └── membership-benefits-site/
            ├── spec.md                   ← Phase A 需求规格（已冻结）
            ├── design.md                 ← 本文档（Phase B）
            └── tasks.md                  ← Phase C 任务拆解（后续阶段产出）
```

### 1.2.4 脚本加载顺序与渲染流水线

`index.html` 的 head 中脚本装配（顺序即依赖，`defer` 保证按序执行且不阻塞解析）：

```html
<!-- ① 主题引导：内联、不可 defer，必须在首帧绘制前设置 data-theme（防 FOUC，见 D4） -->
<script> /* ~10 行：读 localStorage → 无记忆则 matchMedia → 设置 html[data-theme] */ </script>
<!-- ② 数据与模块：defer 经典脚本，按书写顺序执行 -->
<script src="data.js" defer></script>
<script src="js/modules/validate.js" defer></script>
<script src="js/modules/merge.js" defer></script>
<script src="js/modules/render.js" defer></script>
<script src="js/modules/theme.js" defer></script>
<script src="js/modules/accordion.js" defer></script>
<script src="js/modules/reveal.js" defer></script>
<script src="js/modules/nav.js" defer></script>
<script src="js/main.js" defer></script>
```

渲染流水线（时序）：

1. **HTML 解析**：静态基线全部内容立即可见（禁用 JS 的最终视图，也是爬虫视图）。
2. **首帧绘制**：内联主题脚本已在 `<html>` 上设置 `data-theme`，CSS 变量按主题就位，无闪烁。
3. **defer 脚本按序执行**：`data.js` 注入 `MEMBER_SITE_DATA` → 各模块挂载到 `window.HY` → `main.js` 的 `init()` 运行。
4. **init() 数据联动**（详见 D1 算法）：校验 → 有效条目 ≥1 时重渲染合作站点卡片、更新统计数字、合并页脚友链；无效条目仅 `console.warn` 隔离。
5. **交互绑定**：主题切换、FAQ 单开、入场动效观察器、锚点焦点、移动端菜单、页脚年份回填。
6. **稳态**：页面行为 = 静态基线 + data.js 增强；任何 JS 环节失败都回退到步骤 1 的静态视图（逐级降级，不白屏）。

### 1.2.5 资源体积预算（NFR-08 ≤200KB，不含图片）

| 资源 | 预算 | 说明 |
| --- | --- | --- |
| index.html | ≤ 50 KB | 静态基线 + JSON-LD + 内联 SVG 图标 |
| css/style.css | ≤ 25 KB | 设计令牌 + 全部组件样式 |
| js/（main + 7 modules） | ≤ 22 KB | 未压缩源码即预算口径 |
| data.js | ≤ 2 KB | 6 条目 |
| tests/（不计入线上预算） | — | 不被 index.html 引用，不参与线上加载 |
| **核心资源合计** | **≤ 99 KB** | 预算余量 ≥100KB，达标 |
| assets/og-image.png | ≤ 100 KB | 图片，按 spec 不计入 200KB 预算 |
| assets/favicon.svg | ≤ 2 KB | 图片，同上 |

## **1.3 实现设计文档**

### 1.3.1 设计决策（D1–D5 最终决策）

#### D1 数据驱动渲染与无 JS 可用性的实现路径

**候选方案**：a) 构建期内联数据（需构建步骤，违反 NFR-08，排除）；b) `<noscript>` 双写降级（维护两份 HTML，`<noscript>` 内内容对启用 JS 的爬虫不可见，SEO 弱化，排除）；c) **静态基线 + JS 增强（进度增强，采纳）**。

**最终决策**：采用"静态基线 + JS 一致性合并"双层渲染：

1. **静态基线层**：`index.html` 中静态写死全部核心内容——所有板块的标题与正文、6 张合作站点卡片（含券宝/聚合优惠/号卡）、6 条页脚友链、全部 FAQ 问答。这是编码时对 data.js 的一次"快照"，是禁用 JS 场景的完整视图（NFR-07），也是搜索引擎与 AI 爬虫读取的第一真源。
2. **JS 增强层**：`data.js` 经 `<script src>` 加载暴露 `MEMBER_SITE_DATA`，`main.js` 执行以下联动算法（伪码）：

```
report = validateEntries(MEMBER_SITE_DATA ?? [])
若 report.valid.length ≥ 1：
    renderSiteCards(#partner-list, report.valid)      // ① 合作站点卡片全量重渲染，data.js 为唯一真源（FR-07/15）
    updateStat(#stat-sites, report.valid.length)       // ② 统计区合作站点数联动（FR-05）
若 MEMBER_SITE_DATA 未加载（脚本失败）或 report.valid.length = 0：
    保留静态基线卡片与统计数字（页面不空、不白屏），console.warn 定位原因   // ③ 降级保护
report.invalid 逐条 console.warn('[data] 条目 #i 无效: …')               // ④ 坏数据隔离（FR-17）
syncFooterLinks(#footer-links, report.valid)           // ⑤ 页脚友链合并（见下）
```

3. **页脚友链合并规则（与①的区别是刻意设计的不对称）**：
   - 合作站点板块：JS 可用时 **data.js 全量替换**（删除、改序、改名都生效）——因为 FR-07/15 明确要求渲染结果与 data.js 完全一致；
   - 页脚友链：**并集合并，永不删除静态基线 6 条**——因为 FR-12 是硬性验收基线（6 条 URL 逐字符锁定），即使 data.js 被误删条目，页脚仍完整，形成防御。合并算法：以静态 DOM 中解析出的 6 条为 base，data.js 有效条目为 override，按归一化 URL 去重，同 URL 时 name/desc 以 data.js 为准，新条目按 data.js 顺序追加到末尾（`mergeLinkLists`，见 2.2）。

**理由**：同时满足 FR-07/15（数据驱动）与 NFR-07/FR-12（无 JS 可用）这对表面冲突的需求；任何一层失败都有完整回退；爬虫与 AI 无需执行 JS 即获得全量内容（SEO 最优）。

**维护成本约定**：站长日常只改 data.js（追加即生效）；静态基线允许与 data.js 短暂不一致（JS 会以 data.js 为准修正可见结果），但**每次发版时应把 data.js 最新内容同步进静态基线**，保持无 JS 视图新鲜——此约定写入 tasks.md 与 README 维护说明。

#### D2 券宝/聚合优惠/号卡 3 个新增友链的数据管理方式

**候选方案**：a) **并入 data.js 统一管理（采纳）**；b) 独立友链配置（如 `FRIEND_LINKS` 数组或 main.js 常量）与 data.js 分离。

**最终决策**：**6 个站点全部并入 data.js**，作为站点条目统一管理；合作站点板块与页脚共用同一数据源（经 D1 的差异化消费规则）。

**理由**：

1. spec 6.3 明确表述 6 站"同时是合作站点展示的数据来源"，全量入 data.js 是对规格最直接的落实；
2. FR-05/FR-07 的验收口径是"渲染条目数、顺序、内容与 data.js 一致"——不做任何过滤的全量渲染是最不易产生验收歧义的实现（若引入"仅友链不展示"的过滤标记，"有效条目数"的语义就会分裂）；
3. 站长单一数据入口（spec 3.1 角色定义：通过编辑 data.js 维护合作站点清单），追加新站后合作站点卡片、统计数字、页脚友链三处同时生效，零代码改动（FR-15）；
4. 页面内容更丰富（6 张站点卡片 vs 3 张），契合"页面元素不要太少"的原始诉求；
5. 语义上，本站群语境中"合作站点"与"互跳友链"同源——原 3 站既是合作站点也是友链，新增 3 站同样与本站互跳，获得同等展示合理。
6. 未来若确需区分"仅页脚友链的合作方"，data.js 已预留 `type` 扩展字段位（本期渲染器**不消费**该字段，仅作为约定占位，符合 FR-16 扩展字段兼容原则）。

#### D3 设计系统的视觉方向

**候选方向**：深蓝+紫罗兰渐变（专业/会员尊贵感）vs 青绿+琥珀（清爽/工具感）。

**最终决策**：**深靛蓝 + 紫罗兰渐变**为品牌主视觉，琥珀金为点缀强调色——"会员尊享"的心智更贴合"会员权益"品牌定位；暗色主题以深海军蓝底（非纯黑）保持层次。完整设计令牌表（色彩/字体/间距/圆角/阴影/断点/动效）见 1.3.3。

**要点**：

- **字体**：系统字体栈 `system-ui` 中文优先（PingFang SC / Microsoft YaHei / Noto Sans CJK SC），**零字节字体成本**，直接满足 NFR-08/09 性能预算；数字使用 `font-variant-numeric: tabular-nums` 对齐统计区。
- **质感策略**（"不像新手站长"）：统一的 8px 栅格间距节奏、卡片悬浮阴影渐升、品牌渐变仅用于 Hero/CTA/品牌标识等关键位置（克制使用）、图标统一 24px 线性风格 stroke=1.75、微交互（hover 上移+阴影、focus-visible 品牌色描边、滚动入场渐显上移）。
- 断点移动端优先：base(<768) → md 768（平板）→ lg 1024（桌面）→ xl 1280（大屏），覆盖 NFR-13 三类设备形态。

#### D4 暗色模式的技术策略

**最终决策**：**`data-theme` 属性 + head 内联引导脚本 + localStorage 记忆 + matchMedia 系统跟随**：

1. **三态模型**：存储值 `'light' | 'dark' | null`（null = 从未手动选择）。显式选择后持久化到 `localStorage['hy-theme']`（key 固定，值仅这两个字面量）。
2. **FOUC 规避**：`<head>` 内一段约 10 行的内联同步脚本（不可 defer），在首帧绘制前完成：读 localStorage → 无记忆则 `matchMedia('(prefers-color-scheme: dark)')` → 在 `<html>` 上设置 `data-theme="light|dark"`。CSS 侧只需**一份** `[data-theme="dark"]` 令牌块（无需 `@media` 备份副本，避免双份暗色变量维护漂移）。
3. **系统跟随的活性**：无记忆状态下监听 `matchMedia` 的 `change` 事件，系统切换深浅色时页面实时跟随；一旦用户手动切换过，则以记忆值为准不再跟随。
4. **file:// 一致性**：主流浏览器（Chrome/Edge/Firefox/Safari）在 file:// 下 localStorage 可用，与 GitHub Pages 行为一致；所有读写包 `try/catch`，localStorage 不可用（隐私模式/受限环境）时降级为"会话内生效、不记忆"，功能不报错（NFR-14）。
5. **切换控件**：header 中图标按钮（内联 SVG 日/月图标，`aria-hidden`），`aria-label` 随状态更新（"切换到暗色主题/切换到亮色主题"），点击即时切换（改 `data-theme` + 写 localStorage），无刷新。
6. **原生控件适配**：`:root { color-scheme: light }` / `[data-theme="dark"] { color-scheme: dark }`，保证滚动条、表单控件原生配色随主题。
7. 禁用 JS 时固定亮色主题（内容完整可用，NFR-07 只要求内容不要求主题切换）。

#### D5 纯静态站点的单元测试可测性

**最终决策**：**模块 UMD-lite 双环境包装 + 纯函数拆分 + 浏览器运行器为主、Node 为辅的双路径测试**：

1. **可测性边界（模块化原则）**：
   - 业务计算全部下沉为**纯函数**（validate/merge/escapeHtml/siteCardHTML 等，输入→输出、无 DOM、无全局副作用），可在任意环境断言；
   - DOM 装配函数（renderSiteCards/syncFooterLinks 等）薄壳化：只做"取锚点 → 调纯函数生成 HTML → 写回"三步；
   - 副作用依赖（localStorage、matchMedia）通过参数注入（`StorageLike` 接口），测试传 mock；
   - 每个模块文件用 UMD-lite 包装：浏览器挂到 `window.HY.*`，Node 下 `module.exports`（约 5 行样板，见 2.1.1），`data.js` 同样附带 Node 导出分支。
2. **浏览器运行器（主路径，零依赖）**：`tests/test.html` 双击即跑（file:// 兼容），加载全部模块 + `assert.js` 轻量断言 + `cases.js` 共享用例注册表 + `browser-runner.js`，执行纯函数用例与 DOM 用例（在 detached 容器/真实页面上渲染断言），页面顶部显示绿/红汇总面板（"42 passed / 0 failed"）。
3. **Node 路径（可选，本机有 Node ≥18 时）**：`node --test tests/node/`，`require()` UMD 模块与 data.js，运行同一份 `cases.js` 中的纯函数用例 + data.js 数据契约用例（6 条基线 URL 逐字符校验、原 3 条数据回归保护）。
4. **用例单一事实源**：所有用例定义在 `tests/cases.js`（同样 UMD-lite），两个执行器消费同一注册表，避免双份用例漂移；DOM 强相关用例标记为 `browser-only`，Node 执行器自动跳过。
5. 完整用例清单见 1.3.6。

### 1.3.2 页面结构与板块设计

#### 页面语义骨架（单一 h1，层级不跳级，NFR-01）

```html
<body>
  <a class="skip-link" href="#main">跳到主内容</a>                      <!-- 无障碍跳过链接 -->
  <header class="site-header" id="top">                                <!-- 品牌锚点：回到顶部目标 -->
    <nav class="site-nav" id="site-nav" aria-label="主导航">
      <a class="brand" href="#top">[SVG 徽标] 会员权益</a>               <!-- h1 不放这里；品牌为链接 -->
      <button id="nav-toggle" aria-expanded="false" aria-controls="site-nav-links">☰</button>
      <ul id="site-nav-links">
        <li><a href="#categories">权益分类</a></li>
        <li><a href="#partners">合作站点</a></li>
        <li><a href="#hot">热门权益</a></li>
        <li><a href="#faq">常见问题</a></li>
      </ul>
      <button id="theme-toggle" aria-label="切换到暗色主题">[日/月 SVG]</button>
    </nav>
  </header>
  <main id="main">
    <section class="hero" id="hero">           <h1>…</h1> … </section>   <!-- 全页唯一 h1 -->
    <section class="stats" id="stats">          <h2 class="visually-hidden">数据统计</h2> … </section>
    <section class="categories" id="categories"><h2>权益分类</h2> … </section>
    <section class="partners" id="partners">    <h2>合作站点</h2> … </section>   <!-- 数据驱动锚点 -->
    <section class="steps" id="steps">          <h2>使用步骤</h2> … </section>
    <section class="hot" id="hot">              <h2>热门权益</h2> … </section>
    <section class="faq" id="faq">              <h2>常见问题</h2> … </section>
    <section class="trust" id="trust">          <h2>用户评价与信任保障</h2> … </section>
  </main>
  <footer class="site-footer">
    <nav aria-label="友情链接"><h2>友情链接</h2>
      <ul id="footer-links"> … 6 条静态基线友链 … </ul>                          <!-- 数据合并锚点 -->
    </nav>
    <p>© <span id="footer-year">2026</span> 会员权益 · <a href="#top" id="back-top">回到顶部</a></p>
  </footer>
</body>
```

每个 `<section>` 均带 `tabindex="-1"`（JS 锚点导航的目标焦点，FR-02）；`scroll-margin-top: var(--header-h)` 保证锚点定位不被吸顶导航遮挡。

#### 板块设计总表

| 板块（锚点 id） | HTML 语义结构概要 | 渲染方式 | JS 渲染锚点 / 联动 | 对应需求 |
| --- | --- | --- | --- | --- |
| 顶部导航 `#top`（header） | `header > nav > a.brand + button#nav-toggle + ul#site-nav-links(4 锚点) + button#theme-toggle` | 纯静态 | `nav.js`：平滑滚动+焦点；汉堡开合；`theme.js`：切换 | FR-01/02/03 |
| Hero `#hero` | `section.hero > div.hero__inner > h1 + p.hero__sub + p.hero__cta(a.btn--primary→#categories, a.btn--ghost→#partners) + div.hero__visual(装饰渐变光斑，aria-hidden)` | 纯静态 | 无（CSS 渐变+浮动微动效） | FR-04 |
| 数据统计 `#stats` | `section > ul.stats-grid > li.stat-item×3`，每项 `p.stat-item__value + p.stat-item__label`（值元素带 `data-stat` 属性） | 静态数字 + JS 联动 | `#stat-sites[data-stat=sites]`=data.js 有效条目数；`#stat-categories`=DOM 计数 `.category-card`；`#stat-packages`=DOM 计数 `.hot-card`；入场时 400ms 数字滚动（reduced-motion 直显） | FR-05 |
| 权益分类 `#categories` | `section > h2 + p 板块导语 + ul.category-grid > li.category-card×6`，卡片 `span.category-card__icon(SVG) + h3 + p + a.category-card__link` | 纯静态（6 类） | 无（链接指向 #partners/#hot） | FR-06 |
| 合作站点 `#partners` | `section > h2 + p 导语（说明收录规则）+ ul#partner-list.partner-grid > li.partner-card×6（静态基线）`；卡片 `span.partner-card__avatar(icon/首字) + h3 名称 + p 描述 + a.partner-card__link(访问入口)` | **静态基线 + JS 全量重渲染** | `#partner-list[data-render=partner-cards]`：JS 有效时 innerHTML 替换为 `siteCardHTML` 序列 | FR-07/15 |
| 使用步骤 `#steps` | `section > h2 + ol.steps > li.step-item×4`，每步 `span.step-item__no(01-04) + h3 + p` | 纯静态 | 无 | FR-08 |
| 热门权益 `#hot` | `section > h2 + ul.hot-grid > li.hot-card×4`，卡片 `h3 套餐名 + p 适用场景 + ul 权益亮点(2-3 条) + a 前往入口` | 纯静态 | 无 | FR-09 |
| FAQ `#faq` | `section > h2 + div.faq-list > details.faq-item[name="faq"]×6`，每项 `summary(问题) + div.faq-item__answer(答案)` | 纯静态（`<details>` 原生无 JS 可折叠） | `accordion.js`：toggle 事件互斥单开（name 属性为浏览器原生互斥增强，JS 保证全兼容） | FR-10、NFR-07 |
| 信任背书 `#trust` | `section > h2 + div.trust-badges(3 项保障：人工核验收录/官方渠道直达/定期复检更新) + blockquote.testimonial×3（含 figcaption 署名）` | 纯静态 | 无 | FR-11 |
| 页脚友链 `#footer-links` | `footer > nav > h2 + ul#footer-links > li.footer-link > a(锚文本=站点名，target=_blank rel="noopener noreferrer")×6` | **静态基线 + JS 并集合并** | `#footer-links[data-render=footer-links]`：`syncFooterLinks` 合并 data.js（基线永不删除） | FR-12 |
| 页脚信息 | `p 版权 + span#footer-year + a#back-top→#top` | 静态 | JS 回填当前年份；回到顶部经 CSS `scroll-behavior:smooth` 平滑（无 JS 也可用原生锚点跳转） | FR-13 |

#### 内容基线（编码阶段照此落稿，内容阶段可润色）

- **Hero**：h1「一站式会员权益聚合导航」；副标题「视频、音乐、网盘、社媒、流量话费——把值得开的会员，一次找齐。」；CTA「浏览权益分类」（主按钮→#categories）+「查看合作站点」（次按钮→#partners）。
- **权益分类 6 类**（≥4 达标）：视频会员 / 音乐会员 / 网盘·存储 / 社交媒体服务 / 流量话费 / 组合套餐；每卡 24px 线性图标 + 一句话说明 + 引导链接。
- **使用步骤 4 步**（≥3 达标）：① 浏览权益分类 → ② 挑选热门套餐 → ③ 前往合作站点 → ④ 开通享受权益。
- **热门权益 4 条**（≥3 达标）：追剧套餐（视频会员+大流量）/ 听歌套餐（音乐会员+流量包）/ 办公云盘套餐（网盘扩容备份）/ 社媒经营套餐（社媒服务+组合权益），每条含名称、适用场景、权益亮点列表。
- **FAQ 6 问**（≥5 达标）：站点是做什么的 / 开通有优惠吗 / 如何选套餐 / 合作站点如何收录 / 支付售后在哪完成 / 遇到问题如何反馈。**FAQ 文案必须与 JSON-LD FAQPage 逐字一致（NFR-04）**。
- **信任背书**：3 项保障徽章 + 3 条用户评价（追剧爱好者/学生用户/自媒体运营视角）。
- **合作站点 6 卡与页脚 6 友链**：name/url/desc 取自 4.2 节 data.js 基线（同源快照）。

#### DOM 命名规范

- **类名**：BEM-lite——`块__元素--修饰`，全小写连字符（`.partner-card__avatar`、`.btn--primary`、`.faq-item`）；JS 状态类以 `is-` 前缀（`is-visible`、`is-open`、`nav-open`）。
- **id**：仅用于 JS 锚点与板块锚点，kebab-case（`#partner-list`、`#theme-toggle`、`#stat-sites`）。
- **data- 属性（渲染锚点契约）**：`data-render="partner-cards" | "footer-links"` 标记 JS 渲染容器；`data-stat="sites|categories|packages"` 标记统计值元素；`data-reveal` 标记入场动效元素。
- **禁止事项**：id 与类名不得承担样式之外的隐式协议；样式类与行为类分离（行为类不写样式，只作选择器）。

### 1.3.3 设计系统规范（设计令牌）

#### 色彩令牌（明/暗双主题对照）

品牌策略（D3）：深靛蓝 `#4F46E5` → 紫罗兰 `#7C3AED` 渐变为主视觉；暗色主题用深海军蓝底（非纯黑）。**所有文本色与背景组合的对比度均已按 WCAG 2.1 AA 预校验**（普通文本 ≥4.5:1；大字号/图标 ≥3:1，见括号内比值）。

| 令牌 | 亮色值 | 暗色值 | 用途 |
| --- | --- | --- | --- |
| `--color-bg` | `#f8fafc` | `#0b1120` | 页面底色 |
| `--color-surface` | `#ffffff` | `#131a2b` | 卡片/面板底色 |
| `--color-surface-2` | `#f1f5f9` | `#1b2438` | 次级面板/代码块/图标底 |
| `--color-text` | `#0f172a`（17.9:1） | `#e2e8f0`（14.3:1） | 正文主文本 |
| `--color-text-muted` | `#475569`（7.6:1） | `#a3b3cf`（7.2:1） | 次级文本/描述 |
| `--color-text-faint` | `#64748b`（4.8:1，仅限大字号与辅助信息） | `#8b9bb8`（4.6:1，同限制） | 弱化文本 |
| `--color-primary` | `#4f46e5`（6.0:1 on 白） | `#818cf8`（6.9:1 on 底） | 主色/链接/主按钮 |
| `--color-primary-strong` | `#4338ca` | `#a5b4fc` | 主色 hover 态 |
| `--color-primary-soft` | `#eef2ff` | `rgba(129,140,248,.14)` | 图标底/标签底 |
| `--color-accent` | `#b45309`（6.0:1） | `#fbbf24`（8.9:1） | 琥珀强调：徽章/高亮/步骤序号 |
| `--color-gradient-from` | `#4f46e5` | `#6366f1` | 品牌渐变起点（Hero/CTA/头像环） |
| `--color-gradient-to` | `#7c3aed` | `#a78bfa` | 品牌渐变终点 |
| `--color-border` | `#e2e8f0` | `#2a3550` | 边框/分隔线 |
| `--color-ring` | `#4f46e5` | `#818cf8` | focus-visible 描边 |
| `--color-on-primary` | `#ffffff` | `#0b1120` | 主按钮上的文本 |
| `--color-success` | `#15803d`（4.8:1） | `#4ade80`（8.5:1） | 测试通过/信任徽章 |
| `--shadow-color` | `rgba(15,23,42,.08)` | `rgba(0,0,0,.5)` | 阴影色基 |

组织方式：`:root { …亮色令牌…; color-scheme: light }`，`html[data-theme="dark"] { …暗色令牌…; color-scheme: dark }`——**单一暗色块**（D4），组件样式只引用令牌、不写裸色值。

#### 字体令牌

| 令牌 | 值 | 用途 |
| --- | --- | --- |
| `--font-sans` | `system-ui, -apple-system, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif` | 全站正文（零网络字体，D3） |
| `--font-mono` | `ui-monospace, "Cascadia Mono", Consolas, monospace` | 统计数字（配合 `font-variant-numeric: tabular-nums`） |
| `--text-xs` ~ `--text-xl` | `0.75 / 0.875 / 1 / 1.125 / 1.25rem` | 常规字号阶梯 |
| 流式字号 | h1：`clamp(1.9rem, 1.2rem + 3vw, 3.25rem)`；板块 h2：`clamp(1.35rem, 1.1rem + 1.2vw, 2rem)` | 移动端优先自适应（NFR-13） |
| 行高 | 正文 `1.7`，标题 `1.25`，中文优先 readability | |

#### 间距 / 圆角 / 阴影令牌

| 类别 | 令牌与值 |
| --- | --- |
| 间距（4px 基数） | `--space-1:.25rem` `--space-2:.5rem` `--space-3:.75rem` `--space-4:1rem` `--space-6:1.5rem` `--space-8:2rem` `--space-12:3rem` `--space-16:4rem` `--space-24:6rem`（板块间距用 12/16/24 阶梯） |
| 圆角 | `--radius-sm:6px`（按钮/输入） `--radius-md:10px`（卡片） `--radius-lg:16px`（Hero 容器/大面板） `--radius-full:999px`（胶囊/徽章/头像） |
| 阴影 | `--shadow-sm: 0 1px 2px var(--shadow-color), 0 1px 3px var(--shadow-color)`；`--shadow-md: 0 4px 10px var(--shadow-color)`；`--shadow-lg: 0 12px 28px var(--shadow-color)`（卡片默认 sm，hover 升至 lg） |
| 布局 | `--container-max:1200px`（内容最大宽度，左右 padding 16px→24px）；`--header-h:64px`（吸顶导航高度=scroll-margin-top） |

#### 断点令牌（文档化常量，@media 中字面量使用——CSS 变量不能用于媒体查询条件）

| 名称 | 值 | 目标设备 | 典型调整 |
| --- | --- | --- | --- |
| base | `< 768px` | 手机（移动端优先默认态） | 单列卡片、汉堡菜单 |
| md | `≥ 768px` | 平板 | 分类/站点卡片 2 列 |
| lg | `≥ 1024px` | 桌面 | 3 列卡片、横向步骤条、桌面导航 |
| xl | `≥ 1280px` | 大屏 | 容器封顶 1200px 居中 |

#### 动效规范（FR-18/19）

| 令牌/规则 | 值 | 用途 |
| --- | --- | --- |
| `--dur-fast` | `150ms` | hover/focus 反馈、颜色过渡 |
| `--dur-base` | `240ms` | 卡片位移阴影、FAQ 展开 |
| `--dur-slow` | `420ms` | 滚动入场、Hero 光斑浮动 |
| `--ease-out` | `cubic-bezier(.16,1,.3,1)` | 入场动效（expo-out，收尾柔和） |
| `--ease-standard` | `cubic-bezier(.4,0,.2,1)` | 通用状态过渡 |
| 入场动效 | `[data-reveal]`：`opacity 0→1` + `translateY(16px)→0`，`--dur-slow` + `--ease-out`；由 `reveal.js` 加 `is-visible` 触发 | FR-19 |
| hover 反馈 | 卡片：`translateY(-3px)` + 阴影 sm→lg；链接/按钮：颜色→`--color-primary-strong` + 底部 2px 渐变下划线展开 | FR-18 |
| focus 反馈 | `:focus-visible { outline: 2px solid var(--color-ring); outline-offset: 2px }`（全局，不摘除） | FR-18/NFR-10 |
| 减少动态 | `@media (prefers-reduced-motion: reduce)`：全站 `animation/transition: none`、`[data-reveal]{opacity:1;transform:none}`、`html{scroll-behavior:auto}`——**内容完整性不受影响** | FR-19 |
| 统计数字滚动 | rAF 400ms count-up；reduced-motion 下直接显示终值 | FR-05 微交互 |

### 1.3.4 SEO / AI 友好设计

生产基址（全部绝对 URL 统一使用）：`https://huiyuan6.github.io/`

#### 完整 head meta 清单（草案）

```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>会员权益｜视频·音乐·网盘等会员优惠聚合导航</title>
<meta name="description" content="会员权益（HuiYuan）聚合导航官网：收录视频会员、音乐会员、网盘扩容、社交媒体服务、流量话费等数字权益优惠，提供权益分类、热门套餐推荐与合作站点入口，一站式找到适合你的会员优惠。">
<meta name="keywords" content="会员权益,会员优惠,视频会员,音乐会员,网盘扩容,流量话费,会员套餐,优惠导航">
<meta name="author" content="会员权益">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://huiyuan6.github.io/">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f8fafc">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0b1120">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<!-- Open Graph（NFR-03） -->
<meta property="og:site_name" content="会员权益">
<meta property="og:title" content="会员权益｜视频·音乐·网盘等会员优惠聚合导航">
<meta property="og:description" content="视频、音乐、网盘、社媒、流量话费等数字权益优惠聚合导航，一站式找到适合你的会员优惠。">
<meta property="og:type" content="website">
<meta property="og:url" content="https://huiyuan6.github.io/">
<meta property="og:image" content="https://huiyuan6.github.io/assets/og-image.png">
<meta property="og:locale" content="zh_CN">
<!-- Twitter Card（NFR-03） -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="会员权益｜视频·音乐·网盘等会员优惠聚合导航">
<meta name="twitter:description" content="视频、音乐、网盘、社媒、流量话费等数字权益优惠聚合导航，一站式找到适合你的会员优惠。">
<meta name="twitter:image" content="https://huiyuan6.github.io/assets/og-image.png">
```

og-image 规格：1200×630 PNG（≤100KB），品牌渐变底 + "会员权益"字标 + 副标语；编码阶段从 SVG 源导出，**绝对 URL 引用**。

#### JSON-LD 结构化数据（四实体 @graph 草案，NFR-04）

单条 `<script type="application/ld+json">` 内嵌于 head：

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://huiyuan6.github.io/#website",
      "url": "https://huiyuan6.github.io/",
      "name": "会员权益",
      "alternateName": "HuiYuan",
      "description": "会员权益聚合导航官网：视频、音乐、网盘、社媒、流量话费等数字权益优惠导航。",
      "inLanguage": "zh-CN",
      "publisher": { "@id": "https://huiyuan6.github.io/#organization" }
    },
    {
      "@type": "Organization",
      "@id": "https://huiyuan6.github.io/#organization",
      "name": "会员权益",
      "url": "https://huiyuan6.github.io/",
      "logo": {
        "@type": "ImageObject",
        "url": "https://huiyuan6.github.io/assets/og-image.png"
      }
    },
    {
      "@type": "ItemList",
      "@id": "https://huiyuan6.github.io/#partners",
      "name": "合作站点清单",
      "numberOfItems": 6,
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "运来网络",   "url": "https://wcbblll.99kami.com" },
        { "@type": "ListItem", "position": 2, "name": "好运权益",   "url": "https://wcbblll.im01.cn" },
        { "@type": "ListItem", "position": 3, "name": "福来流量站", "url": "http://35568.qcxmt.cn" },
        { "@type": "ListItem", "position": 4, "name": "券宝",       "url": "https://jdjdndn.github.io/" },
        { "@type": "ListItem", "position": 5, "name": "聚合优惠",   "url": "https://wcbblll.cc" },
        { "@type": "ListItem", "position": 6, "name": "号卡",       "url": "https://dlhaoka.com" }
      ]
    },
    {
      "@type": "FAQPage",
      "@id": "https://huiyuan6.github.io/#faq",
      "mainEntity": [
        { "@type": "Question", "name": "会员权益站是做什么的？",
          "acceptedAnswer": { "@type": "Answer", "text": "本站是会员权益聚合导航官网，收录视频、音乐、网盘、社交媒体、流量话费等数字权益优惠信息，帮助你快速找到合适的会员开通渠道。" } },
        { "@type": "Question", "name": "通过本站开通会员有优惠吗？",
          "acceptedAnswer": { "@type": "Answer", "text": "本站收录的合作站点会不定期提供会员优惠活动，具体折扣与活动规则以各站点页面展示为准。" } },
        { "@type": "Question", "name": "如何选择适合自己的会员套餐？",
          "acceptedAnswer": { "@type": "Answer", "text": "可先在权益分类中按需求浏览，再到热门权益查看推荐组合，最后对比合作站点的活动后前往开通。" } },
        { "@type": "Question", "name": "合作站点是怎么收录的？",
          "acceptedAnswer": { "@type": "Answer", "text": "合作站点经人工核验后收录，并定期复检可用性与内容相关性，保障链接质量。" } },
        { "@type": "Question", "name": "支付与售后在哪里完成？",
          "acceptedAnswer": { "@type": "Answer", "text": "本站仅提供导航入口，会员商品的浏览、下单、支付与售后均在对应合作站点完成。" } },
        { "@type": "Question", "name": "遇到问题如何反馈？",
          "acceptedAnswer": { "@type": "Answer", "text": "可通过合作站点内的客服渠道反馈，或通过本站底部友情链接访问相关站点获取帮助。" } }
      ]
    }
  ]
}
```

**一致性硬规则**：FAQPage 的问答与页面 `#faq` 内 `details` 逐字一致；ItemList 与页脚友链/合作站点卡片一致（NFR-04 验收点）。任何 FAQ 文案修改必须双处同步。

#### robots.txt（根目录，NFR-05）

```
User-agent: *
Allow: /

Sitemap: https://huiyuan6.github.io/sitemap.xml
```

（默认允许全部抓取，含 AI 爬虫——spec 定位为 AI 友好，不做 UA 黑名单。）

#### sitemap.xml（根目录，NFR-05）

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://huiyuan6.github.io/</loc>
    <lastmod>2026-10-19</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

#### llms.txt（根目录，NFR-06，草案）

```
# 会员权益（HuiYuan）

> 会员权益聚合导航官网：收录视频、音乐、网盘、社交媒体、流量话费等数字会员权益优惠，提供分类导航、热门套餐推荐与合作站点入口。

站点地址: https://huiyuan6.github.io/
语言: 简体中文

## 核心板块
- 权益分类: https://huiyuan6.github.io/#categories — 视频/音乐/网盘/社媒/流量话费/组合套餐六大分类
- 合作站点: https://huiyuan6.github.io/#partners — 经人工核验的站群合作站点清单
- 热门权益: https://huiyuan6.github.io/#hot — 追剧/听歌/办公云盘/社媒经营等推荐套餐
- 使用步骤: https://huiyuan6.github.io/#steps — 四步完成权益开通
- 常见问题: https://huiyuan6.github.io/#faq — 站点定位、优惠、收录标准、支付售后等问答

## 合作站点
- 运来网络: https://wcbblll.99kami.com — 视频/音乐/网盘等权益
- 好运权益: https://wcbblll.im01.cn — 视频/音乐/网盘等权益
- 福来流量站: http://35568.qcxmt.cn — 粉丝/关注/点赞/阅读服务
- 券宝: https://jdjdndn.github.io/ — 优惠券领取与省钱攻略
- 聚合优惠: https://wcbblll.cc — 全网优惠信息聚合导航
- 号卡: https://dlhaoka.com — 大流量手机号卡在线办理

## 说明
- 本站为纯导航站点：商品浏览、下单、支付与售后均在合作站点完成。
- 维护方式：合作站点清单由 data.js 数据文件驱动，增删条目后站点自动同步。
```

> llms.txt 中的站点描述与 4.2 节 data.js 基线保持一致；若 data.js 更新，发版时同步刷新 llms.txt 与静态基线（与 D1 维护约定相同）。

### 1.3.5 无障碍与性能设计要点

#### 无障碍（NFR-10/11/12 + FR-02/18）

| 类别 | 设计要点 |
| --- | --- |
| 键盘可达 | 全部交互为原生元素（a/button/details/summary），天然可 Tab/Enter/Space；`#nav-toggle` 维护 `aria-expanded`；Esc 关闭移动端菜单；焦点顺序 = DOM 顺序 = 视觉顺序 |
| 焦点可见 | 全局 `:focus-visible` 2px `--color-ring` 描边 + 2px offset；不禁用 outline |
| 锚点焦点 | 板块 `tabindex="-1"`，`nav.js` 在锚点点击后 `el.focus({preventScroll:true})`（FR-02，辅助技术可感知目标板块） |
| 跳过链接 | 首个 Tab 焦点为 `.skip-link`「跳到主内容」（视觉隐藏、聚焦时显现） |
| 文本对比 | 明暗两主题全部令牌组合预校验 AA（见 1.3.3 表格括号比值）；验收抽检点：正文、muted 描述、主色链接、按钮文本 |
| 图标与图形 | 装饰性 SVG（Hero 光斑、卡片图标、日/月图标）`aria-hidden="true"` + `focusable="false"`；本站无内容性 `<img>`（og-image 不在页面内渲染），如后续新增图片必须 `alt` + `loading="lazy"` + 宽高属性 |
| 控件 aria | `#theme-toggle` 动态 `aria-label`；`#nav-toggle` `aria-expanded/aria-controls`；`details` 原生暴露展开态（无需手动 aria-expanded） |
| 动效无障碍 | `prefers-reduced-motion` 全局禁用动画/过渡（FR-19）；入场动效用 opacity/transform（不触发重排、不隐藏内容于 AT） |
| 语义化 | 单一 h1；heading 不跳级；`nav/main/section/footer` + `aria-label` 标注地标；统计数字配可读标签 |

#### 性能（NFR-08/09）

| 类别 | 设计要点 |
| --- | --- |
| 请求面 | 首屏关键请求仅 3 个：index.html + style.css + favicon.svg（内联 SVG 图标零请求）；js 全部 defer 不阻塞解析 |
| 体积 | 核心资源 ≤99KB 预算（1.2.5 表）；无网络字体、无第三方脚本 |
| 首屏指标 | 无渲染阻塞 JS（defer）；CSS 单文件 ≤25KB；静态基线内容在 HTML 中即刻可见 → 首屏可交互 < 2s 在本地与 GitHub Pages 均易达成 |
| 图片 | 页面内无 `<img>`；og-image 仅供爬虫；未来新增非首屏图片强制 `loading="lazy"` + `decoding="async"` + 固有宽高 |
| 渲染性能 | 动画仅用 transform/opacity；IO 回调只切换 class；卡片网格 CSS Grid（无 JS 布局计算） |
| 稳健性 | 任何脚本异常不得阻断静态内容（模块各自 try/catch 隔离；main.js init 幂等） |

### 1.3.6 测试策略（D5 落地）

#### 双路径运行方式

| 路径 | 命令/操作 | 覆盖范围 | 环境要求 |
| --- | --- | --- | --- |
| 浏览器运行器（主） | 双击 `tests/test.html`（file://）或访问 `http://localhost:8000/tests/test.html` | 纯函数用例 + DOM 用例 + 页面集成断言 | 任意现代浏览器，零依赖 |
| Node（可选辅） | `node --test tests/node/` | 纯函数用例 + data.js 数据契约用例（跳过 browser-only） | 本机 Node ≥ 18（无则跳过，不影响交付） |

`tests/test.html` 结构：依次 `<script src>` 加载 `../data.js` → `../js/modules/*.js` → `assert.js` → `cases.js` → `browser-runner.js`；`browser-runner.js` 在 `DOMContentLoaded` 后执行注册表用例，向 `#test-results` 输出逐条 pass/fail 与汇总横幅（全绿 = "ALL PASSED (n)"，任一红 = "FAILED (x/n)"，同时 console 输出便于 CI 截图取证）。DOM 用例使用 `document.createElement` 的 detached 容器或复用页面真实锚点。

#### 用例清单（tests/cases.js 注册表，总计 40 例）

| 套件 | 用例（输入 → 预期） | 运行环境 | 对应需求 |
| --- | --- | --- | --- |
| validate.isValidHttpUrl | 合法 https / 合法 http（小写、大写主机）→ true；`www.x.com`（无协议）、`ftp://x.com`、`javascript:alert(1)`、`''`、`null`、`123` → false | 双端 | FR-17 |
| validate.validateEntry | 三字段齐全 → valid 且规范化输出；缺 name / 缺 url / 缺 desc / desc 为空串 / name 非字符串 → 各自 invalid 且 errors 含可定位信息；含未知扩展字段 `{foo:1}` → valid（字段保留不报错）；icon 为合法短字符串 → valid 且保留 | 双端 | FR-16/17 |
| validate.validateEntries | 空数组 → {valid:[], invalid:[]}；混合 3 好 2 坏 → valid=3、invalid=2 且 index 正确；null/非数组输入 → 空 report 不抛错 | 双端 | FR-17 |
| merge.normalizeUrl | `https://X.com/` 与 `https://x.com` → 同一 key；`http://x.com/a` ≠ `https://x.com/a`（协议不同不合并）；非法输入 → 原样返回不抛错 | 双端 | D1 |
| merge.mergeLinkLists | base=6 基线、override=同样 6 条 → 结果 6 条（顺序=base）；override 修改某条 desc → 该条 desc 更新、其余不变；override 追加第 7 条 → 结果 7 条且新条在末尾；override 删除 1 条基线 → 结果仍含全部 6 条基线（**永不删除**）；base 为空 → 结果=override；URL 尾斜杠差异 → 正确去重 | 双端 | D1/FR-12 |
| render.escapeHtml | `<script>alert(1)</script>` → 全部标签实体化；`&"`'` → 实体；中文原样保留 | 双端 | FR-07 安全 |
| render.siteCardHTML | 合法条目 → 含 `target="_blank"`、`rel="noopener noreferrer"`、href=url、名称/描述文本；恶意 name `<img onerror>` → 被转义；icon 缺失 → 输出默认头像占位；icon 存在 → 输出 icon | 双端 | FR-07/FR-16 |
| render.footerLinkHTML | 条目 → 锚文本=name、href=url、新标签页安全属性 | 双端 | FR-12 |
| render.renderSiteCards（DOM） | detached `<ul>` + 3 条目 → innerHTML 为 3 张卡片且顺序一致；容器原有静态内容被替换 | 浏览器 | FR-07 |
| render.syncFooterLinks（DOM） | 静态 6 条 + data 6 条相同 → 仍 6 个 li；data +1 条 → 7 个 li；data 删 1 条 → 仍 6 个 li；data 改 desc → 对应 a 的后续文本更新 | 浏览器 | FR-12/D1 |
| render.countElements（DOM） | 含 6 个 `.category-card` 的容器 → 6；空容器 → 0 | 浏览器 | FR-05 |
| render.setFooterYear（DOM） | mock 容器 → 年份=当前年；传入定制 year → 显示该年 | 浏览器 | FR-13 |
| theme.resolveTheme | (null, true)→dark；(null, false)→light；('light', true)→light；('dark', false)→dark | 双端 | FR-03 |
| theme.getStoredTheme | mock 存储返回 'dark'→dark；返回垃圾值→null；**抛异常的存储**→null 不炸 | 双端 | FR-03/NFR-14 |
| theme.applyTheme（DOM） | 应用后 html[data-theme] 正确设置/切换；aria-label 同步更新 | 浏览器 | FR-03 |
| accordion（DOM） | 打开第 2 项 → 第 1 项自动收起（单开）；全部收起状态合法 | 浏览器 | FR-10 |
| data.js 契约 | `MEMBER_SITE_DATA` 为数组且长度=6；6 条 URL 与基线常量**逐字符相等**（含 `https://jdjdndn.github.io/` 尾斜杠）；原 3 条 name/url/desc 与 spec 6.1 逐字符一致（回归保护）；全部条目通过 validateEntries；扩展字段容忍（注入 `{foo:1}` 后校验仍 valid） | 双端 | FR-12/14/16、6.1 硬约束 |
| 集成（browser-only） | `window.HY` 命名空间含全部预期函数键；页面加载后 `#partner-list` 卡片数 = data 有效条目数；`#footer-links` ≥6；`#stat-sites` 文本 = 有效条目数字符串 | 浏览器 | FR-05/07/12 |

#### 测试数据

`cases.js` 内置 mock 数据集（含合法/非法/恶意/边界条目）与 6 条基线 URL 常量；基线常量是**唯一副本**，同时被 data.js 契约用例引用，防止三处（data.js/静态 HTML/测试）漂移。

### 1.3.7 部署方案（NFR-15）

**生产部署（GitHub Pages 用户仓库）**：

1. 全部站点资源位于仓库默认分支**根目录**（文件结构见 1.2.3），无任何 CI 配置；
2. `git add` → `git commit` → `git push` 到默认分支，GitHub Pages 自动发布（用户仓库 `huiyuan6.github.io` 推送即部署，无构建动作）；
3. 发布后线上验证清单（功能验证阶段逐项执行）：
   - `https://huiyuan6.github.io/` 可访问且功能完整；
   - `https://huiyuan6.github.io/robots.txt`、`/sitemap.xml`、`/llms.txt`、`/assets/og-image.png`、`/assets/favicon.svg` 均可 200 访问；
   - 禁用 JS 访问首页：全部板块文本与 6 友链可获取（`curl` 验证亦可）；
   - Lighthouse/手动抽检：首屏 ≤2s、对比度、键盘流程。
4. **资源路径纪律**：页面内资源引用一律相对路径（`css/style.css`、`js/main.js`、`data.js`、`assets/…`）；仅 canonical/OG/sitemap/llms.txt/JSON-LD 使用生产绝对 URL。根路径部署下相对路径与绝对路径等价，但 file:// 下只有相对路径可用（NFR-14）。

**本地访问（NFR-14，两种方式均需验证）**：

| 方式 | 操作 | 验证要点 |
| --- | --- | --- |
| file:// 直开 | 资源管理器双击 `index.html` | data.js 加载（控制台可访问 `MEMBER_SITE_DATA`）、合作站点渲染、统计联动、主题切换与记忆（刷新保持）、FAQ 手风琴、锚点导航、6 友链跳转全部可用；`tests/test.html` 双击亦可用 |
| 本地静态服务器 | 仓库根目录执行 `python -m http.server 8000` 或 `npx serve`，访问 `http://localhost:8000/` | 与 file:// 行为完全一致；另验证相对路径资源在 http 环境下均返回 200 |

**回滚**：GitHub 仓库即版本历史，`git revert` 后推送即回滚到上一发布版本。

### 1.3.8 需求覆盖追溯矩阵（FR/NFR → 设计章节）

| 需求 | 设计落点 | 需求 | 设计落点 |
| --- | --- | --- | --- |
| FR-01 导航栏 | 1.3.2 骨架 + nav.js | NFR-01 语义化 | 1.3.2 骨架 |
| FR-02 锚点焦点 | nav.js + 1.3.2（tabindex/scroll-margin） | NFR-02 meta | 1.3.4 head 清单 |
| FR-03 主题 | D4 + theme.js | NFR-03 OG/Twitter | 1.3.4 head 清单 |
| FR-04 Hero | 1.3.2 板块表 | NFR-04 JSON-LD | 1.3.4 四实体草案 |
| FR-05 统计联动 | D1 算法② + render.js | NFR-05 robots/sitemap | 1.3.4 文件草案 |
| FR-06 分类卡片 | 1.3.2 板块表 + 内容基线 | NFR-06 llms.txt | 1.3.4 草案 |
| FR-07 合作站点 | D1 算法① + render.js | NFR-07 无 JS 可用 | D1 静态基线层 |
| FR-08 步骤 | 1.3.2 板块表 | NFR-08 轻量化 | 1.2.1/1.2.5 预算 |
| FR-09 热门权益 | 1.3.2 板块表 | NFR-09 首屏性能 | 1.3.5 性能表 |
| FR-10 FAQ | accordion.js + 1.3.2 | NFR-10 键盘 | 1.3.5 无障碍表 |
| FR-11 信任背书 | 1.3.2 板块表 | NFR-11 对比度 | 1.3.3 色彩令牌（预校验比值） |
| FR-12 底部友链 | D1 规则③ + D2 + merge.js | NFR-12 alt/aria | 1.3.5 无障碍表 |
| FR-13 页脚 | 1.3.2 + render.setFooterYear | NFR-13 响应式 | 1.3.3 断点表 |
| FR-14 data.js 脚本化 | 4.2 数据模型 + 1.2.4 加载序 | NFR-14 file:// | 1.1 约束 1/2 + 1.3.7 |
| FR-15 增删改联动 | D1 算法① + 1.3.6 用例 | NFR-15 部署 | 1.3.7 |
| FR-16 扩展字段 | validate.js + 4.2 字段表 | NFR-16 SDD 交付 | 1.3.7 验证清单 + 文档体系 |
| FR-17 异常容错 | validate.js + D1 降级③④ | D1–D5 | 1.3.1 |
| FR-18 悬停聚焦 | 1.3.3 动效规范 | 资源预算 | 1.2.5 |
| FR-19 入场动效 | reveal.js + 1.3.3 | 测试策略 | 1.3.6 |

# **2. 接口设计**

## **2.1 总体设计**

模块间通信采用三种契约：**全局数据变量**（data.js → 页面）、**全局命名空间**（modules → main/测试）、**DOM 渲染锚点**（main → HTML）。不存在模块间直接 import——依赖方向被加载顺序固化（1.2.4）。

### 2.1.1 全局命名空间与 UMD-lite 包装

每个模块文件采用统一包装（以 validate.js 为例）：

```js
(function (global) {
  'use strict';

  /** @param {unknown} value @returns {boolean} */
  function isValidHttpUrl(value) { /* …实现… */ }

  const api = { isValidHttpUrl /* , validateEntry, validateEntries */ };

  /* Node 环境（测试用）：module.exports；浏览器环境：挂到全局命名空间 HY */
  if (typeof module === 'object' && module.exports) { module.exports = api; }
  global.HY = global.HY || {};
  Object.assign(global.HY, api);
})(typeof window !== 'undefined' ? window : globalThis);
```

约束：`HY` 命名空间内的函数名**全局唯一**（以 2.2 接口清单为注册表，防止 Object.assign 相互覆盖）；模块不得读取其他模块的内部状态，只允许调用 `HY.*` 公开函数；data.js 不依赖任何模块。

### 2.1.2 数据契约（data.js → 消费方）

```js
/* data.js 顶层 */
var MEMBER_SITE_DATA = [ /* SiteEntry[]，见 4.2 */ ];
/* Node 测试分支（浏览器不执行） */
if (typeof module === 'object' && module.exports) { module.exports = MEMBER_SITE_DATA; }
```

- 用 `var`（经典脚本顶层 var → window 属性）：控制台可直接访问 `MEMBER_SITE_DATA`，跨 `<script>` 可见（FR-14 验收点）。
- 消费方（main.js / tests）**必须**经 `readSiteData()` 读取并对 `null/undefined/非数组` 容错，不得裸引用（脚本加载失败时裸引用会抛 ReferenceError 破坏整页）。

### 2.1.3 DOM 渲染锚点契约（main → HTML）

| 锚点（选择器） | data- 契约 | 生产者 | 消费语义 |
| --- | --- | --- | --- |
| `#partner-list` | `data-render="partner-cards"` | 静态基线（6 卡）→ renderSiteCards 全量替换 | 合作站点板块容器（FR-07） |
| `#footer-links` | `data-render="footer-links"` | 静态基线（6 链）→ syncFooterLinks 并集合并 | 页脚友链容器（FR-12） |
| `#stat-sites` | `data-stat="sites"` | updateStat 写入 data.js 有效条目数 | 统计区联动（FR-05） |
| `#stat-categories` | `data-stat="categories"` | countElements(main, '.category-card') | 统计区联动（FR-05） |
| `#stat-packages` | `data-stat="packages"` | countElements(main, '.hot-card') | 统计区联动（FR-05） |
| `[data-reveal]` | 入场动效元素 | reveal.js 加 `is-visible` | FR-19 |
| `#footer-year` | — | setFooterYear 回填 | FR-13 |
| `#theme-toggle` / `#nav-toggle` / `#faq`(details) | — | theme/nav/accordion 绑定 | FR-01/03/10 |

规则：JS 通过 `document.querySelector` 按此表取锚点；**取不到任何锚点时静默跳过对应功能**（不抛错、不影响其他板块）。

## **2.2 接口清单（公开函数签名与可测点）**

> 类型标注为设计契约（JSDoc typedef 落实到代码）。`SiteEntry`/`NormalizedEntry`/`LinkEntry`/`Theme`/`StorageLike` 定义见 4.2。纯函数 = 无 DOM、无全局副作用，双端可测。

### validate.js（数据校验，纯函数）

| 签名 | 语义 | 可测点（输入/输出/边界） |
| --- | --- | --- |
| `isValidHttpUrl(value: unknown): boolean` | 判断是否合法 http/https 绝对 URL | 大写主机、无协议、ftp/javascript 协议、空串、非字符串 |
| `validateEntry(entry: unknown, index: number): { valid: boolean; entry: NormalizedEntry \| null; errors: string[] }` | 单条目校验并规范化 | 缺各必填字段、空串、非对象、扩展字段保留、index 透传到错误信息 |
| `validateEntries(list: unknown): { valid: NormalizedEntry[]; invalid: Array<{ index: number; entry: unknown; errors: string[] }> }` | 列表校验，好坏分离 | null/非数组 → 空报告不抛错；混合列表 index 正确 |

### merge.js（友链合并，纯函数）

| 签名 | 语义 | 可测点 |
| --- | --- | --- |
| `normalizeUrl(url: string): string` | 生成去重键：小写协议+主机、去尾斜杠 | 大小写/尾斜杠归一；http≠https；非法输入原样返回 |
| `mergeLinkLists(base: LinkEntry[], override: LinkEntry[]): LinkEntry[]` | 并集合并：base 顺序保持、override 值优先、新 override 追加、**永不删除 base 条目** | 同列表、改 desc、追加、删除、空 base/空 override、尾斜杠去重 |

### render.js（渲染）

| 签名 | 纯度 | 语义 | 可测点 |
| --- | --- | --- | --- |
| `escapeHtml(value: string): string` | 纯 | HTML 实体化 `& < > " '` | 恶意脚本转义、中文保留 |
| `siteCardHTML(entry: NormalizedEntry): string` | 纯 | 生成一张站点卡片 HTML 字符串 | target/rel 安全属性、href/name/desc 注入、icon 回退 |
| `footerLinkHTML(entry: LinkEntry): string` | 纯 | 生成一条友链 `<li><a>` HTML | 锚文本、href、安全属性 |
| `renderSiteCards(container: HTMLElement, entries: NormalizedEntry[]): void` | DOM | 全量替换容器内容为卡片序列（`escapeHtml` 后 innerHTML） | 条数/顺序、替换旧内容 |
| `syncFooterLinks(container: HTMLElement, entries: LinkEntry[]): LinkEntry[]` | DOM | 解析静态 li → mergeLinkLists → 重建；返回合并结果（供断言） | 6↔6 不变、+1、-1 保持基线、desc 更新 |
| `updateStat(el: HTMLElement, value: number, opts?: { animate?: boolean }): void` | DOM | 写入统计数字（可选 rAF count-up，reduced-motion/opts.animate=false 直显） | 终值正确、直显模式 |
| `countElements(root: ParentNode, selector: string): number` | DOM 读 | 统计选择器匹配数 | 6 类卡片、空容器 0 |
| `setFooterYear(el: HTMLElement, year?: number): void` | DOM | 回填年份（默认 `new Date().getFullYear()`） | 当前年、定制年 |

### theme.js（主题，D4）

| 签名 | 纯度 | 语义 | 可测点 |
| --- | --- | --- | --- |
| `getStoredTheme(storage: StorageLike): Theme \| null` | 纯（注入存储） | 读取并校验持久化主题 | 'dark' 透传、垃圾值→null、**storage 抛异常→null** |
| `resolveTheme(stored: Theme \| null, prefersDark: boolean): Theme` | 纯 | 三态解析 | 四种组合 |
| `applyTheme(root: HTMLElement, theme: Theme): void` | DOM | 设置 `data-theme` + 同步切换按钮 aria-label/icon | 属性正确、连续切换 |
| `toggleTheme(root: HTMLElement, storage: StorageLike): Theme` | DOM+存储 | 取反当前主题、应用、持久化（try/catch） | light↔dark、写入 key 'hy-theme' |
| `initTheme(doc: Document, opts?: { storage?: StorageLike }): Theme` | 编排 | 读取→解析→应用→（无记忆时）监听 matchMedia change | 与内联脚本结果幂等 |

### accordion.js / reveal.js / nav.js（交互，DOM）

| 签名 | 语义 | 可测点 |
| --- | --- | --- |
| `enforceSingleOpen(container: HTMLElement): void` | details toggle 互斥（FR-10） | 开第 2 项时第 1 项收起 |
| `initFaq(container: HTMLElement): void` | 绑定互斥（container 即 `#faq`） | 重复绑定幂等 |
| `setupReveal(root: ParentNode): void` | IO 观察 `[data-reveal]` → 加 `is-visible`；无 IO/`prefers-reduced-motion` → 立即全部可见 | class 添加、降级路径 |
| `initSmoothScroll(doc: Document): void` | 锚点点击 → `el.focus({preventScroll:true})`（滚动交给 CSS `scroll-behavior`） | 目标获得焦点、preventScroll 不打断动画 |
| `initMobileNav(doc: Document): void` | 汉堡开合 + aria-expanded + Esc/外点关闭 | aria 状态翻转、Esc 关闭 |

### main.js（编排，无可测业务逻辑）

| 签名 | 语义 |
| --- | --- |
| `readSiteData(globalObj: object): unknown` | 安全读取 `globalObj.MEMBER_SITE_DATA`（无则 null） |
| `init(): void` | 按 1.2.4 流水线执行 D1 算法 + 绑定全部交互；幂等（重复调用不重复绑定） |

### tests/（测试设施）

| 签名 | 语义 |
| --- | --- |
| `assert.ok(cond, msg)` / `assert.eq(actual, expected, msg)` / `assert.deepEq(...)` / `assert.throws(fn, msg)` | 轻量断言（assert.js） |
| `HY_TESTS.register(suite: string, name: string, fn: (assert) => void, browserOnly?: boolean)` | 用例注册（cases.js，双端共享） |
| `runAll(target: 'browser'): { passed: number; failed: number }` | 浏览器执行器入口（browser-runner.js） |

# **4. 数据模型**

## **4.1 设计目标**

1. **兼容性**：`name/url/desc` 三字段结构与取值保持兼容——data.js 原有 3 条数据**逐字符不变**（spec 6.1 硬约束 2）；改造仅调整外层包裹方式（裸数组 → 全局变量赋值）。
2. **脚本化**：`<script src="data.js">` 直接加载即生效，暴露全局变量 `MEMBER_SITE_DATA`；无依赖、无构建（spec 6.1 硬约束 1/4）。
3. **可扩展**：支持追加条目与新增可选字段，页面代码零改动即被消费（FR-15/16）；本期消费 `icon` 可选字段，其余扩展字段（tag/category/type）合法但暂不消费。
4. **可校验**：字段约束明确到可编程判定（4.2.2 规则表），供 validate.js 与测试用例直接引用。
5. **单一事实源**：data.js 是站群站点清单的唯一维护入口；静态 HTML / llms.txt / JSON-LD 是它的发版快照（D1 维护约定）。

## **4.2 模型实现**

### 4.2.1 类型定义（JSDoc typedef，编码阶段置于 data.js 或 types 注释块）

```ts
/** 主题字面量 */
type Theme = 'light' | 'dark';
/** 可注入的存储接口（localStorage 子集，供测试 mock） */
interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; }

/** data.js 中的原始条目（站长手写格式） */
interface SiteEntry {
  name: string;   // 必填，非空，站点显示名（同时是友链锚文本）
  url: string;    // 必填，合法 http/https 绝对 URL
  desc: string;   // 必填，非空，一句话描述（建议 ≤30 汉字）
  icon?: string;  // 可选，卡片头像（≤4 字符，如 emoji/汉字）；缺省用默认地球图标
  tag?: string;   // 可选，预留（本期不消费）
  category?: string; // 可选，预留（本期不消费）
  type?: string;  // 可选，预留：'partner' | 'friend'（本期不消费，见 D2）
  [key: string]: unknown; // 其他未知扩展字段：必须容忍、不得报错（FR-16）
}

/** 校验通过后的规范化条目（渲染层唯一输入） */
interface NormalizedEntry { name: string; url: string; desc: string; icon?: string; }

/** 友链合并层的最小条目 */
interface LinkEntry { name: string; url: string; desc?: string; }

/** 校验报告 */
interface ValidationReport {
  valid: NormalizedEntry[];
  invalid: Array<{ index: number; entry: unknown; errors: string[] }>;
}
```

### 4.2.2 字段约束与校验规则（validate.js 的实现依据）

| 字段 | 必填 | 类型 | 约束（违反 → 条目无效并警告） | 警告信息格式 |
| --- | --- | --- | --- | --- |
| name | 是 | string | 非空（trim 后长度 > 0） | `[data] 条目 #i：name 缺失或为空` |
| url | 是 | string | `new URL()` 可解析 + protocol ∈ {http:, https:}（大写主机合法，解析时自动小写） | `[data] 条目 #i：url 缺失或不是合法的 http/https 绝对地址` |
| desc | 是 | string | 非空（trim 后长度 > 0）；>30 汉字仅提示不拒绝 | `[data] 条目 #i：desc 缺失或为空` |
| icon | 否 | string | 非空且 ≤4 字符则采纳，否则忽略并回退默认头像 | `[data] 条目 #i：icon 已忽略（非短字符串）` |
| 其他字段 | 否 | any | 存在即容忍（FR-16），规范化时丢弃（不进入 NormalizedEntry） | 不警告 |

无效条目处理：**跳过该条 + console.warn 可定位信息 + 绝不阻断其余条目与整页渲染**（FR-17）；`list` 本身非数组/为 null → 返回空报告并警告 `[data] MEMBER_SITE_DATA 缺失或不是数组，保留静态内容`。

### 4.2.3 data.js 完整结构示例（改造后的目标形态，6 条目基线）

```js
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
```

### 4.2.4 6 个友链的存放与消费方式（D1+D2 汇总）

| 消费点 | 数据来源 | 消费规则 | 验收保障 |
| --- | --- | --- | --- |
| 合作站点板块 `#partner-list` | data.js（6 条全量） | JS 有效时**全量重渲染**（条数/顺序/内容与 data.js 一致） | FR-07/15 |
| 统计区 `#stat-sites` | data.js 有效条目数 | 联动更新 | FR-05 |
| 页脚友链 `#footer-links` | 静态基线 6 条（HTML 快照）∪ data.js | **并集合并、URL 去重、data.js 值优先、基线永不删除** | FR-12（6 条 URL 逐字符锁定的防御性保障） |
| JSON-LD ItemList / llms.txt | data.js 发版快照 | 人工同步（发版清单项） | NFR-04/06 |

**6 条基线 URL 常量**（静态 HTML、data.js、测试断言三处必须逐字符一致；测试用例锁定）：

```
https://wcbblll.99kami.com
https://wcbblll.im01.cn
http://35568.qcxmt.cn
https://jdjdndn.github.io/     ← 注意保留尾斜杠
https://wcbblll.cc
https://dlhaoka.com
```

### 4.2.5 数据流总览

```
站长编辑 data.js ──push──▶ GitHub Pages ──▶ 浏览器加载
                                              │
              <script src="data.js">（经典脚本，file:// 亦可用）
                                              ▼
                              window.MEMBER_SITE_DATA（SiteEntry[6]）
                                              │ main.js: readSiteData()
                                              ▼
                              validateEntries() → ValidationReport
                              ├── valid[6] ──▶ renderSiteCards(#partner-list)   全量替换
                              │            ──▶ updateStat(#stat-sites, 6)        统计联动
                              │            ──▶ syncFooterLinks(#footer-links)    并集合并
                              └── invalid[] ──▶ console.warn 逐条隔离
```

---

*文档结束。本文档为 Phase B 技术设计基线；编码实现以 spec.md（What）+ 本文档（How）为准，任务拆解（tasks.md）按本文档 1.2.3 文件结构树与 2.2 接口清单展开。*







