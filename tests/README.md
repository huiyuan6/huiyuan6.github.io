# tests/ — 会员权益官网单元测试

纯静态站零构建，测试同样**零依赖、零构建**，双路径可运行（design.md 1.3.6 测试策略）。

## 运行方式

### 主路径：浏览器（推荐）

直接双击打开 `tests/test.html`（file:// 协议即可），页面即测试报告：

- 绿色 ✓ 逐条通过；红色 ✗ 展开失败原因（期望 vs 实际）
- 顶部汇总条与页面标题实时反映 通过/总数

### 辅路径：Node（CI 友好）

```bash
node tests/run-node.js
```

- 全部通过：打印分组统计与汇总，退出码 `0`
- 存在失败：额外打印失败明细，退出码 `1`（可直接接入 CI 判定）

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `assertions.js` | 轻量断言库 TestKit：`test/group` 记账 + `eq/deepEq/ok/contains/notContains/throws` 断言；reporter 可注入（浏览器渲染 DOM / Node 打印 console）；UMD 双路径（`window.TestKit` / `module.exports`） |
| `run-tests.js` | 用例主体：`runSuite(ctx)` 接收注入的 TestKit 与各模块引用，浏览器与 Node 共用同一份用例，零重复 |
| `run-node.js` | Node 入口：按 index.html 同序 require data.js + 8 模块 → 注入 runSuite → 分组统计 + 汇总 + 退出码 0/1 |
| `test.html` | 浏览器运行器：按 index.html 同序 `<script src>` 相对路径加载被测脚本 + 用例，渲染红绿面板 |

## 用例分组

| 分组 | 内容 |
| --- | --- |
| a | data.js 基线契约：6 站 name/url/desc 逐字符锁定（FR-12，URL 不得强转协议/增删尾斜杠） |
| b | validate：URL 合法性（http/https 绝对地址）/ sanitizeEntry 净化 / validateEntries 好坏分离 / XSS 职责分离（校验层不转义） |
| c | merge：normalizeUrl 归一化（尾斜杠、主机大小写、协议保留）/ mergeLinkLists 并集合并、基线永不删除、浅拷贝不污染 |
| d | render：卡片 class 契约（partner-card__* 四子元素）/ `rel="noopener noreferrer"` / escapeHtml 消毒 / renderSiteCards、syncFooterLinks、updateStat、countElements、setFooterYear |
| e | theme 三态解析与持久化守卫（localStorage 异常安全）/ main.readSiteData 读取守卫 |
| f | 8 模块加载契约（导出函数、HY 扁平命名空间注册）/ 无 DOM 守卫（Node 下不崩溃）/ accordion 互斥单开与幂等绑定 / reveal 双降级路径 |

## 覆盖映射

- **纯函数模块**（validate / merge / render 纯函数部分）：全部导出函数逐一覆盖（含别名导出）
- **含 DOM 模块**（theme / accordion / reveal / nav / main）：导出函数 + 无 DOM 守卫 + mock DOM 行为（recorder / fakeClassList）
- **data.js**：结构契约 + 6 站逐字符基线 + 与 validateEntries 的闭环校验

## 约定

- 测试**只读**被测源码，发现缺陷以失败用例形式暴露并上报，不擅自修改被测源码
- 涉及宿主全局能力的用例（IntersectionObserver / matchMedia / requestAnimationFrame）通过临时替换 + finally 还原的方式确定性验证，两路径行为一致
