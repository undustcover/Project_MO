## 目标与范围

* 更新前端为方案A（Vue 3 + Vite + Element Plus + ECharts），统一页面结构与图表库

* 保留并完善后端、数据库、数据导入/聚合与预警机制，形成可用的全栈MVP

* 支持按项目→任务两级查看进度/成本/收入仪表盘与预警看板（对标 `PRD.md:7-16`）

## 前端（方案A）

* 技术栈：Vue 3 + Vite + Element Plus + ECharts

* 布局：左侧树状菜单（项目/任务）+ 顶部信息卡片 + 内容区图表

* 组件映射：

  * 信息卡片：`ProjectInfoCard`、`TimelineCard`、`ParticipantsCard`、`SubcontractorsCard`（参考 `web_design\p3\新建文件夹\index.html:24-156`）

  * 图表：`RadarChart`（六维）、`BarChart`（任务对比）、`PieChart`（各类时效/成本/收入分布）

* 页面：

  * 进度仪表盘（雷达 + 评分 + 任务对比 + 饼/柱统计，参考 `仪表盘需求.md:32-67` 与计算逻辑 `web_design\p3\新建文件夹\script.js:1772-2043`）

  * 成本仪表盘（预算输入 + 成本六维 + 概览图，参考 `web_design\p4\p4\p4\index.html:321-521` 与规则 `cost_design\成本六维统计.md:9-76,169-171`）

  * 收入仪表盘（指标卡 + 饼图 + 甘特近似 + 健康/韧性雷达，参考 `web_design\P5\p5\index.html:187-277` 与规则 `revenue_design\项目评价.md:37-45,146-178`）

 * 预警看板（项目/类型/严重程度/状态筛选，参考 `预警机制设计.md:124-149`）

## 项目立项模块（页面与入库）
- 页面路径：`/projects/new` 与 `/projects`（列表/查询）
- 表单字段（对照 `PRD.md:21-47`）：
  - 基本信息：合同编号、合同周期（YYYY:MM:DD-YYYY:MM:DD）、工作量、合同金额（及币种）
  - 时间节点：开工日期、合同验收合格日期、尾款到账日期、保函释放日期、总结复盘日期
  - 参与单位：运营主体、项目长、以及可扩展的 `<文本：文本>` 多组键值
  - 分包单位：可扩展的 `<文本：文本>` 多组键值
- 前端实现：Element Plus 表单与动态行（键/值）可增删，必填与格式校验
- 后端入库：一次性提交项目主体 + 关联的参与单位与分包单位集合（事务）

## 后端

* 技术栈： NestJS

* 职责：数据入库与清洗、聚合计算（统一口径）、预警扫描与记录、API 提供

* 结构：

  * `server/app.ts`（入口与路由聚合）

  * `server/modules/*`（progress/cost/revenue/alerts 分模块服务）

  * `server/jobs/*`（定时扫描与数据更新触发器）

## 数据库（MVP PostgreSQL）

* 表与核心字段：

  * `projects`：`id`、合同编号、合同周期（起止）、工作量、合同金额、时间节点（开工/验收/尾款/保函/复盘）、参与/分包单位

  * `progress_events`：`id`、项目/井号、工况名称、一级/二级/三级时效、开始/结束时间、负责人、日期、时长（服务端计算）

  * `cost_items`：项目/任务、要素1-3级、单位/单价/数量/总成本、可选收入；`cost_budgets`：任务人员/材料/设备/服务预算、任务总预算

  * `revenue_records`：项目/年度/任务、WBS、计划/实际开始/完成、实际工作量与单位、综合单价/附加费用、合计价值工作量、任务成本、收入计划、确认/收现时间与金额

  * `project_participants`：`id`、`project_id`、`key`、`value`

  * `project_subcontractors`：`id`、`project_id`、`key`、`value`

  * `alert_configs`（对标 `预警机制设计.md:71-86`）：项目id（可空=全局）、类型（进度/成本/收入）、项名、阈值类型与值、严重程度、是否启用

  * `alert_records`（对标 `预警机制设计.md:106-122`）：项目id、类型/项、严重程度、消息、相关数据JSON、状态（active/resolved/ignored）、时间戳、处理人/备注

  * `users`（MVP轻量）：角色/权限（用于预警配置权限）

## API 设计

* 项目立项：`POST /api/projects`、`GET /api/projects`、`GET /api/projects/:id`

* 数据导入：`POST /api/import/progress|cost|revenue`（JSON 批量；后续支持 `multipart` 并在后端解析 xlsx/csv）

* 仪表盘：

  * 进度：`GET /api/dashboard/progress?projectId&taskId`（返回六维评分与原始度量、任务对比、统计分布）

  * 成本：`GET /api/dashboard/cost?projectId&taskId`（返回六维评分与预算对比、结构分布）

  * 收入：`GET /api/dashboard/revenue?projectId&taskId`（返回指标卡、健康/韧性雷达、分布与对比）

* 预警：

  * 配置：`GET /api/alerts/configs?projectId`、`POST /api/alerts/configs`

  * 记录：`GET /api/alerts/records?projectId&type&severity&status`、`POST /api/alerts/records/:id/resolve|ignore`

## 指标聚合（服务端统一计算）

* 进度（参考 `progress_design\进度数据可视化.md:22-90`）：

  * 生产时间达成率、非生产时效溢价率（A占比×0.35 + B合同符合率×0.65）、中完时间达成率、纯钻时效、起下钻时效、合同时间利用率（A×0.125 + B×0.625 + C×0.25）；评分分档与综合得分=六维均值

* 成本（参考 `cost_design\成本六维统计.md:9-76`）：

  * 材料/人工/设备/服务成本控制率、任务总成本控制率、间接成本占比；评分分档、综合得分+评价等级与说明

* 收入（参考 `revenue_design\项目评价.md:37-45,146-178`）：

  * SVI/CPI/RHI/DCFI/VEI/PCS 六指标与综合分数、健康等级；韧性（运气）指标按文档规则计算

## 数据导入与清洗

* 前端解析（MVP）：沿用 SheetJS 在前端解析 → 统一 JSON → 调后端入库（参考 `web_design\p3\新建文件夹\script.js:496-777`）

* 后端解析（后续）：`multipart` 上传 xlsx/csv，使用 `xlsx` 或 `csv-parser` 清洗与校验，写库前做字段映射与类型转换

* 统一字段映射：严格对标 `数据字段说明.md:5-86,87-111`

## 预警机制

* 配置与继承：全局默认 → 项目级覆盖（参考 `预警机制设计.md:64-68`）

* 触发：

  * 定时扫描（每4小时，`server/jobs/scanAlerts.ts`）

  * 数据更新触发（导入后、关键指标更新后立即检查）

  * 手动触发（API）

* 展示：预警看板（筛选：项目/类型/严重程度/状态）、卡片详情与处理操作（resolve/ignore）

## 权限与安全（MVP）

* 基础角色：项目部管理层可配置预警；普通用户仅查看

* 审计：记录预警配置变更与处理操作日志

## 目录结构

* `apps/server`（NestJS + TypeORM + PostgreSQL）：modules/entities/migrations/jobs

* `apps/web`（Vue + Vite + Element Plus + ECharts）：pages/components/services/styles

## 里程碑

1. 项目立项页与入库：前端表单与列表；后端 `ProjectsModule` + DTO 校验 + 事务入库；`GET/POST /api/projects` 完成
2. 进度页 MVP：六维评分与雷达、任务对比、统计饼/柱；后端进度聚合 API
3. 成本页 MVP：预算输入、成本六维雷达与评分；后端成本聚合 API
4. 收入页 MVP：指标卡、饼图、甘特近似、健康/韧性雷达；后端收入聚合 API
5. 预警系统：阈值配置、定时扫描、看板与记录表；前端预警模块
6. 收尾：统一风格与导航、性能优化与数据一致性核验

## 验证与交付

* 前端：本地预览各页与指标，校验评分分档与文档一致

* 后端：用样例数据跑通导入、聚合与预警生成；接口对齐前端

* 交付：本地可运行的服务与前端入口、示例数据与操作说明

## 后续扩展

* 切换 PostgreSQL 与 Docker 化部署、后端文件上传与解析、认证授权完善、规则引擎化预警、报表导出与通知、移动端适配
