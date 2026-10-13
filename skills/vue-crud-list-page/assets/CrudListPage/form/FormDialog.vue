<script setup lang="ts">
/**
 * FormDialog —— 增改表单弹窗
 * - 通过 props.data 区分新增（null）和编辑模式
 * - 编辑模式下自动填充当前行数据；新增模式下使用 defaultValue
 * - 支持 Antdv Next 表单校验
 */
import type { FormInstance } from "antdv-next";
import type { FormItemConfig } from "../types";
import FormItem from "./FormItem.vue";
import { QuestionCircleFilled } from "@antdv-next/icons";

const props = withDefaults(
  defineProps<{
    /** 弹窗显示状态，使用 v-model:visible */
    visible: boolean;
    /** 弹窗标题，不传则根据模式自动显示"新增"/"编辑" */
    title?: string;
    /** 弹窗宽度；未指定时根据可见表单项数量自动计算 */
    width?: string | number;
    /** 表单项配置列表 */
    items: FormItemConfig[];
    /** 编辑时传入当前行数据；新增时传 null */
    data?: Record<string, any> | null;
    /** 提交按钮加载状态 */
    loading?: boolean;
  }>(),
  {
    title: "",
    data: null,
    loading: false,
  },
);

const emit = defineEmits<{
  "update:visible": [val: boolean];
  /** 表单提交事件：携带表单数据和是否为编辑模式 */
  submit: [data: Record<string, any>, isEdit: boolean];
  /** 取消/关闭事件 */
  cancel: [];
}>();

/** 是否为编辑模式 */
const isEdit = computed(() => !!props.data);

const dialogTitle = computed(
  () => props.title || (isEdit.value ? "编辑" : "新增"),
);

const formRef = ref<FormInstance>();

const cloneValue = <T,>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => cloneValue(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        cloneValue(item),
      ]),
    ) as T;
  }

  return value;
};

const getValueByPath = (source: Record<string, any>, path: string): any => {
  return path.split(".").reduce<any>((current, key) => current?.[key], source);
};

const setValueByPath = (
  target: Record<string, any>,
  path: string,
  value: any,
) => {
  const keys = path.split(".");
  const lastKey = keys.pop();

  if (!lastKey) return;

  let current: Record<string, any> = target;

  for (const key of keys) {
    if (
      current[key] === undefined ||
      current[key] === null ||
      typeof current[key] !== "object" ||
      Array.isArray(current[key])
    ) {
      current[key] = {};
    }

    current = current[key];
  }

  current[lastKey] = value;
};

/** 根据当前模式构建表单初始数据 */
const buildFormData = (): Record<string, any> => {
  const result: Record<string, any> = {};
  const sourceData = isEdit.value && props.data ? cloneValue(props.data) : {};

  Object.assign(result, sourceData);

  for (const item of props.items) {
    const existingValue = getValueByPath(result, item.field);
    const resolvedValue =
      existingValue !== undefined
        ? existingValue
        : (item.defaultValue ?? undefined);

    if (
      resolvedValue !== undefined ||
      existingValue !== undefined ||
      item.defaultValue !== undefined
    ) {
      setValueByPath(result, item.field, resolvedValue);
    }
  }

  return result;
};

const formData = ref<Record<string, any>>(buildFormData());

/** 弹窗打开时重置表单数据并清除校验 */
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      formData.value = buildFormData();
      nextTick(() => formRef.value?.clearValidate());
    }
  },
);

/** 编辑数据变化时同步更新表单（弹窗已打开的情况） */
watch(
  () => props.data,
  () => {
    if (props.visible) {
      formData.value = buildFormData();
    }
  },
  { deep: true },
);

/**
 * 构建字段的校验规则
 * 优先使用自定义 rules，否则根据 required 自动生成必填规则
 */
const buildFieldRules = (item: FormItemConfig): any[] | undefined => {
  if (item.rules?.length) {
    return item.rules;
  }

  if (item.required) {
    return [
      {
        required: true,
        message: `${item.label}不能为空`,
        trigger:
          item.type === "input" || item.type === "textarea" ? "blur" : "change",
      },
    ];
  }

  return undefined;
};

/** 汇总各字段的校验规则 */
const formRules = computed(() => {
  const rules: Record<string, any[]> = {};
  for (const item of props.items) {
    const fieldRules = buildFieldRules(item);
    if (fieldRules) {
      rules[item.field] = fieldRules;
    }
  }
  return rules;
});

/** 判断某字段是否禁用 */
const isItemDisabled = (item: FormItemConfig): boolean => {
  return !!(item.disabled || (isEdit.value && item.disableOnEdit));
};

/** 判断某字段是否显示 */
const resolveItemVisible = (
  item: FormItemConfig,
  currentFormData: Record<string, any>,
): boolean => {
  if (item.visible === undefined) return true;
  if (typeof item.visible === "function") {
    return item.visible(currentFormData, { isEdit: isEdit.value });
  }
  return item.visible;
};

const visibleItems = computed(() =>
  props.items.filter((item) => resolveItemVisible(item, formData.value)),
);

watch(
  visibleItems,
  () => {
    nextTick(() => formRef.value?.clearValidate());
  },
  { deep: true },
);

/** 根据表单项数量动态计算默认列宽 */
const defaultItemSpan = computed(() => {
  const itemCount = visibleItems.value.length;
  if (itemCount <= 9) return 24;
  return 12;
});

/** 根据表单项数量动态计算弹窗宽度，避免组件被压缩 */
const autoDialogWidth = computed(() => {
  const itemCount = visibleItems.value.length;
  if (itemCount <= 9) return 640;
  if (itemCount <= 18) return 800;
  return 920;
});

const dialogWidth = computed(() => props.width ?? autoDialogWidth.value);

const getItemSpan = (item: FormItemConfig): number =>
  item.span ?? defaultItemSpan.value;

const handleClose = () => {
  emit("update:visible", false);
  emit("cancel");
};

/** 校验通过后提交表单 */
const handleSubmit = async () => {
  try {
    await formRef.value?.validate();
    const normalizedData = { ...formData.value };
    for (const item of props.items) {
      if (!resolveItemVisible(item, normalizedData)) {
        setValueByPath(normalizedData, item.field, undefined);
      }
    }
    emit("submit", normalizedData, isEdit.value);
  } catch {
    // 校验失败，a-form 已自动显示错误提示
  }
};
</script>

<template>
  <a-modal
    root-class="form-dialog"
    :open="visible"
    :title="dialogTitle"
    :width="dialogWidth"
    :mask="{ closable: false }"
    destroy-on-hidden
    @update:open="(val: boolean) => emit('update:visible', val)"
    @cancel="handleClose"
  >
    <a-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-align="right"
      label-wrap
      :label-col="{ span: 6 }"
      :wrapper-col="{ span: 18 }"
    >
      <a-row :gutter="16">
        <a-col
          v-for="item in visibleItems"
          :key="item.field"
          :span="getItemSpan(item)"
        >
          <a-form-item
            :name="item.field"
            :class="{
              'form-item-section': item.layout === 'section',
              'form-item-wide': item.layout === 'wide',
            }"
          >
            <template #label>
              <a-space :size="3">
                <a-tooltip
                  v-if="item.tooltip"
                  :title="item.tooltip"
                  placement="top"
                >
                  <QuestionCircleFilled aria-hidden="true" />
                </a-tooltip>
                {{ item.label }}
              </a-space>
            </template>
            <FormItem
              :config="item"
              :disabled="isItemDisabled(item)"
              :form-data="item.passFormData ? formData : undefined"
              :model-value="getValueByPath(formData, item.field)"
              @update:model-value="
                (val: any) => setValueByPath(formData, item.field, val)
              "
            />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <template #footer>
      <a-button @click="handleClose">取消</a-button>
      <a-button type="primary" :loading="loading" @click="handleSubmit">
        确定
      </a-button>
    </template>
  </a-modal>
</template>

<style lang="scss">
.form-dialog .ant-modal {
  display: flex;
  flex-direction: column;
  max-width: calc(100vw - 24px);
  max-height: min(78vh, 820px);
  overflow: hidden;
  border-radius: 14px;

  // Antdv Next 使用 ant-modal-container 承载 header、body 和 footer；
  // 只有让这个容器参与 flex 布局，body 的滚动区域才会在限高时正确收缩。
  .ant-modal-container {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  .ant-modal-header {
    flex: none;
    margin-right: 0;
    padding: 20px 24px 16px;
  }

  .ant-modal-title {
    font-size: 17px;
    font-weight: 600;
  }

  .ant-form-item {
    align-items: center;
    // 错误提示包含 4px 顶部间距和 18px 行高，与表单项间距保持一致，避免校验时改变弹窗高度。
    margin-bottom: 22px;
  }

  // 最后一项的底部间距不参与滚动区域高度，避免内容可见时因尾部留白触发滚动条。
  .ant-form > .ant-row > .ant-col:last-child .ant-form-item {
    margin-bottom: 0;
  }

  .ant-form-item-control {
    min-width: 0;
  }

  .ant-form-item-control-input {
    min-height: 36px;
  }

  .ant-form-item-explain-error {
    line-height: 18px;
  }

  .ant-form-item-label > label {
    align-items: center;
    height: auto;
    min-height: 36px;
    line-height: 1.5;
  }

  .ant-modal-close {
    top: 16px;
    right: 16px;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    transition:
      color 160ms ease,
      background-color 160ms ease,
      box-shadow 160ms ease;
  }

  .ant-modal-body {
    flex: 1;
    min-height: 0;
    padding: 0 24px;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    scrollbar-color: var(--ant-color-border) transparent;

    &::-webkit-scrollbar {
      width: 8px;
      background-color: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background-color: var(--ant-color-border);
      border-radius: var(--ant-border-radius-sm);
    }

    &::-webkit-scrollbar-thumb:hover {
      background-color: var(--ant-color-text-tertiary);
    }
  }

  .ant-modal-footer {
    flex: none;
    padding: 16px 24px 20px;
  }

  .form-item-section {
    .ant-form-item-row {
      display: block;
    }

    .ant-form-item-label {
      flex: 0 0 100%;
      max-width: 100%;
      padding: 0 0 8px;
      text-align: left;
    }

    .ant-form-item-label > label {
      justify-content: flex-start;
      min-height: 0;
      color: var(--ant-color-text);
      font-size: 14px;
      font-weight: 600;
    }

    .ant-form-item-control {
      width: 100%;
      max-width: 100%;
    }
  }

  .form-item-wide {
    .ant-form-item-label {
      flex: 0 0 12.5%;
      width: 12.5%;
      max-width: 12.5%;
    }

    .ant-form-item-control {
      flex: 0 0 87.5%;
      width: 87.5%;
      max-width: 87.5%;
    }
  }

  .ant-btn + .ant-btn {
    margin-left: 8px;
  }
}

@media (max-width: 767px) {
  .form-dialog .ant-modal {
    max-width: calc(100vw - 24px);

    .ant-modal-header,
    .ant-modal-footer {
      padding-left: 16px;
      padding-right: 16px;
    }

    .ant-modal-body {
      padding-left: 16px;
      padding-right: 16px;
    }

    .ant-form > .ant-row > .ant-col {
      flex: 0 0 100%;
      max-width: 100%;
    }

    .form-item-wide {
      .ant-form-item-label,
      .ant-form-item-control {
        flex: 0 0 100%;
        width: 100%;
        max-width: 100%;
      }
    }
  }
}
</style>
