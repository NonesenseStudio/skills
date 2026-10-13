# 实现分析与实际契约

分析来源：AirWater-UI 的 `src/components/DPage/`、Vite 自动导入配置、应用 App 上下文、请求封装以及用户、角色、船只列表调用页面。原组件名为 `DPage`；本技能统一将这种通用组件称为 `CrudListPage`。源码快照生成于 2026-10-13；以下行为针对该快照，目标项目中的版本可能不同。

## 一、设计方式

`CrudListPage` 是带请求流程的页面容器，不是单纯受控的表格。搜索和表单通过配置数组驱动，共用字段渲染器；表格配置转换为 Antdv Next `columns`，再通过 `bodyCell` 分支渲染。配置对象里的回调承担业务扩展，slot 承担复杂 UI 扩展。

```text
业务页面：API/适配方法 + searchItems + formItems + columns + slots
  └─ CrudListPage：查询、分页、CRUD 与弹窗状态
       ├─ 可选 aside / header / toolbar 插槽
       ├─ SearchBar → FormItem
       ├─ DataTable → columns + bodyCell + 独立 Pagination
       └─ FormDialog → FormItem
```

内部状态为 `tableData`、`pager`、`searchParams`、表格 `loading`、`dialogVisible`、`editingRow`、`addInitialValues`。初始分页为第 1 页、每页 20 条。挂载时自动查询；没有自动监听 `api`、`fetchData`、`pagination` 的变化以重新查询。

## 二、CrudListPage props

| 配置 | 实际含义/默认值 |
| --- | --- |
| `columns` | 必填，原样交给 DataTable，不注入操作列 |
| `api` | 类型声明必填 `any`；仅对实际使用的操作提供方法即可 |
| `searchItems` | 默认 `[]`；非空才显示搜索区域 |
| `formItems` | 默认 `[]`；非空才挂载 FormDialog，并允许显示新增按钮 |
| `addTitle` / `editTitle` | 默认“新增”/“编辑”，只影响弹窗标题 |
| `formDialogWidth` | 显式宽度；省略时由 FormDialog 计算 |
| `formLoading` | 默认 false，只控制表单提交按钮 loading |
| `pagination` | 默认 true；决定 page/list 请求与响应结构 |
| `defaultExpandAll` | 默认 false，控制树形行展开 |
| `fetchData` | 替换表格查询方法，不替换响应解包流程 |
| `addMethod(data)` / `editMethod(data)` | 替换新增、编辑请求 |
| `deleteMethod(value)` | 替换删除请求；value 就是传给 handleDelete 的实参 |
| `detailMethod(id, row)` | 替换详情请求，可使用完整原始行 |
| `showAdd` / `showRefresh` | 默认 true；新增仍需非空 formItems |
| `hasSider` / `siderWidth` | 默认 false / 240，显示 aside 区域 |
| `idField` | 默认 `id`，仅用于详情查询取主键 |

`withDefaults` 中出现的 `loading`、`total`、`pageSize` 没有对应的组件 prop 声明和受控数据流，不把它们当作有效外部 API。DataTable 自己有这些 props，但页面组件用内部状态传入。

## 三、查询、分页和搜索

| 入口 | 行为 |
| --- | --- |
| 挂载、`refresh()`、工具栏刷新 | 查询当前参数和当前页 |
| SearchBar 搜索 | 替换 searchParams；调用 DataTable.resetPage，发出 page-change，再查询；同时向父页面 emit search |
| SearchBar 重置 | 控件恢复 defaultValue，但向页面组件发出 `{}`，查询不带这些默认值 |
| 改变页大小 | 页码重置为 1，保存大小后查询 |
| 删除成功 | resetPage，回第 1 页查询 |
| 增改成功 | 关闭弹窗，重新查询当前页 |
| `setSearchParams(params)` | 浅合并条件，nextTick 查询当前页；不发出 search，不同步 SearchBar |

分页响应必须为 `{ data: { total: number, records: any[] } }`，不分页响应为 `{ data: any[] }`。默认分别调用 `api.page(params)` / `api.list(params)`；自定义 fetchData 仍需返回同样结构。

原项目 Axios 响应拦截器返回业务响应体，组件的 `res.data` 因而就是业务数据。直接接入未解包的 AxiosResponse 可能会多一层 `data`，需要在边界适配，不能只看请求库的 TypeScript 类型推断结构。

SearchBar：

- 支持 input、select、date、daterange、number、custom；field 是扁平 key，不做点路径读写。
- items 引用变化时重建输入数据；初始化 defaultValue 不会发出 search，因此初次自动查询不会应用搜索默认值。
- 搜索只过滤 `undefined`、`null`、空字符串，保留 0、false、空数组。
- 折叠只隐藏控件，隐藏字段仍参与搜索。默认折叠 `collapsible: true` 的字段。
- 24 栅格：xs 一列、sm 两列、md 三列、lg/xl 四列。按钮占最后一行剩余空间，满行则另起一行。

查询异常清空数据和 total；自定义 fetchData 分支还把内部分页重置为 1/20，默认 API 分支不重置。组件依赖调用方或全局拦截器提示错误，且没有处理并发查询的过期响应。迁移时如需快速连续筛选，应根据任务补充请求序号或取消机制。

## 四、新增、编辑、删除

`openAddDialog(initialValues = {})` 清空 editingRow、浅复制初始值并打开弹窗。初始值以配置 `item.field` 的精确 key 匹配并覆盖 defaultValue；点路径字段如 `user.name` 需要传 `{ 'user.name': '张三' }`，不会读取嵌套 initialValues 的 `user.name`。

新增按钮在快照中使用 `@click="openAddDialog"`，可能把点击事件当作 initialValues 传入。迁移时可改为无参数调用，避免依赖事件对象的可枚举属性；这不是业务预填协议。

`openEditDialog(row)` 获取 `row[idField]`，调用详情方法，以 `res?.data ?? res` 为编辑数据。请求失败时使用行数据继续打开弹窗，不阻断编辑；部分行数据是否足够编辑要按业务确认。

保存由 FormDialog 先校验并 emit submit 给页面组件，组件内部直接请求：新增默认 `api.create(data)`，编辑默认 `api.update(data.id, data)`。成功提示、关闭弹窗、刷新；失败保留弹窗。`idField` 不改变 update 的主键取值。

`handleDelete(value)` 打开确认框，确认后调用 `deleteMethod(value)` 或 `api.delete(value)`，提示并重置分页。它既可以接收行，也可以接收 ID，取决于实际 API 的签名。原项目用户和角色页传入字符串 ID；不要把默认行为误写成自动提取 `row.id`。

## 五、公开事件、方法和插槽

| 分类 | 当前实际能力 |
| --- | --- |
| 对外事件 | `search(params)`、`page-change(page, pageSize)`；两个事件通知时组件自身已负责查询 |
| 仅声明的事件 | `submit(data, isEdit, originalRow)`、`delete(row)`；无 emit 调用 |
| ref 方法 | `closeDialog()`、`openAddDialog(initialValues?)`、异步 `openEditDialog(row)`、`refresh()`、`handleDelete(value)`、`setSearchParams(params)` |
| 页面插槽 | `aside`（需 hasSider）、`header`、`toolbar-left`、`toolbar-right` |
| 列插槽 | 配置 `column.slot` 后，页面组件动态透传同名插槽，参数 `{ row }` |
| 操作插槽 | `action`，仅在实际配置的 action 列内出现，参数 `{ row }` |

避免在 search/page-change 监听器中再次请求同一份表格数据。需要改变请求参数，用 API/fetchData 适配层，不能将通知事件当作可等待的请求拦截器。

## 六、表单初始化与控件协议

FormDialog 以 data 是否非空判断编辑模式。数组和对象递归复制；它面向普通 JSON 数据，不保留 Date、Map、类实例的原型。编辑模式复制全部详情数据，保留未配置字段；配置字段已有值优先，只有 `undefined` 才尝试 defaultValue，显式 null 不被覆盖。

字段通过 `getValueByPath` / `setValueByPath` 支持点路径嵌套对象。这里不是数组路径解析器。表单规则却用 `rules[item.field]`、表单项使用字符串 `name=item.field`；嵌套字段的值绑定和校验路径不保证一致，移植到目标库时需要验证或改为其支持的 NamePath。

打开弹窗时重建数据并清理校验；编辑 data 深层变化时也重建。items 变化不直接重建表单数据。可见字段变化后清理校验，但规则构建遍历全部配置；不要假定隐藏必填项一定跳过校验。

自定义非空 rules 优先于 required；自动必填提示为“字段标签不能为空”，input/textarea 用 blur，其他类型用 change。省略 type 虽渲染 input，其自动规则仍会走 change 分支。

提交先 validate，再浅复制 formData，对当前隐藏字段写入 undefined，然后 emit。普通 JSON 序列化会省略 undefined，不能把它当成向后端清空字段的 null。因为提交只做浅复制，清除嵌套隐藏字段可能影响当前表单的同一嵌套对象。

`disabled` 或编辑时的 `disableOnEdit` 禁用控件。`passFormData` 只给自定义组件传当前表单数据，透传 props 中的同名值可以覆盖它。

| 控件类型 | 向外的值 |
| --- | --- |
| input / textarea / number / select / radio | 底层控件 value |
| tree-select | value；clear 显式发 null |
| date / daterange | 默认 value-format 为 YYYY-MM-DD，可由 props 覆盖 |
| switch | checked，默认 boolean；其他业务编码需适配 |
| upload | 主要输出 URL 或 undefined；不等同于多文件列表模型 |
| custom | modelValue / update:modelValue；额外接收 disabled 与 props |

上传显示层把 URL 变成已完成 UploadFile 数组；上传完成从 `response.data[urlField]`、`response.data`、`file.url` 依次取值，urlField 默认 `url`。多文件、复杂响应和非 URL data 都需要定制转换，不假定任意上传服务可直接使用。

默认可见项不超过 9 个时 span=24、弹窗宽 640；10–18 项 span=12、宽 800；更多项宽 920。显式 span/width 优先。类型注释中的“默认 12”与实现不同。`layout: section/wide` 改变标签和控件的布局样式，不会自动给字段 span=24；需要整行时显式配置 span。

## 七、表格实现

- `tableColumns` 映射 prop→dataIndex、label→title，并保留原配置为 `__config`，供 bodyCell 读取。
- 渲染优先级：index → action → slot → render → formatter → 原始 text。
- 序号是当前页 index+1，不是跨分页累计序号。
- `showOverflowTooltip` 实际映射为 ellipsis，默认 true；没有独立的自定义 Tooltip 分支。
- `sortable` 设置 sorter=true，没有监听排序变化或传后端排序参数，不能当作已实现排序。
- selection/expand 配置从普通列中过滤；selection 只生成空 rowSelection 配置，无选择结果事件；expand 没有 expandedRowRender 内容。
- row-key 固定 `id`，树展开键也取 id；数据中的 children 作为树节点。自定义 idField 不影响这些位置。
- defaultExpandAll 为 true 时根据数据递归构建受控 expandedRowKeys；数据或该开关变化会重置展开状态。
- actions 和 dropdownActions 根据 show 布尔值/函数逐行过滤，点击只调用 onClick(row)。show 只是 UI 显示控制，不能替代后端权限校验。
- `alwaysShowDropdown` 在无可用项时保留禁用入口；更多按钮文本可配。
- render 在模板中可能对同一行调用多次，保持无副作用；复杂 VNode/组件结果优先改用 slot 并按实际 UI 库验证。

溢出检测通过容器高度减去分页高度，与表格内容高度比较，只有溢出才设置 scroll.y=100%。监听数据、loading、列和 ResizeObserver，nextTick 合并检测，卸载时断开 observer。横向 scroll.x=max-content。分页独立于 a-table，保持在容器底部。

AirWater-UI 原版 DataTable 使用了项目自有的 `data-empty.svg` 和显式“暂无数据”文案。本技能随附的通用源码已移除这项品牌资源，直接渲染 UI 库内置 Empty 组件，让图示和描述跟随目标项目的 UI 库与 locale。只有业务明确要求品牌化空状态时，才接入目标项目提供的资源。

## 八、迁移时的布局与样式边界

CrudListPage→主内容→表格卡片→卡片 body→DataTable→表格内部容器采用 flex 伸缩链。`overflow: hidden` 与 `min-height: 0` 配合，避免内容把祖先撑高。没有祖先可用高度时，height:100% 和内部滚动不能单独解决布局。

FormDialog 使用非 scoped 样式覆盖 portal 内 `.form-dialog .ant-modal` 与 `.ant-modal-container`；header/footer 固定，body 限高滚动，窄屏改为一列。这些类名是当前 UI 库实现细节，换库或升级需要重新核对。

`workspace-*` 是内部样式挂钩，不是 UI 文案；没有理由将其显示给用户，也不需要因为单词本身而机械改名。保留目标项目现有设计系统，不附带迁移 AirWater 的路由、鉴权、全局主题或业务 API。
