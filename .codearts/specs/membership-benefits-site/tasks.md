# 会员权益官网（membership-benefits-site）任务拆解

| 项目名称 | 会员权益官网（membership-benefits-site） |
| --- | --- |
| 上游文档 | spec.md v1.0（`.codearts/specs/membership-benefits-site/spec.md`）＋ design.md v1.0（同目录） |
| 文档版本 | v1.0 |
| 文档状态 | 已完成，待团队评审 |
| 创建日期 | 2026-10-19 |
| 阶段 | Phase C：任务拆解（SDD） |

> 本文档将 design.md 的全部工作拆解为 37 个原子任务（T-01 ~ T-37，每个 0.5~2 小时粒度），完整映射 spec.md 的 19 条 FR、16 条 NFR 与 design.md 1.2.3 文件结构树中的全部文件。只定义"做什么"，不包含实现代码。

---

## 0. 使用说明与全局硬约束

### 0.1 阅读约定

- 任务编号 **T-01 ~ T-37 按依赖顺序排列**；每个任务注明"依赖"（必须先行完成的任务）与"并行性"（可与哪些任务同时进行）。
- 未列入依赖的任务默认可并行，但受 0.2 同文件互斥规则约束。
- 每个任务的验收标准均可独立验证（浏览器操作 / 控制台断言 / 文件检查 / 测试运行器）。

### 0.2 同文件互斥规则（必须串行的任务集合）

以下任务编辑**同一个文件**，任何情况下不得并行执行（避免编辑冲突）：

| 文件 | 必须串行的任务链 |
| --- | --- |
| `index.html` | T-04 → T-05 → T-06 → T-07 → T-08 → T-09 → T-23 |
| `css/style.css` | T-03 → T-10 → T-11 → T-12 → T-13 → T-14 |
| `js/modules/render.js` | T-17 → T-18 |
| `tests/cases.js` | T-29 → T-30 |

### 0.3 全局硬约束（每个任务隐含遵守，验收时逐条核对）

1. **6 个友链 URL 逐字符锁定**（spec FR-12 / design 4.2.4 基线常量，含尾斜杠与协议差异）：
   ```
   https://wcbblll.99kami.com
   https://wcbblll.im01.cn
   http://35568.qcxmt.cn            ← http 协议，不得写成 https
   https://jdjdndn.github.io/       ← 保留尾斜杠
   https://wcbblll.cc
   https://dlhaoka.com
   ```
2. **data.js 原 3 条数据的 name/url/desc 逐字符保持**（spec 6.1 硬约束 2）。
3. **资源引用一律相对路径**（`css/style.css`、`js/main.js`、`data.js`、`assets/…`），保证 file:// 与根路径部署双兼容（design 1.3.7 资源路径纪律）。
4. **禁止引入任何前端框架、构建工具、包管理器运行时依赖、Web 字体、ES Modules、fetch/XHR、Service Worker**（design 1.2.1 明确不引入清单）。
5. **JS 数据注入必须经 `escapeHtml` 转义**，杜绝 innerHTML XSS。
6. 生产绝对 URL `https://huiyuan6.github.io/` 仅用于 canonical/OG/Twitter/JSON-LD/sitemap/llms.txt/robots。

---

## 1. 任务分组与统计总览

| 分组 | 任务区间 | 任务数 | 内容 |
| --- | --- | --- | --- |
| **A 基础框架** | T-01 ~ T-03 | 3 | 目录结构、data.js 改造、CSS 设计系统令牌 |
| **B 页面骨架** | T-04 ~ T-09 | 6 | index.html 结构 + 语义化 + 全部静态基线内容 |
| **C 视觉实现** | T-10 ~ T-14 | 5 | 各板块样式 + 响应式 + 暗色模式走查 |
| **D JS 交互** | T-15 ~ T-22 | 8 | 7 个功能模块 + main.js 编排（D1 联动算法） |
| **E SEO/AI 文件** | T-23 ~ T-27 | 5 | JSON-LD、robots/sitemap、llms.txt、favicon/og-image、404.html |
| **F 测试** | T-28 ~ T-33 | 6 | 断言库、40 例用例注册表、双路径运行器、全绿修复 |
| **G 文档** | T-34 | 1 | README 重写 |
| **H 验证与部署** | T-35 ~ T-37 | 3 | 本地全量验证、体积预算审计、推送上线与线上回归 |
| **合计** | T-01 ~ T-37 | **37** | |

---

## 2. 依赖主线与并行窗口

### 2.1 关键路径（串行主线）

```
T-01 ─→ T-03 ─→ T-04 ─→ T-05 ─→ T-06 ─→ T-07 ─→ T-08 ─→ T-09 ─┬─→ T-10 … T-14（style.css 串行链）
   │                                                             └─→ T-22（main.js，汇合 D 组全部模块）
T-02（data.js，独立先行）────────────────────────────────────────────→ T-22
                                                                      │
                                               T-33（测试全绿）←── F 组 T-28~T-32
                                                                      │
                     T-35（本地全量验证，需 T-14 + T-23~T-27 完成）←──┤
                     T-36（体积审计，可与 T-35 并行）←────────────────┤
                                                                      ↓
                     T-37（推送 GitHub Pages + 线上回归）←── T-34（README）
```

**关键路径**：T-01 → T-03 → T-04 → … → T-09（index.html 串行链）→ T-22 → T-33 → T-35 → T-37。
B 组（index.html 6 连串）是进度主要瓶颈，应最先启动并优先保障。

### 2.2 并行执行窗口

| 窗口 | 时段 | 可并行的任务 | 说明 |
| --- | --- | --- | --- |
| **W1 启动期** | 项目开始 | T-01 ∥ T-02 ∥ T-24 | 互不依赖：目录 / data.js / robots+sitemap |
| **W2 B 组推进期** | T-04~T-09 串行编辑 index.html 期间 | T-15 ∥ T-16 ∥ T-17 ∥ T-19 ∥ T-20 ∥ T-21 ∥ T-25 ∥ T-26 ∥ T-28 | D 组模块为独立文件；llms.txt/favicon/og-image/assert.js 均不碰 index.html。**注意：T-23（JSON-LD 改 index.html）不得在此窗口执行** |
| **W3 C 组推进期** | T-10~T-14 串行编辑 style.css 期间 | T-18 ∥ T-22（需 T-09 完）∥ T-23（index.html 已空闲）∥ T-27 ∥ T-29 ∥ T-32 | C 组与 D/E/F 组文件互不相交 |
| **W4 收尾期** | T-35 执行期间 | T-36 ∥ T-34 | 验证与文档/审计并行 |

### 2.3 必须串行的核心链（一览）

1. `T-01 → T-03`（目录 → 样式文件）
2. `T-03 → T-04`（style.css 存在后 HTML 才能引用）
3. `T-04 → T-05 → T-06 → T-07 → T-08 → T-09`（index.html 板块依序填充）
4. `T-09 → T-10 → T-11 → T-12 → T-13 → T-14`（HTML 齐后做视觉，style.css 串行）
5. `T-15/T-16/T-17/T-19/T-20/T-21 → T-22`（main.js 汇合全部模块）
6. `T-17 → T-18`（render.js 纯函数 → DOM 装配）
7. `T-28 → T-29 → T-30`（assert → 纯函数用例 → DOM 用例）
8. `T-22 + T-30 + T-31 + T-32 → T-33`（全绿门禁）
9. `T-33 + T-14 + T-23~T-27 → T-35 → T-37`；`T-34 + T-35 + T-36 → T-37`（上线门禁）

---

## 3. 分组 A：基础框架（T-01 ~ T-03）

- [x] **T-01 创建项目目录结构**
  - **任务描述**：按 design.md 1.2.3 文件结构树创建缺失目录：`css/`、`js/modules/`、`assets/`、`tests/node/`；确认仓库现有文件（README.md、data.js）位置不变。目录内放置空占位文件或直接由后续任务创建文件。
  - **涉及文件**：`css/`、`js/modules/`、`assets/`、`tests/`、`tests/node/`（新增目录）
  - **验收标准**：
    - 上述 5 个目录存在且与 design 1.2.3 文件树一致；
    - 现有 README.md、data.js 未被移动或修改；
    - git status 仅显示新增目录。
  - **依赖**：无
  - **并行性**：W1 窗口，可与 T-02、T-24 并行

- [x] **T-02 改造 data.js 为全局变量格式并扩充至 6 条目**
  - **任务描述**：将 data.js 从裸数组字面量改造为 design 4.2.3 目标形态：顶层 `var MEMBER_SITE_DATA = [...]` 暴露浏览器全局变量；保留原 3 条数据逐字符不变；按 design 4.2.3 追加券宝/聚合优惠/号卡 3 条（URL 逐字符锁定，desc 采用内容基线文案）；文末附加 Node 导出分支 `if (typeof module === 'object' && module.exports) { module.exports = MEMBER_SITE_DATA; }`；文件头添加维护注释（一个条目=一个官网、三字段必填、增删改推送即生效、非法条目会被跳过）。
  - **涉及文件**：`data.js`（改造）
  - **验收标准**：
    - 浏览器控制台执行 `MEMBER_SITE_DATA` 返回 6 元素数组（FR-14）；
    - 前 3 条的 name/url/desc 与 spec 6.1 现状逐字符一致（回归保护）；
    - 后 3 条 URL 依次为 `https://jdjdndn.github.io/`（含尾斜杠）、`https://wcbblll.cc`、`https://dlhaoka.com`，逐字符核对；
    - `node -e "console.log(require('./data.js').length)"` 输出 6；
    - 文件无任何外部依赖、无构建要求，≤2KB；
    - 文件含 JSDoc typedef 注释块（SiteEntry 字段说明，design 4.2.1）。
  - **依赖**：无（不依赖 T-01，data.js 在根目录）
  - **并行性**：W1 窗口，可与 T-01、T-24 并行
  - **风险提示**：这是全站数据真源，URL 任何一字符错误将导致 FR-12 验收失败；建议编码时直接复制 0.3 节基线常量块

- [x] **T-03 编写 css/style.css 设计令牌系统与全局基础样式**
  - **任务描述**：创建 `css/style.css`，落地 design 1.3.3 全部设计令牌：`:root` 亮色令牌块（17 个色彩令牌 + 字体/字号阶梯/行高 + 间距 4px 基数 9 档 + 圆角 4 档 + 阴影 3 档 + 布局令牌 `--container-max`/`--header-h` + 动效令牌 `--dur-fast/base/slow`、`--ease-out/standard`）+ `html[data-theme="dark"]` 单一暗色令牌块（与亮色逐一对照，含 `color-scheme: dark`）+ `:root { color-scheme: light }`；同时写入全局基础层：reset（box-sizing/margin）、`body` 字体与底色、全局 `:focus-visible` 描边规则（2px `--color-ring` + 2px offset，不摘除）、`.visually-hidden` 工具类、`html { scroll-behavior: smooth }`。
  - **涉及文件**：`css/style.css`（新建）
  - **验收标准**：
    - 令牌名与值和 design 1.3.3 三张表逐一对应（色彩/字体/间距圆角阴影/动效）；
    - 暗色主题仅存在一个 `[data-theme="dark"]` 覆盖块，无 `@media (prefers-color-scheme)` 备份副本（D4 决策）；
    - 组件样式只引用令牌、不写裸色值（后续任务共同遵守）；
    - 文件 ≤25KB；
    - 在浏览器中给 `<html>` 手动加/去 `data-theme="dark"` 属性，底色/文本/主色即时切换且对比度符合 1.3.3 表中括号预校验比值。
  - **依赖**：T-01（css/ 目录）
  - **并行性**：需在 T-01 后立即执行；完成后解锁 B 组全部任务

---

## 4. 分组 B：页面骨架（T-04 ~ T-09，全部编辑 index.html，必须串行）

> 本组按 design 1.3.2 页面语义骨架与内容基线落稿：所有板块为"静态基线"完整内容（D1 第一层），禁用 JS 即最终视图。全部锚点 id、data- 属性、aria 属性按 design 1.3.2 DOM 命名规范与 2.1.3 渲染锚点契约执行。

- [x] **T-04 搭建 index.html 全局骨架与完整 head**
  - **任务描述**：新建 `index.html`，写入：(1) 完整 head——charset/viewport/title/description/keywords/author/robots/canonical（指向 `https://huiyuan6.github.io/`）/双 theme-color/favicon 引用/完整 Open Graph 7 项/Twitter Card 4 项，内容照抄 design 1.3.4 head meta 清单；(2) 内联主题引导脚本（约 10 行同步脚本，不可 defer：读 localStorage['hy-theme'] → 无记忆则 matchMedia prefers-color-scheme → 设置 html[data-theme]，必须位于样式表加载前后首帧前执行）；(3) 按 design 1.2.4 顺序装配 9 个 defer 经典脚本标签（data.js → validate → merge → render → theme → accordion → reveal → nav → main.js）；(4) body 外框——skip-link 跳转链接、`header#top > nav#site-nav`（a.brand 品牌、button#nav-toggle[aria-expanded/aria-controls]、ul#site-nav-links 4 个锚点、button#theme-toggle 含日/月内联 SVG aria-hidden）、`main#main` 内 8 个 section 壳（hero/stats/categories/partners/steps/hot/faq/trust，各带 id 与 `tabindex="-1"`）、footer 壳（友链 nav + 版权行）。
  - **涉及文件**：`index.html`（新建）
  - **验收标准**：
    - head 元数据 21 项与 design 1.3.4 清单逐项对齐（NFR-02/03）；
    - 内联主题脚本先于 defer 脚本、无 defer 属性；9 个 script 标签顺序与 design 1.2.4 完全一致且全部带 defer（除内联主题脚本）；
    - `<html lang="zh-CN">`；body 地标结构（header/nav/main/footer）与 design 1.3.2 骨架一致；
    - 全部资源引用为相对路径；
    - 页面此时可打开（样式为空白但结构可查），无 404 控制台错误（js 文件尚未存在时允许 script 404，由 T-15+ 逐步消除——验收时用 `view-source:` 检查结构即可）；
    - 无 ES Modules / fetch 引用。
  - **依赖**：T-03（引用 css/style.css）、T-02（script 引用 data.js）
  - **并行性**：B 组串行链起点；执行期间 D 组模块任务可并行推进

- [x] **T-05 填充 Hero 主视觉区与数据统计区静态基线**
  - **任务描述**：按 design 1.3.2 板块表与内容基线填充 `#hero` 与 `#stats`：Hero——`div.hero__inner > h1`（全页唯一 h1「一站式会员权益聚合导航」）+ 副标题 p.hero__sub + 双 CTA（a.btn--primary→#categories「浏览权益分类」、a.btn--ghost→#partners「查看合作站点」）+ `div.hero__visual` 装饰渐变光斑（aria-hidden="true"）；统计区——h2.visually-hidden「数据统计」+ `ul.stats-grid > li.stat-item×3`，每项 `p.stat-item__value + p.stat-item__label`，值元素分别带 `data-stat="sites|categories|packages"`（id：stat-sites/stat-categories/stat-packages），静态基线值 6/6/4。
  - **涉及文件**：`index.html`（编辑 #hero、#stats 区块）
  - **验收标准**：
    - 全页有且仅有一个 h1（NFR-01）；
    - 3 个统计值元素均有 data-stat 属性且 id 符合 2.1.3 锚点契约；
    - 双 CTA 按钮为语义 `<a>` 且 href 指向正确锚点（FR-04）；
    - 装饰元素均带 aria-hidden="true" + focusable="false"（NFR-12）；
    - 首屏不滚动可完整看到主标题与 CTA（结构层面，视觉由 T-11 保障）。
  - **依赖**：T-04
  - **并行性**：B 组串行链第 2 环

- [x] **T-06 填充权益分类与使用步骤静态基线**
  - **任务描述**：填充 `#categories` 与 `#steps`：分类板块——h2「权益分类」+ 导语 p + `ul.category-grid > li.category-card×6`（视频会员/音乐会员/网盘·存储/社交媒体服务/流量话费/组合套餐），每卡 `span.category-card__icon`（24px 线性内联 SVG，stroke=currentColor，aria-hidden）+ h3 + 一句话说明 p + `a.category-card__link` 引导入口（指向 #partners 或 #hot）；步骤板块——h2「使用步骤」+ `ol.steps > li.step-item×4`（①浏览权益分类→②挑选热门套餐→③前往合作站点→④开通享受权益），每步 `span.step-item__no`（01-04）+ h3 + p。文案取 design 1.3.2 内容基线。
  - **涉及文件**：`index.html`（编辑 #categories、#steps 区块）
  - **验收标准**：
    - 分类卡片 6 张（≥4 达标），每卡图标/名称/说明/入口四要素齐全（FR-06）；
    - 步骤为有序列表 `<ol>` 且 4 步（≥3 达标），顺序符合实际使用路径（FR-08）；
    - 卡片图标 SVG 全部内联、stroke=currentColor、aria-hidden（零图片请求）；
    - heading 层级：板块 h2 → 卡片 h3，无跳级（NFR-01）。
  - **依赖**：T-05
  - **并行性**：B 组串行链第 3 环

- [x] **T-07 填充合作站点与热门权益静态基线**
  - **任务描述**：填充 `#partners` 与 `#hot`：合作站点——h2「合作站点」+ 收录规则导语 + `ul#partner-list.partner-grid[data-render="partner-cards"]`，内含 6 张静态基线 `li.partner-card`（data.js 6 条目的快照：`span.partner-card__avatar`（icon/首字回退）+ h3 站点名 + p 一句话描述 + `a.partner-card__link`「访问入口」target="_blank" rel="noopener noreferrer"）；热门权益——h2 + `ul.hot-grid > li.hot-card×4`（追剧套餐/听歌套餐/办公云盘套餐/社媒经营套餐），每卡 h3 名称 + p 适用场景 + `ul` 权益亮点（2-3 条）+ a 前往入口。6 站名称/URL/描述必须与改造后 data.js 完全一致（同源快照）。
  - **涉及文件**：`index.html`（编辑 #partners、#hot 区块）
  - **验收标准**：
    - `#partner-list` 带 `data-render="partner-cards"`（2.1.3 契约）；6 张卡片内容与 data.js 六条目一一对应（名称、描述、URL 逐字符）；
    - 全部外链 `target="_blank"` + `rel="noopener noreferrer"`（FR-07 安全）；
    - 热门套餐 4 条（≥3 达标），名称/场景/亮点三要素齐全（FR-09）；
    - 禁用 JS 时该板块内容完整可读（静态基线，NFR-07）。
  - **依赖**：T-06（且 data.js 已在 T-02 完成）
  - **并行性**：B 组串行链第 4 环
  - **风险提示**：此为 D1 静态基线层的核心，与 data.js 的任何不一致都会造成无 JS 视图与 JS 视图漂移

- [x] **T-08 填充 FAQ 手风琴与信任背书静态基线**
  - **任务描述**：填充 `#faq` 与 `#trust`：FAQ——h2「常见问题」+ `div.faq-list > details.faq-item[name="faq"]×6`，每项 `summary`（问题）+ `div.faq-item__answer`（答案），6 问文案**逐字采用 design 1.3.2 内容基线**（站点是做什么的/开通有优惠吗/如何选套餐/合作站点如何收录/支付售后在哪完成/遇到问题如何反馈）——此文案将被 T-23 JSON-LD FAQPage 逐字引用，是双处一致性硬规则的源头；信任背书——h2「用户评价与信任保障」+ `div.trust-badges`（3 项保障：人工核验收录/官方渠道直达/定期复检更新，含内联 SVG 图标）+ `blockquote.testimonial×3`（追剧爱好者/学生用户/自媒体运营视角，各含 figcaption 署名）。
  - **涉及文件**：`index.html`（编辑 #faq、#trust 区块）
  - **验收标准**：
    - 6 组 `<details name="faq">`（≥5 达标），原生无 JS 可折叠（NFR-07）；
    - FAQ 文案与 design 1.3.2 基线逐字一致（后续 T-23 锚点）；
    - 评价/背书共 6 条（3 徽章 + 3 评价，≥3 达标 FR-11）；
    - blockquote 使用 figcaption 署名，heading 无跳级。
  - **依赖**：T-07
  - **并行性**：B 组串行链第 5 环

- [x] **T-09 填充页脚：6 站友链基线、版权年份与回到顶部**
  - **任务描述**：填充 footer：`nav[aria-label="友情链接"] > h2「友情链接」 + ul#footer-links[data-render="footer-links"]`，内含 6 条静态基线 `li > a`（锚文本=站点名称、href=基线 URL、target="_blank" rel="noopener noreferrer"），顺序：运来网络/好运权益/福来流量站/券宝/聚合优惠/号卡；版权行 `p > © <span id="footer-year">2026</span> 会员权益 · <a href="#top" id="back-top">回到顶部</a>`。
  - **涉及文件**：`index.html`（编辑 footer 区块）
  - **验收标准**：
    - 6 条友链一项不缺，URL 与 0.3 节基线常量**逐字符相等**（FR-12 验收基线，特别核对 `https://jdjdndn.github.io/` 尾斜杠与 `http://35568.qcxmt.cn` 的 http 协议）；
    - `#footer-links` 带 `data-render="footer-links"`（2.1.3 契约）；
    - 锚文本为站点名称、新标签页打开、带 rel 安全属性；
    - `#footer-year` 与 `#back-top` id 就位（FR-13）；
    - 禁用 JS 时 6 友链可点击跳转（NFR-07）。
  - **依赖**：T-08
  - **并行性**：B 组串行链终点；完成后解锁 C 组（T-10）、T-22、T-23

---

## 5. 分组 C：视觉实现（T-10 ~ T-14，全部编辑 style.css，必须串行）

> 本组实现 design D3 的专业质感策略：8px 栅格间距节奏、卡片悬浮阴影渐升、品牌渐变克制使用（仅 Hero/CTA/品牌标识）、图标 24px 线性风格。组件样式只引用 T-03 令牌，禁止裸色值。

- [x] **T-10 全局布局、导航栏与按钮体系样式**
  - **任务描述**：在 style.css 中实现：容器 `.container`（max-width: var(--container-max)，左右 padding 16px→24px 响应）；吸顶 header（高 var(--header-h)=64px、背景模糊/半透明表面色、底部边框）；品牌链接、导航列表横向排布（桌面）；按钮体系 `.btn--primary`（品牌渐变背景 + --color-on-primary 文本 + hover 阴影渐升）与 `.btn--ghost`（描边 + hover 主色化）；`.skip-link`（视觉隐藏、聚焦时显现为固定浮层）；各 section 通用板块间距（--space-12/16/24 阶梯）与 h2 板块标题样式（流式字号 clamp）；`nav-open` 移动端菜单展开态样式预留。
  - **涉及文件**：`css/style.css`（追加）
  - **验收标准**：
    - header 在桌面端吸顶且不遮挡内容（配合 scroll-margin 由 T-14 补齐）；
    - 主/次按钮 hover 有 translateY/阴影/颜色变化（FR-18）；
    - Tab 第一下焦点为 skip-link 且视觉显现（NFR-10）；
    - 布局仅用 CSS Grid/Flex，无 JS 布局计算；
    - 样式全部引用令牌变量。
  - **依赖**：T-09（B 组 HTML 完成）、T-03
  - **并行性**：C 组串行链起点；执行期间 D 组/E 组/F 组任务可并行

- [x] **T-11 Hero 区与数据统计区样式**
  - **任务描述**：实现 `.hero` 品牌渐变主视觉（背景渐变 var(--color-gradient-from)→var(--color-gradient-to) 的克制运用）、h1/副标题流式字号（clamp，design 字体令牌）、装饰光斑 `hero__visual`（模糊圆斑 + --dur-slow 浮动动画，仅 transform/opacity）；`.stats` 三列网格（base 单列）、`.stat-item__value` 使用 `--font-mono` + `font-variant-numeric: tabular-nums` + --color-accent 强调、label 用 muted 色。
  - **涉及文件**：`css/style.css`（追加）
  - **验收标准**：
    - 首屏（1440×900 与 375×667）不滚动可完整看到 h1 与双 CTA（FR-04 验收）；
    - 光斑动画只使用 transform/opacity（不触发重排）；
    - 统计数字等宽对齐（tabular-nums）；
    - 暗色主题下 Hero 视觉与文本对比度依然达标（令牌联动自动生效）。
  - **依赖**：T-10
  - **并行性**：C 组串行链第 2 环

- [x] **T-12 三类卡片网格样式（权益分类/合作站点/热门权益）**
  - **任务描述**：实现 `.category-grid`/`.partner-grid`/`.hot-grid` 响应网格（base 1 列 → md 2 列 → lg 3 列，媒体查询字面量断点 768/1024）；三类卡片统一质感：`--radius-md` 圆角、`--shadow-sm` 默认阴影、hover `translateY(-3px)` + 阴影升至 `--shadow-lg`（--dur-base + --ease-standard）；`.partner-card__avatar` 渐变环头像（icon 文本居中，回退地球图标占位）；`.category-card__icon` 24px 图标底（--color-primary-soft）；卡片内链接 hover 主色化 + 2px 渐变下划线展开。
  - **涉及文件**：`css/style.css`（追加）
  - **验收标准**：
    - 三类卡片在 3 档断点下列数正确（NFR-13）；
    - 卡片 hover 反馈可感知（位移 + 阴影渐升，FR-18）；
    - 键盘 focus-visible 时卡片内链接有描边反馈（FR-18）；
    - partner 头像对 icon 缺省与存在两种形态均有正确样式。
  - **依赖**：T-11
  - **并行性**：C 组串行链第 3 环

- [x] **T-13 使用步骤、FAQ 手风琴、信任背书与页脚样式**
  - **任务描述**：实现：`.steps` 步骤条（lg 横向 4 列带连接线、base 纵向；序号 `step-item__no` 用 --color-accent 琥珀强调 + --radius-full 胶囊）；`.faq-item` details/summary 样式（summary hover/焦点态、展开指示箭头旋转 --dur-base、`.faq-item__answer` 展开 padding 过渡，兼容无动画时直接显示）；`.trust-badges` 徽章行（success 色调图标底）与 `blockquote.testimonial` 引用样式（左侧引号线、figcaption 署名 muted）；页脚布局（深色表面、友链列表 flex-wrap、回到顶部链接 hover 态、版权行 muted）。
  - **涉及文件**：`css/style.css`（追加）
  - **验收标准**：
    - summary 获得焦点与 hover 均有可感知反馈（FR-18/NFR-10）；
    - details 展开收起有过渡但禁用动画时内容完整可见；
    - 页脚在窄屏（320px）友链换行不溢出；
    - 全部样式引用令牌，暗色主题下走查无裸色残留。
  - **依赖**：T-12
  - **并行性**：C 组串行链第 4 环

- [x] **T-14 响应式断点总装、移动端菜单、reduced-motion 与无障碍收尾**
  - **任务描述**：完成响应式与可访问性收尾：核对 4 档断点（base<768/md≥768/lg≥1024/xl≥1280）全部布局（汉堡菜单 <768 显示 `#nav-toggle`、`nav-open` 展开为全宽下拉菜单、桌面隐藏汉堡）；`section { scroll-margin-top: var(--header-h) }`（锚点定位不被吸顶导航遮挡）；`@media (prefers-reduced-motion: reduce)` 全局规则（animation/transition: none、`[data-reveal] { opacity:1; transform:none }`、`html { scroll-behavior:auto }`）；`[data-reveal]` 初始态（opacity:0 + translateY(16px)，由 reveal.js 加 is-visible 显现——**确保 JS 失败时不隐藏内容：初始态必须由 JS 添加类而非 CSS 默认**，采用 `.js [data-reveal]` 渐进增强选择器或等价方案）；320px~1920px 全区间走查（无横向滚动/重叠/截断）。
  - **涉及文件**：`css/style.css`（追加/总装）
  - **验收标准**：
    - 320px/768px/1024px/1440px 四档视口抽检布局正常（NFR-13 验收口径）；
    - 移动端汉堡菜单开合样式正确，aria-expanded 状态有视觉区分；
    - 开启系统"减少动态效果"后全站无动画、内容完整（FR-19）；
    - 禁用 JS 时 [data-reveal] 内容不隐藏（NFR-07 回归）——用浏览器禁 JS 实测；
    - 暗色模式全站走查：所有板块在 html[data-theme=dark] 下观感协调、原生控件（滚动条）随 color-scheme；
    - style.css 总体积 ≤25KB。
  - **依赖**：T-13
  - **并行性**：C 组串行链终点；是 T-35 的前置之一

---

## 6. 分组 D：JS 交互（T-15 ~ T-22）

> 本组全部模块遵循 design 2.1.1 UMD-lite 包装（浏览器挂 `window.HY.*`、Node `module.exports`，函数名全局唯一）、JSDoc 类型标注（4.2.1 typedef）；纯函数不触碰 DOM；DOM 装配函数不做业务计算；所有 localStorage/matchMedia 访问 try/catch 包裹。除 T-18/T-22 外各任务为独立文件，**可并行开发**。

- [x] **T-15 实现 js/modules/validate.js（数据校验纯函数）**
  - **任务描述**：按 design 2.2 签名实现三个纯函数：`isValidHttpUrl(value)`（http/https 绝对 URL 判定，`new URL()` 解析 + 协议白名单，大写主机合法）；`validateEntry(entry, index)`（单条目校验：name/url/desc 三必填非空字符串、url 合法性、icon 非空且 ≤4 字符采纳否则忽略回退、未知扩展字段容忍保留在原始条目但规范化输出仅含 NormalizedEntry 四字段；返回 `{valid, entry, errors}`，errors 格式 `[data] 条目 #i：…` 按 design 4.2.2 警告信息表）；`validateEntries(list)`（列表级校验，null/非数组返回空报告不抛错并附带警告文案 `[data] MEMBER_SITE_DATA 缺失或不是数组，保留静态内容`）。
  - **涉及文件**：`js/modules/validate.js`（新建）
  - **验收标准**：
    - UMD-lite 包装正确（浏览器 window.HY.validate 系列函数可用、Node require 返回 api 对象）；
    - design 1.3.6 用例表中 validate 三个套件的全部输入/输出行为满足（如 `javascript:alert(1)`→false、`www.x.com`→false、含 `{foo:1}` 扩展字段→valid 等）；
    - desc >30 汉字仅容忍不拒绝；
    - 无 DOM 访问、无全局副作用（纯函数，双端可测）。
  - **依赖**：T-01（目录）
  - **并行性**：W2 窗口可与 B 组并行；与 T-16/T-17/T-19/T-20/T-21 并行

- [x] **T-16 实现 js/modules/merge.js（友链合并纯函数）**
  - **任务描述**：按 design 2.2 签名实现：`normalizeUrl(url)`（生成去重键：协议+主机小写、去尾斜杠；http≠https 不合并；非法输入原样返回不抛错）；`mergeLinkLists(base, override)`（并集合并：base 顺序保持、同 URL 时 name/desc 以 override 为准、override 新条目按序追加末尾、**永不删除 base 条目**——FR-12 防御核心）。
  - **涉及文件**：`js/modules/merge.js`（新建）
  - **验收标准**：
    - design 1.3.6 merge 套件全部用例行为满足：同列表 6↔6 → 6 条；改 desc → 仅该条更新；+1 → 7 条新条在末尾；override 删 1 条基线 → 结果仍含全部 6 条 base；空 base → 结果=override；尾斜杠差异正确去重；
    - UMD-lite 挂 HY；纯函数无 DOM。
  - **依赖**：T-01
  - **并行性**：同 T-15

- [x] **T-17 实现 js/modules/render.js 纯函数层（HTML 字符串构建）**
  - **任务描述**：按 design 2.2 实现 render.js 的三个纯函数：`escapeHtml(value)`（`& < > " '` 五字符实体化，中文原样）；`siteCardHTML(entry)`（生成一张 partner-card HTML 字符串：name/desc 经 escapeHtml 注入、`a` 带 `target="_blank" rel="noopener noreferrer"`、href=url、icon 存在输出头像字符/缺失输出默认地球 SVG 占位，类名遵循 BEM-lite）；`footerLinkHTML(entry)`（生成 `li > a` 友链条目：锚文本=name、href=url、新标签页安全属性）。
  - **涉及文件**：`js/modules/render.js`（新建）
  - **验收标准**：
    - `<script>alert(1)</script>` 与 `<img onerror>` 注入均被实体化（design 1.3.6 render 套件）；
    - 卡片 HTML 结构与 T-07 静态基线卡片结构一致（保证重渲染无视觉跳变）；
    - UMD-lite 挂 HY；无 DOM 访问。
  - **依赖**：T-01
  - **并行性**：同 T-15；与 T-18 串行（同文件）
  - **风险提示**：卡片 HTML 与静态基线结构不一致会导致 JS 增强层渲染后样式/语义跳变，实现时逐类名对照 T-07

- [x] **T-18 实现 js/modules/render.js DOM 装配层**
  - **任务描述**：在 render.js 追加五个 DOM 函数（薄壳化，只做"取锚点→调纯函数→写回"）：`renderSiteCards(container, entries)`（innerHTML 全量替换为 siteCardHTML 序列）；`syncFooterLinks(container, entries)`（解析静态 li 提取 base 清单 → mergeLinkLists 合并 → 重建列表，返回合并结果供断言）；`updateStat(el, value, opts)`（写入统计数字，默认 rAF 400ms count-up 动画，reduced-motion 或 opts.animate=false 直显终值）；`countElements(root, selector)`（选择器计数）；`setFooterYear(el, year?)`（默认当前年份回填）。
  - **涉及文件**：`js/modules/render.js`（追加）
  - **验收标准**：
    - detached 容器测试：3 条目渲染 3 张卡片顺序一致、旧内容被替换（design 1.3.6 DOM 套件）；
    - syncFooterLinks 的 6↔6/±1/改 desc 四场景行为正确；
    - updateStat 动画使用 rAF 且 reduced-motion 下直显；
    - 容器为 null 时静默跳过不抛错（2.1.3 规则）；
    - UMD-lite 导出全部 8 个函数（3 纯 + 5 DOM）。
  - **依赖**：T-17（同文件）、T-16（syncFooterLinks 依赖 mergeLinkLists）
  - **并行性**：W3 窗口（render.js 串行链第 2 环）

- [x] **T-19 实现 js/modules/theme.js（主题三态管理，D4）**
  - **任务描述**：按 design 2.2 实现五个函数：`getStoredTheme(storage)`（读 localStorage['hy-theme']，仅 'light'/'dark' 合法，垃圾值→null，**storage 抛异常→null 不炸**）；`resolveTheme(stored, prefersDark)`（三态解析四组合）；`applyTheme(root, theme)`（设置/切换 html[data-theme] + 同步 #theme-toggle 的 aria-label「切换到暗色主题/切换到亮色主题」与日/月图标显示）；`toggleTheme(root, storage)`（取反当前主题 → 应用 → try/catch 持久化）；`initTheme(doc, opts)`（读取→解析→应用→无记忆时监听 matchMedia change 实时跟随系统，有记忆则不再跟随；与 T-04 内联引导脚本结果幂等）。storage 一律经 StorageLike 参数注入。
  - **涉及文件**：`js/modules/theme.js`（新建）
  - **验收标准**：
    - 手动切换即时生效、无刷新（FR-03）；
    - 刷新与重访后主题保持（localStorage）；
    - 清除 localStorage + 系统深色 → 默认暗色；系统切换深浅色时页面实时跟随（无记忆态）；
    - 隐私模式/ localStorage 禁用下功能不报错（会话内生效）；
    - mock 存储（含抛异常实现）下 getStoredTheme 返回 null；
    - UMD-lite 挂 HY。
  - **依赖**：T-01、T-04（内联脚本与 #theme-toggle 契约）
  - **并行性**：W2 窗口可与 B 组并行（仅依赖 T-04 的契约，函数本身不读页面）

- [x] **T-20 实现 js/modules/accordion.js 与 js/modules/reveal.js（FAQ 单开与入场动效）**
  - **任务描述**：accordion.js：`enforceSingleOpen(container)`（监听 details toggle 事件实现互斥单开——打开任一项自动收起其他项）+ `initFaq(container)`（绑定 #faq 容器，幂等防重复绑定）。reveal.js：`setupReveal(root)`（IntersectionObserver 观察 `[data-reveal]` 元素进入视口加 `is-visible` 类触发 CSS 过渡；降级路径：环境无 IO 或 prefers-reduced-motion: reduce 时立即为全部元素加 is-visible 直接呈现）。
  - **涉及文件**：`js/modules/accordion.js`、`js/modules/reveal.js`（新建）
  - **验收标准**：
    - 打开第 2 项 FAQ 时第 1 项自动收起，同一时刻最多展开一项（FR-10）；
    - initFaq 重复调用不重复绑定（幂等）；
    - 滚动到各板块时渐显上移入场（FR-19）；
    - 模拟无 IO 环境（如旧浏览器）与 reduced-motion 下内容立即可见不隐藏；
    - IO 回调只切换 class，不做布局计算；
    - 两文件各自 UMD-lite 挂 HY。
  - **依赖**：T-01
  - **并行性**：W2 窗口可与 B 组并行

- [x] **T-21 实现 js/modules/nav.js（锚点平滑滚动、焦点管理与移动端菜单）**
  - **任务描述**：按 design 2.2 实现：`initSmoothScroll(doc)`（拦截站内 `#` 锚点点击，滚动行为交给 CSS `scroll-behavior:smooth`，滚动完成后对目标板块执行 `el.focus({preventScroll:true})`——目标已带 tabindex="-1"，辅助技术可感知焦点）；`initMobileNav(doc)`（#nav-toggle 开合移动端菜单：翻转 aria-expanded、切换 nav-open 类、Esc 键关闭、点击菜单外区域关闭、开合时锁 body 滚动可选）。
  - **涉及文件**：`js/modules/nav.js`（新建）
  - **验收标准**：
    - 点击导航任一锚点平滑滚动到对应板块且目标获得焦点（FR-02）；
    - focus 不打断滚动动画（preventScroll）；
    - 移动端（<768px）汉堡可开合、aria-expanded 正确翻转、Esc 可关闭（NFR-10/NFR-13）；
    - 纯键盘 Tab 顺序与视觉顺序一致；
    - UMD-lite 挂 HY。
  - **依赖**：T-01
  - **并行性**：W2 窗口可与 B 组并行

- [x] **T-22 实现 js/main.js 编排入口与 D1 联动算法**
  - **任务描述**：按 design 1.2.4/D1/2.2 实现：`readSiteData(globalObj)`（安全读取 `MEMBER_SITE_DATA`，缺失/非数组返回 null，杜绝裸引用 ReferenceError）；`init()`（幂等编排：① readSiteData → validateEntries；② valid.length ≥ 1 时 renderSiteCards(#partner-list) 全量重渲染 + updateStat(#stat-sites, valid.length) 统计联动 + syncFooterLinks(#footer-links) 并集合并；③ 数据缺失或 valid=0 时保留静态基线不白屏、console.warn 定位原因；④ invalid 逐条 console.warn 隔离；⑤ updateStat(#stat-categories, countElements('.category-card')) 与 updateStat(#stat-packages, countElements('.hot-card'))；⑥ 绑定全部交互：initTheme/initFaq/setupReveal/initSmoothScroll/initMobileNav/setFooterYear(#footer-year)；⑦ 各功能块 try/catch 相互隔离，锚点缺失静默跳过）。
  - **涉及文件**：`js/main.js`（新建）
  - **验收标准**：
    - 页面加载后：`#partner-list` 卡片数 = data.js 有效条目数（6）、顺序与内容一致、`#stat-sites` 文本 = "6"、`#footer-links` ≥6 条（design 1.3.6 集成用例）；
    - 临时在 data.js 追加 1 条合法条目刷新 → 卡片变 7、统计变 7、页脚多 1 条（FR-15）；
    - 临时注入 1 条无效条目（缺 url）刷新 → 其余 6 条正常、控制台有 `[data] 条目 #i：…` 警告、整页不崩（FR-17）；
    - 临时注入扩展字段条目 → 正常渲染无报错（FR-16）；
    - 注释掉 data.js script 标签模拟加载失败 → 静态基线完整保留 + console.warn（D1 降级③）；
    - init 重复调用不产生重复绑定/重复渲染；
    - 浏览器控制台无任何未捕获异常。
  - **依赖**：T-09（页面锚点齐全）、T-15、T-16、T-18、T-19、T-20、T-21
  - **并行性**：D 组汇合点；不依赖 C 组（可与 C 组并行），但完整体验需 C 完成
  - **风险提示**：本任务是 FR-05/07/12/15/16/17 六条功能需求的联动交汇点，验收标准中的"临时改动 data.js"四组实验是核心证据，必须逐项执行并留档

---

## 7. 分组 E：SEO/AI 文件（T-23 ~ T-27，多数可并行）

- [x] **T-23 在 index.html 嵌入 JSON-LD 四实体结构化数据**
  - **任务描述**：在 index.html head 内添加单条 `<script type="application/ld+json">`，照抄 design 1.3.4 JSON-LD 草案：`@graph` 数组包含 WebSite（含 alternateName/publisher 引用）、Organization（logo 指向 og-image.png 绝对 URL）、ItemList（numberOfItems=6 + 6 个 ListItem，position/name/url 与 6 站基线一致）、FAQPage（6 个 Question，**问答文本与页面 #faq 内 details 逐字一致**——以 T-08 落稿文案为准）。@id 锚点格式：`https://huiyuan6.github.io/#website|#organization|#partners|#faq`。
  - **涉及文件**：`index.html`（编辑 head）
  - **验收标准**：
    - JSON 语法有效（`JSON.parse` 无错 / 浏览器无控制台告警）；
    - 四类实体齐全且字段与 design 草案一致（NFR-04）；
    - FAQPage 6 问与页面 details 逐字一致（含标点）；ItemList 6 条 URL 与基线逐字符一致；
    - 通过 Google Rich Results Test 或 schema.org 校验器无结构性错误；
    - 内容与页面可见内容一致（NFR-04 验收点）。
  - **依赖**：T-08（FAQ 文案定稿）、T-09（友链基线）、T-02（data 基线）；**不得与 B 组任务并行**（同文件）
  - **并行性**：W3 窗口（B 组完成后），可与 C 组/D 组/F 组并行
  - **风险提示**：FAQ 文案是"页面 + JSON-LD"双处一致性硬规则的锚点，本任务之后任何 FAQ 文案修改必须双处同步（写入发版清单）

- [x] **T-24 创建 robots.txt 与 sitemap.xml**
  - **任务描述**：在仓库根目录创建 robots.txt（内容照抄 design 1.3.4 草案：`User-agent: *` / `Allow: /` / `Sitemap: https://huiyuan6.github.io/sitemap.xml`，允许全部抓取含 AI 爬虫）与 sitemap.xml（单 URL：loc=`https://huiyuan6.github.io/`、lastmod=发布日期、changefreq=monthly、priority=1.0，XML 声明与 xmlns 按 design 草案）。
  - **涉及文件**：`robots.txt`、`sitemap.xml`（新建）
  - **验收标准**：
    - 两个文件位于仓库根目录（GitHub Pages 根路径可访问，NFR-05）；
    - robots.txt 三行指令齐全；sitemap.xml 通过 XML 语法校验（浏览器打开无解析错误）；
    - sitemap 的 loc 与 canonical 一致（正式地址）。
  - **依赖**：无
  - **并行性**：W1 窗口即可执行（全项目最独立任务之一）

- [x] **T-25 创建 llms.txt（AI 爬虫站点概览）**
  - **任务描述**：在仓库根目录创建 llms.txt，结构照抄 design 1.3.4 草案：H1 标题「会员权益（HuiYuan）」+ 引言摘要 + 站点地址/语言元信息 + 「核心板块」（5 个锚点链接及说明）+「合作站点」（6 站名称/URL/描述，与 data.js 基线一致）+「说明」（纯导航定位 + data.js 维护机制）。纯文本 UTF-8。
  - **涉及文件**：`llms.txt`（新建）
  - **验收标准**：
    - 内容准确覆盖站点定位、板块结构、合作站点清单与入口（NFR-06 验收点）；
    - 6 站 URL 与基线逐字符一致、描述与 data.js desc 一致；
    - 板块锚点 URL 格式 `https://huiyuan6.github.io/#xxx` 正确；
    - 纯文本无 HTML 标记。
  - **依赖**：T-02（data 基线）
  - **并行性**：W2 窗口可与 B/D 组并行

- [x] **T-26 制作 favicon.svg 与 og-image.png**
  - **任务描述**：创建 `assets/favicon.svg`（渐变圆角方块 + 品牌字形「会」，品牌渐变 #4F46E5→#7C3AED，≤2KB）；从 SVG 源导出 `assets/og-image.png`（1200×630、品牌渐变底 +「会员权益」字标 + 副标语「一站式会员权益聚合导航」，≤100KB；导出方式：浏览器放大截图或矢量工具导出，PNG-8/压缩后达标）。head 中的引用（favicon link 与 OG/Twitter image 标签）已在 T-04 写好，本任务产出实际文件。
  - **涉及文件**：`assets/favicon.svg`、`assets/og-image.png`（新建）
  - **验收标准**：
    - favicon.svg ≤2KB 且浏览器标签页图标正常显示（明暗浏览器主题下均清晰）；
    - og-image.png 尺寸 1200×630、≤100KB；
    - 两文件与 head 引用路径匹配（`assets/favicon.svg`、绝对 URL og-image）；
    - og:image 可通过绝对 URL 访问（T-37 线上验证）。
  - **依赖**：T-01（assets/ 目录）
  - **并行性**：W2 窗口，独立任务
  - **风险提示**：og-image 是页面对外分享卡片的唯一视觉，若本机无导出工具，允许以纯色渐变+系统字体渲染的简化版先行占位，T-37 前替换为终版

- [x] **T-27 创建 404.html 自定义错误页**
  - **任务描述**：在仓库根目录创建 404.html（GitHub Pages 约定自动生效）：极简语义化页面——品牌标识、提示文案「页面不存在或已被移动」、返回首页链接（href 使用绝对 URL `https://huiyuan6.github.io/`，因为 404 可能发生在任意路径下）、可选回到上一页提示；引用 `css/style.css` 相对路径复用设计令牌保持视觉一致（或内联最小样式）。附 h1 与基本 meta（title/noindex）。
  - **涉及文件**：`404.html`（新建）
  - **验收标准**：
    - 访问不存在的路径（如 /xyz）时 GitHub Pages 返回该页面内容（线上验证在 T-37）；
    - 返回首页链接指向正式地址且可用；
    - 页面带 `<meta name="robots" content="noindex">`；
    - 无 JS 依赖、样式在 file:// 下不 404（相对路径引用正确）。
  - **依赖**：T-03（引用 style.css 令牌）
  - **并行性**：W3 窗口
  - **备注（追溯说明）**：404.html 为用户指定交付物（Phase C 任务派发明确列出），design.md 1.2.3 文件结构树未包含——本任务作为设计基线的**补充项**纳入，实现保持极简以不扩大范围

---

## 8. 分组 F：测试（T-28 ~ T-33）

> 落地 design 1.3.6/D5 双路径测试策略：浏览器运行器为主（tests/test.html 双击即跑）、Node 为辅（可选）；用例单一事实源 tests/cases.js，两个执行器消费同一注册表，browser-only 用例 Node 端自动跳过。用例总量目标 40 例（design 1.3.6 清单）。

- [x] **T-28 编写 tests/assert.js 轻量断言库**
  - **任务描述**：实现四个断言函数与汇总结构：`ok(cond, msg)`、`eq(actual, expected, msg)`（宽松相等）、`deepEq(actual, expected, msg)`（深比较，用例需比对对象/数组）、`throws(fn, msg)`（执行预期抛错）；断言失败时抛出带 msg 的 AssertionError 并由执行器捕获计数。UMD-lite 包装（浏览器挂全局、Node module.exports）。
  - **涉及文件**：`tests/assert.js`（新建）
  - **验收标准**：
    - 四函数行为正确（成功静默、失败抛错且消息含期望/实际值）；
    - 双端可用（浏览器 script 标签 + Node require）；
    - 无第三方依赖。
  - **依赖**：T-01（tests/ 目录）
  - **并行性**：W2 窗口，独立任务

- [x] **T-29 编写 tests/cases.js 纯函数与数据契约用例（双端共享）**
  - **任务描述**：实现用例注册表 `HY_TESTS.register(suite, name, fn, browserOnly)` 与 mock 数据集，按 design 1.3.6 用例清单注册**双端用例**（browserOnly 省略/为 false）：① validate 三套件（isValidHttpUrl 8 边界、validateEntry 字段缺失/空串/非字符串/扩展字段/icon 边界、validateEntries 空数组/混合好坏/null 容错）；② merge 两套件（normalizeUrl 归一规则、mergeLinkLists 六场景含"永不删除 base"）；③ render 纯函数三套件（escapeHtml 恶意注入、siteCardHTML 安全属性/回退、footerLinkHTML）；④ **data.js 数据契约套件**——MEMBER_SITE_DATA 为数组且长度=6、6 条 URL 与基线常量**逐字符相等**（含尾斜杠）、原 3 条 name/url/desc 与 spec 6.1 逐字符回归、全部条目通过 validateEntries、注入 `{foo:1}` 扩展字段后仍 valid；⑤ theme 纯函数两套件（resolveTheme 四组合、getStoredTheme 含抛异常存储 mock）。基线 URL 常量在 cases.js 内定义**唯一副本**（design 1.3.6 测试数据约定）。
  - **涉及文件**：`tests/cases.js`（新建）
  - **验收标准**：
    - 用例覆盖 design 1.3.6 清单中全部"双端"行；
    - 基线 URL 常量为唯一副本且被 data 契约用例引用；
    - mock 数据含合法/非法/恶意/边界四类条目；
    - UMD-lite：浏览器注册到 HY_TESTS、Node module.exports；
    - 文件语法双端通过（node -c / 浏览器加载无错）。
  - **依赖**：T-28（断言）、T-15/T-16/T-17（被测函数）、T-19（theme 纯函数）、T-02（被测数据）
  - **并行性**：W3 窗口；与 T-30 串行（同文件）

- [x] **T-30 编写 tests/cases.js DOM 与集成用例（browser-only）**
  - **任务描述**：在 cases.js 追加注册 browserOnly=true 的用例（design 1.3.6）：renderSiteCards（detached ul 渲染条数/顺序/替换）、syncFooterLinks（静态 6 条 + data 相同→仍 6 li；+1→7 li；删 1→仍 6 li；改 desc→文本更新）、countElements（6 卡容器→6、空容器→0）、setFooterYear（当前年/定制年）、theme.applyTheme（data-theme 设置/切换 + aria-label 同步）、accordion 单开（开第 2 项第 1 项收起）、页面集成（window.HY 命名空间函数键齐全、加载后 #partner-list 卡片数=data 有效条目数、#footer-links ≥6、#stat-sites 文本=有效条目数）。
  - **涉及文件**：`tests/cases.js`（追加）
  - **验收标准**：
    - DOM 用例使用 detached 容器或真实页面锚点，不依赖测试框架；
    - 全部标记 browserOnly=true（Node 端自动跳过）；
    - 集成用例在 test.html 环境下针对真实 index.html DOM 可执行（test.html 内嵌页面或引用生产模块后以 fixture 呈现，按 design 1.3.6 "在 detached 容器/真实页面上渲染断言"）；
    - 用例总数（T-29 + T-30）≥40。
  - **依赖**：T-29（同文件）、T-18/T-19/T-20（被测 DOM 函数）、T-09（页面锚点契约）
  - **并行性**：cases.js 串行链第 2 环

- [x] **T-31 编写 tests/test.html 与 tests/browser-runner.js 浏览器运行器**
  - **任务描述**：创建 test.html：页面含 `#test-results` 结果容器，按 design 1.3.6 顺序加载 `../data.js` → `../js/modules/*.js`（7 个模块）→ `assert.js` → `cases.js` → `browser-runner.js`；为集成用例准备符合 2.1.3 锚点契约的 DOM fixture（partner-list/footer-links/stat 元素等）。browser-runner.js：`runAll('browser')` 在 DOMContentLoaded 后遍历注册表执行用例，捕获断言异常，向 #test-results 输出逐条 pass/fail 行与汇总横幅（全绿 = "ALL PASSED (n)"，任一红 = "FAILED (x/n)"），同步 console 输出。
  - **涉及文件**：`tests/test.html`、`tests/browser-runner.js`（新建）
  - **验收标准**：
    - **双击 test.html（file://）即可运行**，无需服务器（D5 主路径验收）；
    - 40 例全部执行，面板逐条显示且汇总数字与实际一致；
    - 断言失败不中断后续用例；
    - 结果面板明暗主题均可读（复用生产 CSS 或自带最小样式）。
  - **依赖**：T-29、T-30（用例注册表）
  - **并行性**：在 T-30 完成后执行；与 T-32 可并行

- [x] **T-32 编写 tests/node/run-tests.js Node 执行器（可选路径）**
  - **任务描述**：创建 Node 端执行器：用 `node --test` 加载 cases.js 注册表，`require()` 各 UMD 模块（validate/merge/render/theme）与 data.js，执行全部非 browser-only 用例并输出 node:test 标准结果；browser-only 用例自动跳过。
  - **涉及文件**：`tests/node/run-tests.js`（新建）
  - **验收标准**：
    - 本机有 Node ≥18 时 `node --test tests/node/` 全部通过、browser-only 用例被跳过；
    - 若本机无 Node 环境，本任务允许标记为"环境不可用跳过"，不阻塞交付（design 1.3.6 约定）；
    - 不引入任何 npm 依赖（仅 Node 内置模块）。
  - **依赖**：T-29
  - **并行性**：与 T-30/T-31 可并行

- [x] **T-33 双路径运行测试并修复至全绿**
  - **任务描述**：运行浏览器运行器（tests/test.html，file:// 与 localhost 两种方式各跑一次）与 Node 路径（如可用），记录失败用例并修复。修复原则：优先修正**实现代码**（模块/页面）；仅当用例本身违背 design 契约时才修用例并在提交说明中记录理由。输出测试报告（用例数/通过数/跳过数/环境）。
  - **涉及文件**：视失败点而定（`js/modules/*.js`、`js/main.js`、`index.html`、`tests/cases.js`）
  - **验收标准**：
    - 浏览器运行器显示 ALL PASSED（40 例全绿，含集成用例）；
    - Node 路径通过（或明确记录环境不可用跳过）；
    - file:// 与 localhost 双方式运行结果一致；
    - 测试报告留档（截图/文本汇总，NFR-16 可追溯要求）。
  - **依赖**：T-22（main.js 集成完成）、T-30、T-31、T-32
  - **并行性**：质量门禁任务，F 组终点；完成后解锁 T-35

---

## 9. 分组 G：文档（T-34）

- [x] **T-34 重写 README.md 为项目说明与维护指引**
  - **任务描述**：将现有单行 README.md 更新为完整项目文档：项目定位（会员权益聚合导航官网、站群成员）；技术栈（纯静态、原生 HTML/CSS/JS、零依赖零构建）；目录结构说明（对照 design 1.2.3）；本地运行指引（双击 index.html 的 file:// 方式 + `python -m http.server 8000` / `npx serve` 方式）；测试指引（双击 tests/test.html + 可选 `node --test tests/node/`）；**data.js 维护指南**（字段表：name/url/desc 必填 + icon 可选 + 扩展字段容忍；"追加即生效"机制说明；**发版同步清单**：修改 data.js 后发版时须同步静态基线 index.html 卡片/页脚、llms.txt、JSON-LD ItemList——D1 维护约定）；部署说明（push 默认分支即发布，正式地址）。
  - **涉及文件**：`README.md`（重写）
  - **验收标准**：
    - 覆盖上述全部章节，命令可直接复制执行；
    - data.js 字段表与 design 4.2.2 一致；发版同步清单完整列出三处同步点；
    - 与仓库实际结构一致（无虚构文件）；
    - 中文行文、专业排版。
  - **依赖**：T-33（测试路径真实可用后描述才准确）
  - **并行性**：W4 窗口，可与 T-35/T-36 并行

---

## 10. 分组 H：验证与部署（T-35 ~ T-37）

- [x] **T-35 本地全量验证清单执行**
  - **任务描述**：对照 spec 7.1/7.2 验收清单在本地逐项执行并留档：(1) **file:// 验证**——双击 index.html：MEMBER_SITE_DATA 可访问、合作站点 6 卡渲染、统计联动、主题切换与记忆（刷新保持）、FAQ 单开、锚点导航、6 友链跳转全部可用（NFR-14）；(2) **静态服务器验证**——`python -m http.server 8000` 访问 localhost:8000 行为一致且资源均 200；(3) **禁用 JS 验证**——浏览器禁 JS（或 `curl file:///.../index.html` / 源码查看）：全部板块文本 + 权益分类 + FAQ 问答 + 6 友链可获取（NFR-07）；(4) **键盘全流程**——仅键盘完成"切换主题 → 导航到 FAQ → 展开问答 → 点击友链"（NFR-10）；(5) **响应式抽检**——320/768/1024/1440 四档视口无横向滚动/重叠/截断（NFR-13）；(6) **对比度抽检**——明暗两主题下正文/muted/主色链接/按钮文本用对比度工具抽检达 WCAG AA（NFR-11）；(7) 逐条核对 spec 7.1 的 19 项功能验收 + 7.3 整体验收观感项。输出验证记录（清单勾选 + 问题列表）。
  - **涉及文件**：只读验证（发现问题时回流到对应任务修复）
  - **验收标准**：
    - spec 7.1（19 项 FR）+ 7.2 中可在本地验证的 NFR 全部通过并留档；
    - 发现的问题已修复或登记（回流修复后重验）；
    - 验证记录归档到仓库（如 `.codearts/specs/membership-benefits-site/` 下验证报告，NFR-16）。
  - **依赖**：T-33（测试全绿）、T-14（视觉完成）、T-23~T-27（E 组 SEO 文件齐备）
  - **并行性**：与 T-36 可并行；是 T-37 的硬前置

- [x] **T-36 资源体积预算审计**
  - **任务描述**：按 design 1.2.5 预算表逐项测量：index.html ≤50KB、css/style.css ≤25KB、js/（main + 7 modules）合计 ≤22KB、data.js ≤2KB、核心资源合计 ≤99KB（红线 ≤200KB，NFR-08）；assets/og-image.png ≤100KB、favicon.svg ≤2KB；扫描确认无任何外部依赖引用（无 CDN/网络字体/第三方脚本 URL）。测量方式：文件系统字节数（PowerShell `Get-Item .Length` / `ls -l`）。
  - **涉及文件**：只读审计（超标时回流对应任务瘦身）
  - **验收标准**：
    - 各分项与合计均在预算内，输出测量表格留档；
    - HTML/CSS/JS 源码中 grep 不到外链 CDN/字体/脚本引用；
    - 超标项已优化或明确豁免（图片不计入核心预算）。
  - **依赖**：T-14（CSS 定稿）、T-22（JS 齐备）、T-23（JSON-LD 计入 HTML 体积）、T-26（图片就位）
  - **并行性**：W4 窗口，与 T-35/T-34 并行

- [x] **T-37 提交推送 GitHub Pages 并完成线上回归**
  - **任务描述**：(1) git add 全部产物 → commit（含 spec/design/tasks 三份 SDD 文档与验证记录）→ push 默认分支；(2) 等待 GitHub Pages 自动发布（通常 1~2 分钟）；(3) 线上回归：`https://huiyuan6.github.io/` 可访问且功能完整（重复 T-35 的核心项）；robots.txt/sitemap.xml/llms.txt/assets/og-image.png/assets/favicon.svg 均 HTTP 200（NFR-05/06）；`curl -s https://huiyuan6.github.io/ | grep` 验证 6 友链 URL 与板块文本可被不执行 JS 的客户端获取（NFR-07）；访问不存在路径返回 404.html 内容；抽检 canonical/OG/JSON-LD 在线上源码中正确（NFR-02/03/04）；确认资源引用在根路径部署下正常（NFR-15）；(4) 回归结论归档（NFR-16：SDD 各阶段产出物齐备可追溯）。
  - **涉及文件**：全部仓库产物（提交）；线上验证记录
  - **验收标准**：
    - 推送后线上地址功能完整（NFR-15 验收点）；
    - 5 个 SEO/AI 静态文件线上 200 可访问；
    - curl 抓取首页可获取 6 友链与全部板块文本；
    - 404 页面线上生效；
    - spec 7.2 部署相关验收项（NFR-15）与 7.3 整体验收（线上全量回归）通过；
    - 回归报告归档，SDD 六阶段产出物（spec/design/tasks/代码/测试/审查/验证）齐备可追溯（NFR-16）。
  - **依赖**：T-34（README 入库）、T-35（本地验证通过）、T-36（预算达标）
  - **并行性**：最终任务，无后续并行
  - **风险提示**：若线上出现本地未复现的问题（如路径大小写、MIME 类型），利用 git revert 回滚后修复重推（design 1.3.7 回滚方案）

---

## 11. 需求/设计 → 任务追溯矩阵

### 11.1 FR → 任务映射（19/19 全覆盖）

| 需求 | 需求摘要 | 覆盖任务（主 → 辅） |
| --- | --- | --- |
| FR-01 | 顶部导航栏 | T-04（结构）→ T-10（样式）→ T-21（nav.js） |
| FR-02 | 锚点导航与焦点管理 | T-04（tabindex 结构）→ T-14（scroll-margin）→ T-21（focus 管理） |
| FR-03 | 暗色模式切换/记忆/跟随 | T-03（暗色令牌）→ T-04（内联引导脚本+按钮）→ T-19（theme.js）→ T-35（验证） |
| FR-04 | Hero 主视觉区 | T-05（结构文案）→ T-11（样式） |
| FR-05 | 数据统计区联动 | T-05（data-stat 结构）→ T-18（updateStat/countElements）→ T-22（联动）→ T-30（集成用例） |
| FR-06 | 权益分类卡片 | T-06（结构文案）→ T-12（卡片样式） |
| FR-07 | 合作站点数据驱动 | T-07（静态基线）→ T-17（siteCardHTML）→ T-18（renderSiteCards）→ T-22（重渲染）→ T-29（安全用例） |
| FR-08 | 使用步骤指引 | T-06（结构文案）→ T-13（步骤条样式） |
| FR-09 | 热门权益/套餐 | T-07（结构文案）→ T-12（卡片样式） |
| FR-10 | FAQ 手风琴 | T-08（details 结构）→ T-20（accordion.js）→ T-13（样式）→ T-30（DOM 用例） |
| FR-11 | 信任背书与评价 | T-08（结构文案）→ T-13（样式） |
| FR-12 | 底部 6 站友链 | T-02（data 基线）→ T-09（静态基线 6 条）→ T-16（mergeLinkLists 防御）→ T-18（syncFooterLinks）→ T-29（契约用例逐字符锁定） |
| FR-13 | 页脚站点信息 | T-09（结构）→ T-18（setFooterYear）→ T-13（样式） |
| FR-14 | data.js 脚本化全局变量 | T-02（改造）→ T-04（script 装配） |
| FR-15 | 增删改联动 | T-22（D1 算法）→ T-30（集成用例）→ T-34（README 维护指南） |
| FR-16 | 扩展字段兼容 | T-15（validate 容忍）→ T-29（用例） |
| FR-17 | 数据异常容错 | T-15（校验隔离）→ T-22（降级保护）→ T-29（用例） |
| FR-18 | 悬停/聚焦反馈 | T-03（focus-visible 全局）→ T-10~T-13（各组件 hover 态）→ T-35（验证） |
| FR-19 | 滚动入场动效/减少动态 | T-20（reveal.js）→ T-14（reduced-motion CSS + 防隐藏设计）→ T-35（验证） |

### 11.2 NFR → 任务映射（16/16 全覆盖）

| 需求 | 需求摘要 | 覆盖任务（主 → 辅） |
| --- | --- | --- |
| NFR-01 | 语义化 HTML/单一 h1 | T-04~T-09（结构与标题层级）→ T-35（校验） |
| NFR-02 | 基础元数据完整 | T-04（head 21 项）→ T-37（线上源码抽检） |
| NFR-03 | OG/Twitter 卡片 | T-04（meta）→ T-26（og-image 实体）→ T-37（线上可访问） |
| NFR-04 | JSON-LD 四实体 | T-23（@graph 实现）→ T-37（线上校验） |
| NFR-05 | robots/sitemap | T-24（创建）→ T-37（线上 200 验证） |
| NFR-06 | llms.txt | T-25（创建）→ T-37（线上 200 验证） |
| NFR-07 | 无 JS 核心内容可用 | T-05~T-09（静态基线层）→ T-14（防隐藏设计）→ T-35（禁 JS 验证）→ T-37（curl 验证） |
| NFR-08 | 无框架依赖/≤200KB | T-01~T-22（全栈原生实现）→ T-36（预算审计） |
| NFR-09 | 首屏 2s 可交互 | T-04（defer+内联 SVG+零图片）→ T-03（零网络字体）→ T-35/T-37（验证） |
| NFR-10 | 键盘可达性 | T-03（focus-visible）→ T-04（skip-link/原生元素）→ T-20/T-21（交互键盘化）→ T-35（全流程验证） |
| NFR-11 | 文本对比度 AA | T-03（预校验令牌表）→ T-35（双主题抽检） |
| NFR-12 | alt/aria 正确 | T-04~T-08（aria/aria-hidden 落地）→ T-19（动态 aria-label）→ T-35（验证） |
| NFR-13 | 320~1920px 响应式 | T-03（断点令牌）→ T-12（网格）→ T-14（断点总装+汉堡菜单）→ T-35（四档抽检） |
| NFR-14 | file:// 完整可用 | T-02（var 全局变量）→ T-04（经典脚本+相对路径）→ T-22（容错读取）→ T-31（test.html 双击可跑）→ T-35（file:// 全功能验证） |
| NFR-15 | GitHub Pages 部署 | T-37（推送+自动发布+线上回归） |
| NFR-16 | SDD 一站式交付 | tasks.md 本任务体系 + T-33（测试报告）+ T-34（文档）+ T-35/T-37（验证记录归档） |

### 11.3 文件 → 任务映射（design 1.2.3 文件树全覆盖 + 1 项用户指定补充）

| 文件 | 创建/修改任务 |
| --- | --- |
| `index.html` | T-04（骨架/head）→ T-05~T-09（板块）→ T-23（JSON-LD） |
| `data.js` | T-02（改造） |
| `css/style.css` | T-03（令牌）→ T-10~T-14（组件/响应式） |
| `js/main.js` | T-22 |
| `js/modules/validate.js` | T-15 |
| `js/modules/merge.js` | T-16 |
| `js/modules/render.js` | T-17（纯函数）→ T-18（DOM 装配） |
| `js/modules/theme.js` | T-19 |
| `js/modules/accordion.js` | T-20 |
| `js/modules/reveal.js` | T-20 |
| `js/modules/nav.js` | T-21 |
| `assets/favicon.svg` | T-26 |
| `assets/og-image.png` | T-26 |
| `robots.txt` | T-24 |
| `sitemap.xml` | T-24 |
| `llms.txt` | T-25 |
| `tests/test.html` | T-31 |
| `tests/assert.js` | T-28 |
| `tests/cases.js` | T-29（双端用例）→ T-30（browser-only 用例） |
| `tests/browser-runner.js` | T-31 |
| `tests/node/run-tests.js` | T-32 |
| `README.md` | T-34（重写） |
| `404.html` | T-27（用户指定补充项，design 文件树外） |
| `.codearts/specs/membership-benefits-site/*` | spec.md（已有）/design.md（已有）/tasks.md（本文档）/验证报告（T-35/T-37 产出） |

### 11.4 覆盖率声明

- **19/19 条 FR 全部映射到至少 2 个任务**（结构实现 + 验证/测试双层覆盖）✅
- **16/16 条 NFR 全部映射到至少 1 个任务**（其中 NFR-08/16 由任务体系整体承载 + 专项审计任务验证）✅
- **design 1.2.3 文件树 23 个文件全部映射**，另有 1 个用户指定补充文件（404.html，T-27）✅
- spec 第 7 章 38 项验收标准：由各任务验收标准承接（功能项分散在 T-04~T-22，非功能项集中在 T-35/T-36/T-37）✅

---

## 12. 关键风险点与缓解措施

| # | 风险 | 影响 | 缓解措施（关联任务） |
| --- | --- | --- | --- |
| R1 | **file:// 协议限制**：fetch/XHR/ES Modules 在 file:// 下被 CORS 阻断，资源绝对路径会解析到盘符根 | NFR-14 直接失败、白屏 | 全站经典 `<script src>` + `var` 全局变量（T-02/T-04）；资源一律相对路径（T-04 全局约束）；T-35 专项 file:// 验证 |
| R2 | **6 友链 URL 逐字符锁定**：`https://jdjdndn.github.io/` 尾斜杠丢失、`http://35568.qcxmt.cn` 被误写为 https、手输笔误 | FR-12 验收失败（一项不缺、逐字符准确） | tasks.md 0.3 节基线常量块作为唯一复制源；data.js（T-02）、静态基线（T-09）、JSON-LD（T-23）、llms.txt（T-25）四处引用同源；cases.js 契约用例逐字符断言兜底（T-29） |
| R3 | **data.js 兼容性**：原 3 条数据改动任一字符破坏回归；改造包裹方式引入语法错误导致数据全丢 | 6.1 硬约束违背、页面降级到静态基线 | T-02 验收含"前 3 条逐字符一致"检查；T-29 回归保护用例锁定原 3 条；改造仅动外层包裹（var + Node 导出分支） |
| R4 | **双真源漂移**（静态基线 vs data.js vs llms.txt vs JSON-LD）：后续维护改 data.js 忘记同步快照 | 无 JS 视图/爬虫视图过期 | D1 维护约定写入 README 发版同步清单（T-34）；llms.txt 注释提醒（T-25）；JSON-LD FAQ 双处一致硬规则（T-08/T-23 任务描述显式声明） |
| R5 | **同文件并行编辑冲突**：index.html（7 个任务）、style.css（6 个任务）、cases.js（2 个任务） | 编辑覆盖、返工 | 0.2 节同文件互斥规则 + 各任务依赖字段强制串行链；并行窗口 W1~W4 已按文件划分 |
| R6 | **innerHTML XSS**：data.js 被注入恶意脚本字段 | 安全漏洞、FR-07 安全属性失效 | escapeHtml 强制用于全部数据注入点（T-17）；恶意注入用例（T-29/T-30）；siteCardHTML 安全属性断言 |
| R7 | **暗色模式 FOUC**：内联引导脚本缺失/位置错误导致首帧白闪 | 体验瑕疵、FR-03 验收观感受损 | T-04 明确内联脚本不可 defer、须首帧前执行；T-19 initTheme 与内联脚本幂等；T-35 验证含刷新不闪 |
| R8 | **动效隐藏内容**：[data-reveal] 初始 opacity:0 若由 CSS 默认承担，JS 失败时内容永久隐藏 | NFR-07 违背（禁 JS 内容不可见） | T-14 明确渐进增强策略（初始态由 JS 标注 .js 类或等价方案启用）；T-14/T-35 双重"禁 JS 内容可见"验证 |
| R9 | **体积预算超标**：静态基线 + JSON-LD + SVG 使 index.html 超 50KB | NFR-08 预算超标 | 各文件任务内嵌分项预算验收；T-36 专项审计四分项+合计；超标回流瘦身 |
| R10 | **og-image 导出工具缺失**：本机无图像编辑器 | T-26 阻塞 | 允许简化占位版先行（渐变+系统字体），T-37 前替换终版（T-26 风险提示） |
| R11 | **线上与本地差异**：GitHub Pages 的 MIME/路径大小写/缓存 | NFR-15 线上回归失败 | T-37 线上全量回归清单；git revert 回滚预案（design 1.3.7） |
| R12 | **404.html 超范围**：design 未含此文件，实现蔓延 | 范围失控 | T-27 限定极简实现（品牌+文案+链接），一次成型不迭代 |

---

## 13. 完成定义（DoD）

全部 37 个任务完成且满足以下条件时，Phase C 任务拆解对应的交付闭环达成：

1. 37 个 checkbox 全部勾选，每个任务的验收标准逐条通过；
2. 38 项验收标准（spec 第 7 章）在 T-33（测试）、T-35（本地）、T-37（线上）三层验证中全部通过并留档；
3. 线上 https://huiyuan6.github.io/ 功能完整，6 友链逐字符准确；
4. SDD 六阶段产出物（spec.md / design.md / tasks.md / 代码 / 测试报告 / 验证记录）齐备归档（NFR-16）。

---

*文档结束。本文档为 Phase C 任务拆解基线；执行顺序建议：先走关键路径（T-01 → T-03 → B 组 → T-22），用并行窗口 W1~W4 消化独立任务，最后经 T-33 → T-35 → T-37 三道质量门禁交付。*
