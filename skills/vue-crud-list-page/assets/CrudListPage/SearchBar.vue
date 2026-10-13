<script setup lang="ts">
/**
 * SearchBar —— 响应式搜索栏
 *
 * 功能：
 * 1. 动态渲染搜索项（支持 input / select / date / daterange / number）
 * 2. 使用 a-row 实现响应式分栏：xl/lg=4列, md=3列, sm=2列, xs=1列
 * 3. 搜索按钮固定在最右侧，按钮列宽度根据最后一行剩余空间动态计算
 * 4. 支持折叠功能：collapsible=true 的字段默认隐藏，点击"展开"后显示
 */
import {
  SearchOutlined,
  ReloadOutlined,
  DownOutlined,
  UpOutlined,
} from "@antdv-next/icons";
import type { SearchItemConfig } from "./types";
import FormItem from "./form/FormItem.vue";

const props = withDefaults(
  defineProps<{
    /** 搜索项配置列表 */
    items: SearchItemConfig[];
  }>(),
  { items: () => [] },
);

const emit = defineEmits<{
  /** 触发搜索，携带过滤后的非空参数 */
  search: [params: Record<string, any>];
}>();

// ─── 表单数据 ────────────────────────────────────────────────────────────────

const searchForm = ref<Record<string, any>>({});

/** items 变化时重新初始化表单（使用 defaultValue） */
watch(
  () => props.items,
  (items) => {
    const form: Record<string, any> = {};
    for (const item of items) {
      form[item.field] = item.defaultValue ?? undefined;
    }
    searchForm.value = form;
  },
  { immediate: true },
);

// ─── 折叠逻辑 ────────────────────────────────────────────────────────────────

/** 当前是否处于折叠状态（默认折叠） */
const collapsed = ref(true);

/** 配置中是否存在可折叠项 */
const hasCollapsibleItems = computed(() =>
  props.items.some((item) => item.collapsible),
);

/** 当前可见的搜索项 */
const visibleItems = computed(() =>
  collapsed.value
    ? props.items.filter((item) => !item.collapsible)
    : props.items,
);

// ─── 按钮列宽度计算 ───────────────────────────────────────────────────────────

/**
 * 计算在指定行列规则下，按钮列应占的栅格数
 * @param itemsPerRow 每行显示的搜索项数量
 * @param colsPerItem 每个搜索项占的栅格数
 */
const calcButtonSpan = (itemsPerRow: number, colsPerItem: number): number => {
  const count = visibleItems.value.length;
  const itemsOnLastRow = count % itemsPerRow;
  // 最后一行已满时，按钮另起一行（占满宽度）
  if (itemsOnLastRow === 0) return 24;
  return 24 - itemsOnLastRow * colsPerItem;
};

/** 各断点下按钮列的栅格数（保证按钮始终在最右侧） */
const buttonSpan = computed(() => ({
  xs: 24,
  sm: calcButtonSpan(2, 12), // sm：每行 2 个，每个 12 格
  md: calcButtonSpan(3, 8), // md：每行 3 个，每个 8 格
  lg: calcButtonSpan(4, 6), // lg：每行 4 个，每个 6 格
  xl: calcButtonSpan(4, 6), // xl：每行 4 个，每个 6 格
}));

// ─── 事件处理 ─────────────────────────────────────────────────────────────────

/** 触发搜索，过滤掉空值 */
const handleSearch = () => {
  const params: Record<string, any> = {};
  for (const [key, val] of Object.entries(searchForm.value)) {
    if (val !== undefined && val !== null && val !== "") {
      params[key] = val;
    }
  }
  emit("search", params);
};

/** 重置表单并触发空参数搜索 */
const handleReset = () => {
  for (const item of props.items) {
    searchForm.value[item.field] = item.defaultValue ?? undefined;
  }
  emit("search", {});
};

const toggleCollapse = () => {
  collapsed.value = !collapsed.value;
};
</script>

<template>
  <div class="search-bar">
    <a-form
      class="workspace-search-form"
      :model="searchForm"
      :label-col="{ span: 5 }"
    >
      <a-row :gutter="16" align="middle">
        <!-- 搜索项列 -->
        <a-col
          v-for="item in visibleItems"
          :key="item.field"
          :xs="24"
          :sm="12"
          :md="8"
          :lg="6"
          :xl="6"
        >
          <a-form-item :label="item.label" class="search-form-item">
            <FormItem :config="item as any" v-model="searchForm[item.field]" />
          </a-form-item>
        </a-col>

        <!-- 按钮列：宽度动态计算以保持最右对齐 -->
        <a-col
          :xs="buttonSpan.xs"
          :sm="buttonSpan.sm"
          :md="buttonSpan.md"
          :lg="buttonSpan.lg"
          :xl="buttonSpan.xl"
          class="button-col"
        >
          <a-form-item class="button-form-item" :wrapper-col="{ span: 24 }">
            <a-space>
              <a-button type="primary" @click="handleSearch">
                <template #icon>
                  <SearchOutlined />
                </template>
                搜索
              </a-button>
              <a-button @click="handleReset">
                <template #icon>
                  <ReloadOutlined />
                </template>
                重置
              </a-button>
            </a-space>
            <!-- 折叠切换按钮（仅当存在可折叠项时显示） -->
            <a-button
              v-if="hasCollapsibleItems"
              type="link"
              class="collapse-btn"
              :aria-expanded="String(!collapsed)"
              @click="toggleCollapse"
            >
              {{ collapsed ? "展开" : "收起" }}
              <DownOutlined v-if="collapsed" class="collapse-icon" />
              <UpOutlined v-else class="collapse-icon" />
            </a-button>
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>
  </div>
</template>

<style scoped lang="scss">
.search-bar {
  width: 100%;

  :deep(.workspace-search-form) {
    width: 100%;
  }

  // 确保每个搜索项的 label + 控件撑满列宽
  .search-form-item {
    width: 100%;
    margin-bottom: 16px;
    align-items: center;

    :deep(.ant-form-item-label > label) {
      align-items: center;
      font-size: 13px;
      font-weight: 500;
      height: auto;
      min-height: 36px;
      line-height: 1.5;
    }

    :deep(.ant-form-item-control) {
      flex: 1;
      align-items: center;
      min-width: 0;
    }

    :deep(.ant-form-item-control-input) {
      min-height: 36px;
    }
  }

  // 按钮列：内容右对齐
  .button-col {
    display: flex;
    justify-content: flex-end;
    min-width: 0;

    .button-form-item {
      margin-bottom: 16px;
      margin-right: 0;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      white-space: normal;

      :deep(.ant-btn + .ant-btn) {
        margin-left: 0;
      }
    }

    .collapse-icon {
      margin-left: 2px;
      vertical-align: middle;
    }
  }

  // 小屏时按钮组左对齐（整行宽度已经是 24 格）
  @media (max-width: 767px) {
    .button-col {
      justify-content: flex-start;

      .button-form-item {
        justify-content: flex-start;
      }
    }
  }
}
</style>
