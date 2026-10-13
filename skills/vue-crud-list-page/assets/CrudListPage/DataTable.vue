<script setup lang="ts">
/**
 * DataTable —— Antdv Next 数据表格（含分页）
 *
 * 使用 Antdv Next 的 columns + bodyCell 模型渲染普通列、插槽列和操作列。
 */
import { DownOutlined } from "@antdv-next/icons";
import type { ColumnConfig, ActionButtonConfig } from "./types";
import type { PaginationProps } from "antdv-next";

const props = withDefaults(
  defineProps<{
    /** 列配置 */
    columns: ColumnConfig[];
    /** 表格数据 */
    data: any[];
    /** 加载状态 */
    loading?: boolean;
    /** 是否开启分页（false 则不显示分页控件） */
    pagination?: boolean;
    /** 数据总条数（分页模式必传） */
    total?: number;
    /** 当前页码 */
    pageNum?: number;
    /** 每页条数 */
    pageSize?: number;
    /** 可选每页条数 */
    pageSizes?: number[];
    /** 是否默认展开所有节点 */
    defaultExpandAll?: boolean;
  }>(),
  {
    loading: false,
    pagination: true,
    total: 0,
    pageNum: 1,
    pageSize: 20,
    pageSizes: () => [10, 20, 50, 100],
    defaultExpandAll: false,
  },
);

const emit = defineEmits<{
  /** 分页参数变化（页码或每页条数） */
  "page-change": [page: number, pageSize: number];
}>();

const showTotal: PaginationProps["showTotal"] = (total) => `共 ${total} 条`;

/** 供父组件调用，在新搜索后重置到第一页。 */
const resetPage = () => {
  emit("page-change", 1, props.pageSize);
};

const handlePageChange = (page: number, pageSize: number) => {
  emit("page-change", page, pageSize);
};

defineExpose({ resetPage });

type TableColumn = {
  key: string;
  dataIndex?: string;
  title: string;
  width?: string | number;
  minWidth?: number;
  fixed?: boolean | "left" | "right";
  sorter?: true;
  align?: "left" | "center" | "right";
  ellipsis: boolean;
  __config: ColumnConfig;
};

const tableColumns = computed<TableColumn[]>(() =>
  props.columns.flatMap((column, index) => {
    if (column.type === "selection" || column.type === "expand") {
      return [];
    }

    return [
      {
        key: column.prop ?? `${column.type ?? "column"}-${index}`,
        dataIndex: column.prop,
        title: column.label,
        width:
          column.width === undefined
            ? column.minWidth
            : typeof column.width === "number" && column.minWidth !== undefined
              ? Math.max(column.width, column.minWidth)
              : column.width,
        minWidth: column.minWidth,
        fixed: column.fixed,
        sorter: column.sortable ? true : undefined,
        align: column.align,
        ellipsis: column.showOverflowTooltip ?? true,
        __config: column,
      },
    ];
  }),
);

const tableContainerRef = ref<HTMLElement>();
const hasTableOverflow = ref(false);
let overflowCheckPending = false;
let resizeObserver: ResizeObserver | undefined;

const tableScroll = computed(() => ({
  x: "max-content" as const,
  y: hasTableOverflow.value ? "100%" : undefined,
}));

type TableRowKey = string | number;

const expandedRowKeys = ref<TableRowKey[]>([]);

const getExpandedRowKeys = (rows: any[]): TableRowKey[] => {
  const keys: TableRowKey[] = [];

  const collect = (items: any[]) => {
    items.forEach((item) => {
      const children = Array.isArray(item?.children) ? item.children : [];
      if (!children.length) return;

      if (item.id !== undefined && item.id !== null) {
        keys.push(item.id);
      }
      collect(children);
    });
  };

  collect(rows);
  return keys;
};

const syncExpandedRowKeys = () => {
  expandedRowKeys.value = props.defaultExpandAll
    ? getExpandedRowKeys(props.data)
    : [];
};

watch([() => props.data, () => props.defaultExpandAll], syncExpandedRowKeys, {
  immediate: true,
});

const handleExpandedRowsChange = (keys: readonly TableRowKey[]) => {
  expandedRowKeys.value = [...keys];
};

const checkTableOverflow = () => {
  const table =
    tableContainerRef.value?.querySelector<HTMLElement>(".ant-table");

  if (!table) {
    return;
  }

  const body = table.querySelector<HTMLElement>(".ant-table-body");
  const content = table.querySelector<HTMLTableElement>(
    ".ant-table-content table",
  );
  const pagination = tableContainerRef.value?.querySelector<HTMLElement>(
    ".pagination-wrapper",
  );
  const paginationSpace = pagination?.offsetHeight || 0;
  const availableHeight = Math.max(
    0,
    (tableContainerRef.value?.clientHeight || 0) - paginationSpace,
  );

  if (!availableHeight) return;

  const contentHeight = body
    ? body.scrollHeight
    : content?.getBoundingClientRect().height || 0;
  const isOverflowing = contentHeight > availableHeight + 1;

  if (isOverflowing !== hasTableOverflow.value) {
    hasTableOverflow.value = isOverflowing;
  }
};

const scheduleTableOverflowCheck = () => {
  if (overflowCheckPending) return;

  overflowCheckPending = true;
  nextTick(() => {
    overflowCheckPending = false;
    checkTableOverflow();
  });
};

watch(
  [() => props.data, () => props.loading, () => tableColumns.value],
  scheduleTableOverflowCheck,
  { deep: true, flush: "post" },
);

onMounted(() => {
  scheduleTableOverflowCheck();

  resizeObserver = new ResizeObserver(scheduleTableOverflowCheck);
  if (tableContainerRef.value) {
    resizeObserver.observe(tableContainerRef.value);
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});

const getColumnConfig = (column: unknown): ColumnConfig | undefined =>
  (column as { __config?: ColumnConfig } | undefined)?.__config;

const rowSelection = computed(() =>
  props.columns.some((column) => column.type === "selection") ? {} : undefined,
);

const isActionVisible = (
  show: boolean | ((row: any) => boolean) | undefined,
  row: any,
): boolean => {
  if (show === undefined) return true;
  return typeof show === "function" ? show(row) : show;
};

const handleActionClick = (action: ActionButtonConfig, row: any) => {
  action.onClick?.(row);
};

const getActionClass = (action: ActionButtonConfig) => [
  "table-action-link",
  action.type
    ? `table-action-link--${action.type}`
    : "table-action-link--primary",
  action.className,
];

const getVisibleActions = (actions: ActionButtonConfig[], row: any) =>
  actions.filter((action) => isActionVisible(action.show, row));

const getDropdownMenu = (actions: ActionButtonConfig[], row: any) => {
  const visibleActions = getVisibleActions(actions, row);

  return {
    rootClass: "workspace-popper",
    items: visibleActions.map((action, index) => ({
      key: String(index),
      label: action.label,
      class: action.className,
      danger: action.type === "danger",
    })),
    onClick: ({ key }: { key: string }) => {
      const action = visibleActions[Number(key)];
      if (action) handleActionClick(action, row);
    },
  };
};
</script>

<template>
  <div ref="tableContainerRef" class="data-table">
    <a-table
      class="workspace-data-table"
      :class="{ 'workspace-data-table--scrollable': hasTableOverflow }"
      :loading="loading"
      :data-source="data"
      :columns="tableColumns"
      :row-selection="rowSelection"
      :expandable="{
        defaultExpandAllRows: defaultExpandAll,
        expandedRowKeys: defaultExpandAll ? expandedRowKeys : undefined,
      }"
      row-key="id"
      :scroll="tableScroll"
      :pagination="false"
      style="width: 100%"
      bordered
      @update:expanded-row-keys="handleExpandedRowsChange"
    >
      <template #emptyText>
        <a-empty v-if="!loading" class="workspace-empty" />
      </template>

      <template #bodyCell="{ column, record, text, index }">
        <template v-if="getColumnConfig(column)?.type === 'index'">
          {{ index + 1 }}
        </template>

        <template v-else-if="getColumnConfig(column)?.type === 'action'">
          <a-space>
            <template
              v-for="(action, actionIndex) in getColumnConfig(column)
                ?.actions ?? []"
              :key="actionIndex"
            >
              <a-button
                v-if="isActionVisible(action.show, record)"
                type="link"
                size="small"
                :danger="action.type === 'danger'"
                :class="getActionClass(action)"
                @click="handleActionClick(action, record)"
              >
                {{ action.label }}
              </a-button>
            </template>

            <a-dropdown
              v-if="
                getColumnConfig(column)?.alwaysShowDropdown ||
                getVisibleActions(
                  getColumnConfig(column)?.dropdownActions ?? [],
                  record,
                ).length
              "
              :disabled="
                !getVisibleActions(
                  getColumnConfig(column)?.dropdownActions ?? [],
                  record,
                ).length
              "
              :menu="
                getDropdownMenu(
                  getColumnConfig(column)?.dropdownActions ?? [],
                  record,
                )
              "
            >
              <a-button
                type="link"
                size="small"
                class="table-action-link"
                :disabled="
                  !getVisibleActions(
                    getColumnConfig(column)?.dropdownActions ?? [],
                    record,
                  ).length
                "
              >
                {{ getColumnConfig(column)?.dropdownText || "更多" }}
                <DownOutlined />
              </a-button>
            </a-dropdown>

            <slot name="action" :row="record" />
          </a-space>
        </template>

        <template v-else-if="getColumnConfig(column)?.slot">
          <slot :name="getColumnConfig(column)?.slot" :row="record" />
        </template>

        <template v-else-if="getColumnConfig(column)?.render">
          <component
            v-if="typeof getColumnConfig(column)?.render?.(record) !== 'string'"
            :is="getColumnConfig(column)?.render?.(record)"
          />
          <template v-else
            >{{ getColumnConfig(column)?.render?.(record) }}
          </template>
        </template>

        <template v-else-if="getColumnConfig(column)?.formatter">
          {{ getColumnConfig(column)?.formatter?.(record, column, text) }}
        </template>

        <template v-else>{{ text }}</template>
      </template>
    </a-table>

    <div v-if="pagination" class="pagination-wrapper">
      <a-pagination
        class="workspace-pagination"
        :current="pageNum"
        :page-size="pageSize"
        :page-size-options="pageSizes"
        :total="total"
        :show-size-changer="true"
        :show-quick-jumper="true"
        :show-total="showTotal"
        size="small"
        @change="handlePageChange"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.data-table {
  flex: 1 1 0%;
  width: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  :deep(.workspace-data-table) {
    flex: none;
    width: 100%;
    min-width: 0;
    min-height: 0;
    height: auto;
  }

  :deep(.workspace-data-table--scrollable) {
    flex: 1 1 0%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  :deep(.workspace-data-table--scrollable > .ant-spin) {
    display: flex;
    flex: 1 1 0%;
    width: 100%;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  :deep(.workspace-data-table--scrollable > .ant-spin > .ant-spin-container) {
    display: flex;
    flex: 1 1 0%;
    width: 100%;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  :deep(
    .workspace-data-table--scrollable
      > .ant-spin
      > .ant-spin-container
      > .ant-table
  ) {
    display: flex;
    flex: 1 1 0%;
    width: 100%;
    flex-direction: column;
    min-height: 0;
  }

  :deep(
    .workspace-data-table--scrollable
      > .ant-spin
      > .ant-spin-container
      > .ant-table
      > .ant-table-container
  ) {
    display: flex;
    flex: 1 1 0%;
    width: 100%;
    flex-direction: column;
    min-height: 0;
  }

  :deep(
    .workspace-data-table--scrollable
      > .ant-spin
      > .ant-spin-container
      > .ant-table
      > .ant-table-container
      > .ant-table-body
  ) {
    flex: 1 1 0%;
    min-height: 0;
  }

  :deep(.workspace-data-table .ant-table-thead > tr > th) {
    height: 44px;
    padding-top: 0;
    padding-bottom: 0;
    font-size: 13px;
    font-weight: 600;
  }

  :deep(.workspace-data-table .ant-table-tbody > tr > td) {
    height: 48px;
    padding-top: 0;
    padding-bottom: 0;
    font-size: 14px;
  }

  :deep(.workspace-data-table .ant-table-cell) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    word-break: normal;
  }

  :deep(.workspace-empty) {
    padding: 24px 0;

    .ant-empty-image {
      height: 120px;
      max-width: 120px;
      margin: 0 auto 12px;
    }
  }

  .pagination-wrapper {
    flex: none;
    margin-top: auto;
    padding-top: 16px;
    display: flex;
    justify-content: flex-end;
  }
}

@media (max-width: 767px) {
  .data-table {
    .pagination-wrapper {
      justify-content: center;

      :deep(.workspace-pagination .ant-pagination-options),
      :deep(.workspace-pagination .ant-pagination-options-quick-jumper) {
        display: none;
      }
    }
  }
}
</style>
