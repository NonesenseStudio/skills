<script setup lang="ts">
/**
 * CrudListPage —— 通用增删改查页面组件
 *
 * 组成：
 *   Sider       ← 侧边栏（可选，通过 hasSider 控制）
 *   SearchBar   ← 搜索栏（可折叠，响应式）
 *   工具栏       ← 新增按钮 + 自定义插槽
 *   DataTable   ← 数据表格（含分页、操作列）
 *   FormDialog  ← 新增 / 编辑弹窗
 *
 * 事件：
 *   @search(params)              搜索参数变化（含重置）
 *   @submit(data, isEdit, row)   表单提交（isEdit=true 为编辑）
 *   @delete(row)                 确认删除某行
 *   @page-change(page, size)     分页参数变化
 *
 * 暴露方法（供父组件通过 ref 调用）：
 *   closeDialog()    关闭表单弹窗（如提交成功后调用）
 *   openAddDialog(initialValues?)  手动打开新增弹窗，可传入表单初始值
 *   openEditDialog(row)  手动打开编辑弹窗
 *   setSearchParams(params)  程序化设置搜索参数并刷新数据
 */
import { PlusOutlined, ReloadOutlined } from "@antdv-next/icons";
import type { SearchItemConfig, FormItemConfig, ColumnConfig } from "./types";
import SearchBar from "./SearchBar.vue";
import DataTable from "./DataTable.vue";
import FormDialog from "./form/FormDialog.vue";
import { type CSSProperties } from "vue";
import { App } from "antdv-next";

const props = withDefaults(
  defineProps<{
    // ── 搜索栏 ──────────────────────────────────────────────────────────────
    /** 搜索项配置，不传则不显示搜索区域 */
    searchItems?: SearchItemConfig[];

    // ── 表单 ────────────────────────────────────────────────────────────────
    /** 增改表单项配置，不传则不显示弹窗（新增按钮也隐藏） */
    formItems?: FormItemConfig[];
    /** 新增弹窗标题 */
    addTitle?: string;
    /** 编辑弹窗标题 */
    editTitle?: string;
    /** 表单弹窗宽度；未指定时由表单项数量自动计算 */
    formDialogWidth?: string | number;
    /** 表单提交按钮的加载状态（父组件在接口响应前置 true） */
    formLoading?: boolean;

    // ── 表格 ────────────────────────────────────────────────────────────────
    /** 表格列配置（操作列通过 columns 中 type: 'action' 配置） */
    columns: ColumnConfig[];
    /** 是否默认展开所有节点 */
    defaultExpandAll?: boolean;

    // ── 分页 ────────────────────────────────────────────────────────────────
    /** 是否开启分页（false 时不显示分页控件） */
    pagination?: boolean;

    // ── 自定义请求配置 ────────────────────────────────────────────────────────
    /** 接口对象 */
    api: any;
    /** 自定义新增方法 */
    addMethod?: (data: Record<string, any>) => Promise<any>;
    /** 自定义编辑方法 */
    editMethod?: (data: Record<string, any>) => Promise<any>;
    /** 自定义删除方法 */
    deleteMethod?: (row: any) => Promise<any>;
    /** 自定义详情查询方法 */
    detailMethod?: (id: any, row?: Record<string, any>) => Promise<any>;
    /** 自定义获取表格数据方法 */
    fetchData?: (params: Record<string, any>) => Promise<any>;
    /** 是否显示工具栏的新增按钮 */
    showAdd?: boolean;
    /** 是否显示工具栏右侧的刷新按钮 */
    showRefresh?: boolean;

    // ── 侧边栏 ────────────────────────────────────────────────────────────────
    /** 是否显示侧边栏 */
    hasSider?: boolean;
    /** 侧边栏宽度 */
    siderWidth?: string | number;
    /** 详情接口使用的字段名，默认为 'id' */
    idField?: string;
  }>(),
  {
    searchItems: () => [],
    formItems: () => [],
    addTitle: "新增",
    editTitle: "编辑",
    formLoading: false,
    defaultExpandAll: false,
    loading: false,
    pagination: true,
    total: 0,
    pageSize: 20,
    showAdd: true,
    showRefresh: true,
    hasSider: false,
    siderWidth: 240,
    idField: "id",
  },
);

const emit = defineEmits<{
  search: [params: Record<string, any>];
  submit: [data: Record<string, any>, isEdit: boolean, originalRow: any | null];
  delete: [row: any];
  "page-change": [page: number, pageSize: number];
}>();

const { message, modal } = App.useApp();

// ─── 变量常量管理 ────────────────────────────────────────────────────────────────
const table_card_body_style: CSSProperties = {
  display: "flex",
  flexDirection: "column",
};
const tableData = ref<any[]>([]);
const pager = ref({
  total: 0,
  pageSize: 20,
  pageNum: 1,
});
const searchParams = ref<Record<string, any>>({});
const loading = ref(false);

// ─── 弹窗状态 ────────────────────────────────────────────────────────────────

const dialogVisible = ref(false);
/** 当前正在编辑的行数据（null 表示新增模式） */
const editingRow = ref<Record<string, any> | null>(null);
/** 新增表单的初始值 */
const addInitialValues = ref<Record<string, any>>({});

const dialogTitle = computed(() =>
  editingRow.value ? props.editTitle : props.addTitle,
);

const dialogFormItems = computed(() =>
  props.formItems.map((item) =>
    Object.prototype.hasOwnProperty.call(addInitialValues.value, item.field)
      ? { ...item, defaultValue: addInitialValues.value[item.field] }
      : item,
  ),
);

// ─── DataTable ref（用于搜索后重置页码） ───────────────────────────────────

const dataTableRef = ref<InstanceType<typeof DataTable>>();
// ─── 事件处理 ────────────────────────────────────────────────────────────────
/**
 * 获取表格数据
 *
 */
const fetchTableData = async () => {
  loading.value = true;
  const queryParams = props.pagination
    ? {
        ...searchParams.value,
        pageNum: pager.value.pageNum,
        pageSize: pager.value.pageSize,
      }
    : searchParams.value;
  if (props.fetchData) {
    try {
      const res = await props.fetchData(queryParams);
      if (props.pagination) {
        pager.value.total = res.data.total;
        tableData.value = res.data.records;
      } else {
        tableData.value = res.data;
        pager.value.total = res.data.length;
      }
    } catch (error: any) {
      tableData.value = [];
      pager.value.total = 0;
      pager.value.pageNum = 1;
      pager.value.pageSize = 20;
    } finally {
      loading.value = false;
    }
  } else {
    try {
      if (props.pagination) {
        const res = await props.api.page(queryParams);
        pager.value.total = res.data.total;
        tableData.value = res.data.records;
      } else {
        const res = await props.api.list(queryParams);
        tableData.value = res.data;
        pager.value.total = res.data.length;
      }
    } catch (error: any) {
      tableData.value = [];
      pager.value.total = 0;
    } finally {
      loading.value = false;
    }
  }
};

const handleSearch = (params: Record<string, any>) => {
  // 每次搜索重置到第一页
  searchParams.value = params;
  dataTableRef.value?.resetPage();
  emit("search", params);
};

/**
 * 处理表单提交
 * @param data 表单数据
 * @param isEdit 是否为编辑模式
 */
const handleSubmit = async (data: Record<string, any>, isEdit: boolean) => {
  loading.value = true;
  try {
    if (isEdit) {
      if (props.editMethod) {
        await props.editMethod(data);
      } else {
        await props.api.update(data.id, data);
      }
      loading.value = false;
      message.success("编辑成功");
    } else {
      if (props.addMethod) {
        await props.addMethod(data);
      } else {
        await props.api.create(data);
      }
      message.success("新增成功");
    }
    loading.value = false;
    closeDialog();
    await fetchTableData();
  } catch (error) {
    // 错误处理由调用方或全局拦截器处理
    loading.value = false;
  }
};

const handleDelete = (row: any) => {
  modal.confirm({
    title: "注意",
    content: "确认删除该条数据吗？删除后不可恢复。",
    okText: "确认",
    cancelText: "取消",
    type: "warning",
    rootClass: "workspace-message-box",
    onOk: async () => {
      if (props.deleteMethod) {
        await props.deleteMethod(row);
      } else {
        await props.api.delete(row);
      }
      message.success("删除成功");
      dataTableRef.value?.resetPage();
    },
  });
};

const handlePageChange = (page: number, pageSize: number) => {
  const pageSizeChanged = pageSize !== pager.value.pageSize;
  pager.value.pageNum = pageSizeChanged ? 1 : page;
  pager.value.pageSize = pageSize;
  emit("page-change", pager.value.pageNum, pageSize);
  fetchTableData();
};

// ─── 暴露给父组件的方法 ────────────────────────────────────────────────────

const openAddDialog = (initialValues: Record<string, any> = {}) => {
  editingRow.value = null;
  addInitialValues.value = { ...initialValues };
  dialogVisible.value = true;
};

const openEditDialog = async (row: any) => {
  try {
    addInitialValues.value = {};
    const id = row[props.idField];
    const res = props.detailMethod
      ? await props.detailMethod(id, row)
      : await props.api.detail(id);
    editingRow.value = { ...(res?.data ?? res) };
    dialogVisible.value = true;
  } catch (error: any) {
    // 错误处理由调用方或全局拦截器处理
    editingRow.value = { ...row };
    dialogVisible.value = true;
  }
};

/** 提交成功后由父组件调用以关闭弹窗 */
const closeDialog = () => {
  dialogVisible.value = false;
};

/** 供父组件程序化设置搜索参数并触发数据刷新 */
const setSearchParams = (params: Record<string, any>) => {
  searchParams.value = { ...searchParams.value, ...params };
  nextTick(() => {
    fetchTableData();
  });
};

defineExpose({
  closeDialog,
  openAddDialog,
  openEditDialog,
  refresh: fetchTableData,
  handleDelete,
  setSearchParams,
});

// ─── 计算仅用于列插槽透传的列配置 ─────────────────────────────────────────

/** 具有自定义插槽的列 */
const slotColumns = computed(() =>
  props.columns.filter(
    (col): col is typeof col & { slot: string } => !!col.slot,
  ),
);

/** 是否有 formItems 配置（决定是否渲染弹窗和新增按钮） */
const hasForm = computed(() => props.formItems.length > 0);

/** 直接使用父组件传入的列配置，不自动注入操作列 */
const mergedColumns = computed(() => props.columns);

onMounted(() => {
  fetchTableData();
});
</script>

<template>
  <a-layout class="d-page-container">
    <!-- 侧边栏 -->
    <a-layout-sider
      v-if="hasSider"
      class="d-page-sider"
      :width="typeof siderWidth === 'number' ? siderWidth + 'px' : siderWidth"
    >
      <slot name="aside"></slot>
    </a-layout-sider>

    <!-- 主内容区 -->
    <a-layout-content class="d-page-main">
      <div class="d-page">
        <!-- 页面标题 -->
        <div v-if="$slots.header" class="page-header">
          <slot name="header"></slot>
        </div>

        <!-- 搜索区域 -->
        <a-card
          v-if="searchItems.length"
          class="search-card"
          variant="borderless"
        >
          <SearchBar :items="searchItems" @search="handleSearch" />
        </a-card>

        <!-- 数据表格区域 -->
        <a-card
          class="table-card"
          variant="borderless"
          :styles="{ body: table_card_body_style }"
        >
          <!-- 工具栏 -->
          <div class="toolbar">
            <div class="toolbar-left">
              <!-- 自定义工具栏左侧内容 -->
              <a-button
                v-if="showAdd && hasForm"
                type="primary"
                @click="openAddDialog"
              >
                <template #icon>
                  <PlusOutlined />
                </template>
                新增
              </a-button>
              <slot name="toolbar-left" />
            </div>
            <div class="toolbar-right">
              <!-- 自定义工具栏右侧内容 -->
              <slot name="toolbar-right" />
              <a-button
                v-if="showRefresh"
                class="toolbar-refresh-button"
                aria-label="刷新数据"
                title="刷新数据"
                @click="fetchTableData"
              >
                <template #icon>
                  <ReloadOutlined />
                </template>
              </a-button>
            </div>
          </div>

          <!-- 表格 -->
          <DataTable
            ref="dataTableRef"
            :columns="mergedColumns"
            :data="tableData"
            :loading="loading"
            :pagination="pagination"
            :total="pager.total"
            :page-num="pager.pageNum"
            :page-size="pager.pageSize"
            :default-expand-all="defaultExpandAll"
            @page-change="handlePageChange"
          >
            <!-- 将父组件传入的自定义列插槽透传到 DataTable -->
            <template
              v-for="col in slotColumns"
              :key="col.slot"
              #[col.slot]="slotData"
            >
              <slot :name="col.slot" v-bind="slotData ?? {}" />
            </template>

            <!-- 透传操作列额外按钮插槽 -->
            <template v-if="$slots.action" #action="{ row }">
              <slot name="action" :row="row" />
            </template>
          </DataTable>
        </a-card>

        <!-- 增改弹窗（仅在配置了 formItems 时渲染） -->
        <FormDialog
          v-if="hasForm"
          v-model:visible="dialogVisible"
          :title="dialogTitle"
          :width="formDialogWidth"
          :items="dialogFormItems"
          :data="editingRow"
          :loading="formLoading"
          @submit="handleSubmit"
        />
      </div>
    </a-layout-content>
  </a-layout>
</template>

<style scoped lang="scss">
.d-page-container {
  height: 100%;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  overflow: hidden;

  .d-page-sider {
    height: 100%;
    min-width: 0;
    overflow: auto;
    transition: width 0.3s ease;
    margin-right: 12px;
    padding: 12px;
    box-sizing: border-box;
    border-radius: 12px;
  }

  .d-page-main {
    height: 100%;
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    padding: 0;
    display: flex;
    flex-direction: column;
  }
}

.d-page {
  height: 100%;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;

  .page-header {
    .page-title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
  }

  .search-card {
    flex: none;
    border-radius: 12px;

    :deep(.ant-card-body) {
      padding: 16px 16px 0;
    }
  }

  .table-card {
    flex: 1 1 0%;
    width: 100%;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 12px;

    :deep(.ant-card-body) {
      flex: 1;
      width: 100%;
      height: 100%;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 16px;
    }

    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      min-height: 40px;
      flex-wrap: wrap;
      gap: 8px 16px;
      margin-bottom: 12px;

      .toolbar-left,
      .toolbar-right {
        display: flex;
        align-items: center;
        min-height: 36px;
        flex-wrap: wrap;
        gap: 8px;

        :deep(.ant-btn + .ant-btn) {
          margin-left: 0;
        }
      }

      .toolbar-right {
        margin-left: auto;
      }

      .toolbar-refresh-button {
        width: 36px;
        height: 36px;
        padding: 0;
      }
    }
  }
}

@media (max-width: 767px) {
  .d-page {
    padding: 12px;

    .table-card .toolbar {
      align-items: flex-start;

      .toolbar-right {
        margin-left: 0;
      }
    }
  }
}
</style>
