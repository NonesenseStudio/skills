<script setup lang="ts">
/**
 * FormItem —— 动态表单项渲染器
 * 根据 config.type 渲染对应的 Antdv Next 表单控件。
 * 同时用于搜索栏和增改表单。
 */
import type { UploadChangeParam, UploadFile } from "antdv-next";
import type { FormItemConfig } from "../types";

/** 接受 SearchItemConfig 或 FormItemConfig 的公共字段 */
type ItemConfig = Pick<
  FormItemConfig,
  | "type"
  | "label"
  | "placeholder"
  | "options"
  | "treeData"
  | "props"
  | "component"
>;

const props = withDefaults(
  defineProps<{
    /** 字段配置 */
    config: ItemConfig;
    /** 当前值，支持 v-model */
    modelValue: any;
    /** 当前表单数据；仅供自定义组件感知同级字段 */
    formData?: Record<string, any>;
    /** 是否禁用 */
    disabled?: boolean;
  }>(),
  { disabled: false },
);

const emit = defineEmits<{
  "update:modelValue": [value: any];
}>();

const handleUpdate = (value: any) => emit("update:modelValue", value);

const getPopupClasses = (config: ItemConfig) => {
  const classes = config.props?.classes;

  if (typeof classes === "function") return classes;

  return {
    ...(classes ?? {}),
    popup: {
      ...(classes?.popup ?? {}),
      root:
        classes?.popup?.root ??
        config.props?.popupClassName ??
        "workspace-popper",
    },
  };
};

const getComponentProps = (config: ItemConfig) => {
  const {
    popupClassName: _popupClassName,
    classes: _classes,
    ...componentProps
  } = config.props ?? {};

  return componentProps;
};

const getCustomComponentProps = (config: ItemConfig) => ({
  ...(props.formData === undefined ? {} : { formData: props.formData }),
  ...(config.props ?? {}),
});

/**
 * 将 URL 字符串转换为 UploadFile 对象数组。
 * 用于处理后端返回的字符串 URL 与 a-upload 组件的兼容性。
 */
const normalizeFileList = (value: any): UploadFile[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value as UploadFile[];
  if (typeof value === "string") {
    return [
      {
        name: value.split("/").pop() || "file",
        url: value,
        uid: `-${value}`,
        status: "done",
      },
    ];
  }
  return [];
};

/** 处理文件变化并提取上传成功后的 URL。 */
const handleUploadChange = (info: UploadChangeParam) => {
  const uploadFile = info.file;

  if (uploadFile.status === "done") {
    const response = uploadFile.response as any;
    const urlField = props.config.props?.urlField || "url";
    const url = response?.data?.[urlField] || response?.data || uploadFile.url;
    emit("update:modelValue", url);
    return;
  }

  if (uploadFile.status === "removed") {
    emit("update:modelValue", undefined);
    return;
  }

  if (uploadFile.url) {
    emit("update:modelValue", uploadFile.url);
  }
};

const handleRemove = () => {
  emit("update:modelValue", undefined);
};

const handleTreeSelectClear = () => {
  emit("update:modelValue", null);
};
</script>

<template>
  <!-- 单行文本输入 -->
  <a-input
    v-if="!config.type || config.type === 'input'"
    class="workspace-form-control"
    :value="modelValue"
    :placeholder="config.placeholder ?? `请输入${config.label}`"
    :disabled="disabled"
    allow-clear
    v-bind="config.props"
    @update:value="handleUpdate"
  />

  <!-- 多行文本 -->
  <a-textarea
    v-else-if="config.type === 'textarea'"
    class="workspace-form-control"
    :value="modelValue"
    :placeholder="config.placeholder ?? `请输入${config.label}`"
    :disabled="disabled"
    :rows="4"
    v-bind="config.props"
    @update:value="handleUpdate"
  />

  <!-- 数字输入 -->
  <a-input-number
    v-else-if="config.type === 'number'"
    class="workspace-form-control"
    :value="modelValue"
    :disabled="disabled"
    :controls="true"
    style="width: 100%"
    v-bind="config.props"
    :placeholder="config.placeholder ?? `请输入${config.label}`"
    @update:value="handleUpdate"
  />

  <!-- 下拉选择 -->
  <a-select
    v-else-if="config.type === 'select'"
    class="workspace-form-control"
    :value="modelValue"
    :options="config.options ?? []"
    :placeholder="config.placeholder ?? `请选择${config.label}`"
    :disabled="disabled"
    allow-clear
    style="width: 100%"
    v-bind="getComponentProps(config)"
    :classes="getPopupClasses(config)"
    @update:value="handleUpdate"
  />

  <!-- 树选择器 -->
  <a-tree-select
    v-else-if="config.type === 'tree-select'"
    class="workspace-form-control"
    :value="modelValue"
    :tree-data="config.treeData ?? config.props?.treeData ?? []"
    :placeholder="config.placeholder ?? `请选择${config.label}`"
    :disabled="disabled"
    allow-clear
    style="width: 100%"
    v-bind="getComponentProps(config)"
    :classes="getPopupClasses(config)"
    @update:value="handleUpdate"
    @clear="handleTreeSelectClear"
  />

  <!-- 日期选择 -->
  <a-date-picker
    v-else-if="config.type === 'date'"
    class="workspace-form-control"
    :value="modelValue"
    :placeholder="config.placeholder ?? `请选择${config.label}`"
    :disabled="disabled"
    style="width: 100%"
    value-format="YYYY-MM-DD"
    v-bind="getComponentProps(config)"
    :classes="getPopupClasses(config)"
    @update:value="handleUpdate"
  />

  <!-- 日期范围选择 -->
  <a-range-picker
    v-else-if="config.type === 'daterange'"
    class="workspace-form-control"
    :value="modelValue"
    :placeholder="['开始日期', '结束日期']"
    :disabled="disabled"
    style="width: 100%"
    separator="至"
    value-format="YYYY-MM-DD"
    v-bind="getComponentProps(config)"
    :classes="getPopupClasses(config)"
    @update:value="handleUpdate"
  />

  <!-- 开关 -->
  <a-switch
    v-else-if="config.type === 'switch'"
    class="workspace-form-control"
    :checked="modelValue"
    :disabled="disabled"
    v-bind="config.props"
    @update:checked="handleUpdate"
  />

  <!-- 单选组 -->
  <a-radio-group
    v-else-if="config.type === 'radio'"
    class="workspace-form-control"
    :value="modelValue"
    :disabled="disabled"
    v-bind="config.props"
    @update:value="handleUpdate"
  >
    <a-radio
      v-for="opt in config.options ?? []"
      :key="opt.value"
      :value="opt.value"
      :disabled="opt.disabled"
    >
      {{ opt.label }}
    </a-radio>
  </a-radio-group>

  <!-- 文件上传 -->
  <a-upload
    v-else-if="config.type === 'upload'"
    class="workspace-form-control"
    :file-list="normalizeFileList(modelValue)"
    :disabled="disabled"
    v-bind="config.props"
    @change="handleUploadChange"
    @remove="handleRemove"
  >
    <a-button type="primary" :disabled="disabled">点击上传</a-button>
  </a-upload>

  <template v-else-if="config.type === 'custom'">
    <component
      :is="config.component"
      class="workspace-form-control"
      :model-value="modelValue"
      :disabled="disabled"
      v-bind="getCustomComponentProps(config)"
      @update:model-value="handleUpdate"
    />
  </template>
</template>
