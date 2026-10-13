---
name: vue-crud-list-page
description: 在 Vue 3 + TypeScript 项目中实现或复用配置驱动的列表管理页，组合搜索、数据表格和动态表单弹窗，并适配项目接口与 UI 库。适用于配置 CRUD 页面、扩展表单控件和操作列；不用于非 Vue 项目或无列表管理需求的普通展示页面。
---

# Vue 配置驱动列表管理页

以配置描述搜索字段、表单字段和表格列，用页面容器协调查询、分页、增改弹窗和删除确认。业务请求与数据转换由调用页面提供，避免写入通用控件。

本技能将通用页面组件称为 `CrudListPage`。附件是 AirWater-UI 中名为 `DPage` 的实现快照；`DPage` 只是来源项目的组件名。快照可脱离原仓库作为迁移参考，不是已解决所有边界问题的独立组件库。

## 资源选择

- 理解职责、实际接口和已知限制：读 [references/implementation.md](references/implementation.md)。
- 为业务页面配置 CrudListPage 或适配不同后端：读 [references/integration.md](references/integration.md)。
- 目标项目没有 CrudListPage，且确认采用该实现：参考或复制 `assets/CrudListPage/` 的六个源码文件。表格默认使用 UI 库内置空状态；有明确品牌设计需求时，再接入目标项目自己的图片。
- 目标项目已有同名组件：先读其源码与调用页面，按现有契约接入，不直接覆盖或假设与快照相同。

## 接入决策

先检查目标项目的 Vue、TypeScript、UI 库、自动导入、路径别名、API 封装、页面高度约束和消息提示方式。保留目标项目已有约定。

快照使用 `antdv-next`、`@antdv-next/icons` 和 SCSS，不直接依赖 Axios、Pinia、Vue Router 或 Day.js。无需为了 CrudListPage 安装原项目其他依赖。使用其他 UI 库时，保留职责与数据契约，按目标库改写控件、插槽、表单校验和样式，不只替换 import 包名。查询库 API 时以目标项目安装版本对应的官方文档为准。

迁移源码时处理这些实际依赖：

1. Vue 的运行时函数在快照中依赖自动导入。目标项目覆盖这些函数时沿用；否则补足每个文件所用的 Vue import。UI 组件也需要目标项目的解析器或显式注册/import。
2. `App.useApp()` 需要上层 Antdv Next App 上下文；沿用现有 ConfigProvider、语言和主题配置，或适配目标项目消息与确认服务。
3. 样式包含 `workspace-*` 类、`--ant-*` CSS 变量和 UI 库内部 DOM 选择器。检查目标环境中的实际样式与 DOM，不复制原项目全局样式、主题或布局来掩盖依赖。
4. 容器采用限定高度的 flex 布局。祖先需要可用高度，伸缩链保留 `min-height: 0` / `min-width: 0`，分页保持在滚动区域外。

## 保留的组件职责

| 文件 | 职责 |
| --- | --- |
| `index.vue` | 数据请求、搜索参数、分页、弹窗状态、增改删流程、插槽透传、ref 方法 |
| `SearchBar.vue` | 搜索输入、默认值、折叠与响应式栅格、搜索和重置事件 |
| `DataTable.vue` | 配置到 UI 库列的映射、单元格与操作列、外置分页、溢出检测 |
| `form/FormDialog.vue` | 新增/编辑数据初始化、校验、可见性、禁用状态、表单提交 |
| `form/FormItem.vue` | 配置类型到输入控件的映射、统一值更新、自定义组件协议 |
| `types.ts` | 搜索、表单、列、操作按钮和自定义组件的配置类型 |

业务页面只提供字段配置、API 或适配函数、业务操作与插槽。优先使用 `props`、列插槽和 `type: 'custom'` 扩展；只有多个页面需要的能力才考虑加入通用配置。

## 请求与交互契约

- 分页查询消费 `{ data: { records, total } }`，参数为 `{ ...searchParams, pageNum, pageSize }`；不分页消费 `{ data: rows }`。其他结构通过 API 适配层或 `fetchData` 转换。
- 默认增改方法是 `api.create(data)` / `api.update(data.id, data)`；详情是 `api.detail(row[idField])`；删除是 `api.delete(handleDelete 的实参)`。主键或删除签名不同，使用自定义方法适配。
- `columns` 中显式配置操作列及回调。CrudListPage 不自动添加编辑、删除按钮。
- 源码快照实际向外触发 `search`、`page-change`；虽声明 `submit`、`delete`，实现没有触发。用 `addMethod` / `editMethod` / `deleteMethod` 承接业务请求，不用这两个未实现事件驱动保存或删除。
- 当前 `formLoading` 由父页面传入，内部 CRUD loading 没有连接提交按钮。需要防重复提交时，在自定义保存方法中维护该 prop，或在用户授权修改组件时新增独立保存状态。
- `setSearchParams` 合并参数、异步刷新，不重置页码，也不回填搜索控件。需要替换条件、重置分页或同步控件时，显式实现该语义。

详细边界见实现说明，不把源码的缺陷作为新项目必须保留的设计。兼容迁移与修复应分清；已有项目只做本次任务需要的改动。

## 字段和列扩展

- 搜索与表单共用 FormItem，内建组件使用底层 UI 库的值绑定，向上统一发送 `update:modelValue`。
- 自定义字段接受 `modelValue`、`disabled`，发送 `update:modelValue`；需要同级字段时配置 `passFormData: true`。组件对象遵循目标项目处理响应式组件对象的惯例，必要时使用 `markRaw`。
- 表单支持点路径读写、`visible(data, { isEdit })`、`disabled`、`disableOnEdit`、`required` 和自定义 `rules`。条件隐藏字段的值与校验、嵌套路径的 UI 库绑定都应按目标需求确认。
- 自定义单元格优先使用具名插槽 `{ row }`；纯文本用 `formatter`，轻量渲染可用 `render`，渲染函数保持无副作用。
- 选择列目前只启用 UI 库选择框，没有向父页面暴露选择结果；排序目前只声明 `sorter: true`，没有排序参数流程；`expand` 配置不会生成展开内容。需要批量操作、远程排序或详情展开时补齐明确契约。

## 文案与交付

可见文字使用实际业务对象和操作，如“新增用户”“保存”“删除”。不要把 eyebrow、kicker、placeholder 等实现术语渲染给用户，也不要添加无业务意义的抽象标题或重复描述。内部类名、API 字段和合法业务术语不因此重命名。

按目标项目约定和改动规模验证。只生成或修改技能文档时校验技能结构、引用和 diff，不运行应用构建或浏览器；实际迁移组件或修改交互时执行相应类型/构建检查，并在现有页面确认查询、分页和本次涉及的表单交互。

交付说明文件位置、接入方式、已执行的校验，以及未确认的接口或文案。不要声称尚未执行的运行时验证已通过。
