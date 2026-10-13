# Integration Examples and Adapters

These examples assume the target project has integrated `CrudListPage`, registered UI components, and configured the App context. Component locations and the `@/api/users` business API module depend on the target project; the examples do not prescribe additional backend routes. Example copy is in English; use the target application's language for actual pages. The bundled source retains Chinese defaults, so an English UI also requires adapting those strings and the UI-library locale during component integration.

## Standard Paginated CRUD

The example uses explicit Vue and `CrudListPage` imports for projects without auto-imports. Omit imports already supplied by the target project's tooling.

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
  { field: 'name', label: 'Name' },
  {
    field: 'enabled', label: 'Status', type: 'select',
    options: [
      { label: 'Enabled', value: true },
      { label: 'Disabled', value: false },
    ],
  },
];

const formItems: FormItemConfig[] = [
  { field: 'name', label: 'Name', required: true },
  { field: 'enabled', label: 'Enabled', type: 'switch', defaultValue: true },
];

const columns: ColumnConfig[] = [
  { type: 'index', label: 'No.', width: 64 },
  { prop: 'name', label: 'Name', minWidth: 180 },
  {
    prop: 'enabled', label: 'Status', width: 100,
    formatter: (_row, _column, value) => value ? 'Enabled' : 'Disabled',
  },
  {
    type: 'action', label: 'Actions', width: 160, fixed: 'right',
    actions: [
      { label: 'Edit', onClick: row => { page.value?.openEditDialog(row); } },
      { label: 'Delete', type: 'danger', onClick: row => page.value?.handleDelete(row) },
    ],
  },
];

// The delete callback passes a full row; adapt it to the API's ID argument here.
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
    add-title="Add user"
    edit-title="Edit user"
  />
</template>
```

This example requires userApi.page to return `{ data: { records, total } }` and userApi.detail to return `{ data: userDetails }`. Save methods connect submit-button loading to saving. Do not listen to the snapshot's unimplemented submit/delete events or save/refresh again in those listeners.

## Different Response and Parameter Formats

If an existing API returns an already unwrapped `{ items, count }` and uses page/limit, convert it in fetchData:

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

Pass `:fetch-data="fetchUsers"` to `CrudListPage`. Supply the API object as required by the component's type declaration. For query-only pages, omit formItems and action columns; unused CRUD methods are unnecessary.

For non-paginated data, set `:pagination="false"` and have fetchData/api.list return `{ data: rows }`. Disabling pagination does not automatically enable client-side filtering; implement filtering in the adapter if needed.

For APIs using fetch directly, check response.ok and reject failures. With Axios, check whether an interceptor unwraps the business response. The component treats a resolved Promise as success and does not inspect a business code itself.

Convert composite filters, such as date ranges, at this boundary too. For example, split `dateRange: [start, end]` into the API's actual start/end parameters. Use real interface field names rather than inventing uniform parameters that the API does not support.

## Custom Primary Keys

If the backend uses userId and the target project retains the component's id row key, map list rows to `{ ...row, id: row.userId }`. Also:

- Pass `id-field="userId"` so the detail method receives userId. Configure detailMethod when the response needs conversion.
- Pass `data.userId` as the update key in editMethod; default updates still read data.id.
- Pass row to the delete callback and read row.userId in deleteMethod.
- Remove the extra id field in the save adapter if the backend rejects it.

When the task authorizes component changes, another option is a separate rowKey propagated through the table, tree expansion, details, updates, and deletion. Changing only idField does not unify primary-key handling.

## Cell and Field Extensions

Configure complex cells with `slot: 'status'` and provide `#status="{ row }"`. The action slot also requires a `type: 'action'` column; declaring the slot alone is insufficient.

This custom-field example uses an existing component in the target project:

```ts
import { markRaw } from 'vue';
import UserPicker from '@/components/UserPicker.vue';

const ownerField: FormItemConfig = {
  field: 'ownerId',
  label: 'Owner',
  type: 'custom',
  component: markRaw(UserPicker),
  passFormData: true,
  props: { allowClear: true },
};
```

UserPicker accepts modelValue, disabled, and optional formData, and emits update:modelValue. Forward props matching its actual public interface. Handle cross-field relationships in that component or page configuration rather than putting business requests in FormItem.

Use `visible: (_data, { isEdit }) => !isEdit` for conditional fields, such as a password required only during creation. Hidden fields become undefined by default. Leaving a password unchanged during editing, explicitly clearing a field, and retaining its original value have different business meanings. Handle them in editMethod according to the API contract rather than relying on the shared component to infer intent.

## Using the Source Snapshot

Copy the complete skill folder to the target environment's skill directory to retain its references and source. A common global Codex location is `~/.codex/skills/vue-crud-list-page/`; repository-level skills can use `.agents/skills/vue-crud-list-page/` where supported. Invoke `$vue-crud-list-page` to request integration or configuration of a business page.

The source snapshot is in the skill's `assets/CrudListPage/` directory; it is not automatically installed into the application. Copy it to the target project's chosen component directory, then handle imports, UI context, image paths if applicable, themes, and API adapters. The folder and component comments use the generic name; `references/implementation.md` records the source project and original path. Do not use the skill directory as a runtime import path or change target-project routing and authentication without a request.
