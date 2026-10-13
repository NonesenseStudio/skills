# 接入示例与适配方法

以下示例假定目标项目已经接入 `CrudListPage`，配置好 UI 组件注册与 App 上下文。组件位置和 `@/api/users` 业务 API 模块由目标项目决定；示例不是额外约定的后端路由。

## 标准分页增删改查

示例使用显式 Vue 和 `CrudListPage` import，便于没有自动导入的项目理解。目标项目已自动导入的项无需重复添加。

```vue
<script setup lang="ts">
import { ref } from 'vue';
import CrudListPage from '@/components/CrudListPage/index.vue';
import type {
  ColumnConfig,
  FormItemConfig,
  SearchItemConfig,
} from '@/components/CrudListPage/types';
import { userApi } from '@/api/users';

const page = ref<InstanceType<typeof CrudListPage>>();
const saving = ref(false);

const searchItems: SearchItemConfig[] = [
  { field: 'name', label: '姓名' },
  {
    field: 'enabled', label: '状态', type: 'select',
    options: [
      { label: '启用', value: true },
      { label: '停用', value: false },
    ],
  },
];

const formItems: FormItemConfig[] = [
  { field: 'name', label: '姓名', required: true },
  { field: 'enabled', label: '启用', type: 'switch', defaultValue: true },
];

const columns: ColumnConfig[] = [
  { type: 'index', label: '序号', width: 64 },
  { prop: 'name', label: '姓名', minWidth: 180 },
  {
    prop: 'enabled', label: '状态', width: 100,
    formatter: (_row, _column, value) => value ? '启用' : '停用',
  },
  {
    type: 'action', label: '操作', width: 160, fixed: 'right',
    actions: [
      { label: '编辑', onClick: row => { page.value?.openEditDialog(row); } },
      { label: '删除', type: 'danger', onClick: row => page.value?.handleDelete(row) },
    ],
  },
];

// 删除入口传完整行，由此处适配为业务 API 的 ID 参数。
const removeUser = (row: Record<string, any>) => userApi.delete(row.id);

const createUser = async (data: Record<string, any>) => {
  saving.value = true;
  try {
    return await userApi.create(data);
  } finally {
    saving.value = false;
  }
};

const updateUser = async (data: Record<string, any>) => {
  saving.value = true;
  try {
    return await userApi.update(data.id, data);
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <CrudListPage
    ref="page"
    :api="userApi"
    :search-items="searchItems"
    :form-items="formItems"
    :columns="columns"
    :add-method="createUser"
    :edit-method="updateUser"
    :delete-method="removeUser"
    :form-loading="saving"
    add-title="新增用户"
    edit-title="编辑用户"
  />
</template>
```

此例要求 userApi.page 返回 `{ data: { records, total } }`，userApi.detail 返回 `{ data: 用户详情 }`。保存方法把表单提交按钮连接到 saving；不监听源码快照中未实现的 submit/delete 事件，不在事件监听器里再次保存或刷新。

## 不同响应与参数结构

若现有 API 返回已解包的 `{ items, count }`，并使用 page/limit，可在 fetchData 中转换：

```ts
const fetchUsers = async (params: Record<string, any>) => {
  const { pageNum, pageSize, ...filters } = params;
  const result = await userApi.query({
    ...filters,
    page: pageNum,
    limit: pageSize,
  });
  return { data: { records: result.items, total: result.count } };
};
```

给 `CrudListPage` 传 `:fetch-data="fetchUsers"`；API 对象仍按组件类型声明提供。只有查询需求时可省略 formItems 和操作列，不实现未使用的 CRUD 方法。

不分页时配置 `:pagination="false"`，fetchData/api.list 返回 `{ data: rows }`。不分页不代表自动执行客户端过滤；需要过滤时由适配函数实现。

若 API 直接使用 fetch，必须检查 response.ok 并 reject 失败；若使用 Axios，先确认业务响应有没有被拦截器解包。组件将 Promise resolve 当作操作成功，不自行检查业务 code。

日期范围等复合筛选也在此边界转换，例如将 `dateRange: [start, end]` 拆为真实 API 的起止参数。使用接口实际字段名，不擅自引入统一但不存在的参数。

## 自定义主键

后端主键若为 userId，且目标项目希望保留组件的 id 行键，可把列表行映射为 `{ ...row, id: row.userId }`。同时：

- 给组件传 `id-field="userId"`，详情方法会接收到 userId；需要转换响应时配置 detailMethod。
- 给 editMethod 传 `data.userId` 作为更新主键，因为默认更新仍读 data.id。
- 删除回调传 row，并在 deleteMethod 中读 row.userId。
- 如果后端拒收额外 id 字段，在保存适配层中移除它。

也可以在获得修改组件的任务后引入独立 rowKey，并贯穿表格、树展开、详情、更新和删除。不要只修改 idField 就声称完成了主键统一。

## 单元格与字段扩展

复杂单元格通过 `slot: 'status'` 配置，并提供 `#status="{ row }"`。action 插槽需要同时存在 `type: 'action'` 的列，不能只声明插槽。

自定义字段示例使用目标项目已有组件：

```ts
import { markRaw } from 'vue';
import UserPicker from '@/components/UserPicker.vue';

const ownerField: FormItemConfig = {
  field: 'ownerId',
  label: '负责人',
  type: 'custom',
  component: markRaw(UserPicker),
  passFormData: true,
  props: { allowClear: true },
};
```

UserPicker 接收 modelValue、disabled、可选 formData，发送 update:modelValue。透传 props 应与其真实公开接口一致。跨字段关系优先在该组件或页面配置中处理，不把业务请求写入 FormItem。

条件字段可用 `visible: (_data, { isEdit }) => !isEdit`，如仅新增填写密码。隐藏字段默认变为 undefined；编辑不修改密码、明确清空字段、保留原值是不同业务语义，要在 editMethod 中按接口要求处理。不要依赖通用组件猜测。

## 源码快照的使用

将本技能整个目录复制到目标环境的技能目录即可携带引用和源码。Codex 全局技能常用 `~/.codex/skills/vue-crud-list-page/`；仓库级可放在其支持的 `.agents/skills/vue-crud-list-page/`。使用 `$vue-crud-list-page` 请求接入或配置业务页面。

源码快照位于技能目录的 `assets/CrudListPage/`，不是自动安装到应用的组件。迁移时复制到目标项目选定的组件目录，再处理导入、UI 上下文、图片路径、主题和接口适配。文件夹和组件注释已按通用名整理；`references/implementation.md` 记录了来源项目名称。不要把技能目录作为运行时 import 路径，也不要未经请求改动目标项目路由和鉴权。
