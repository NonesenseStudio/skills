/**
 * CrudListPage 组件类型定义
 * 包含搜索栏、表单、表格所需的配置接口
 */
import type { TreeDataNode } from "antdv-next";

/** 下拉 / 单选选项 */
export interface SelectOption {
  /** 显示文本 */
  label: string;
  /** 实际值 */
  value: any;
  /** 是否禁用 */
  disabled?: boolean;
}

/** TreeSelect 使用的树节点数据。默认字段为 title / value / children。 */
export type TreeSelectDataNode = TreeDataNode;

/** FormItem 支持的所有组件类型 */
export type FormItemType =
  | "input"
  | "textarea"
  | "number"
  | "select"
  | "tree-select"
  | "date"
  | "daterange"
  | "switch"
  | "radio"
  | "upload"
  | "custom"; // 自定义组件类型

/** 搜索栏字段配置 */
export interface SearchItemConfig {
  /** 字段名，作为搜索参数的 key */
  field: string;
  /** 显示标签 */
  label: string;
  /** 组件类型，默认为 input */
  type?: Extract<
    FormItemType,
    "input" | "select" | "date" | "daterange" | "number" | "custom"
  >;
  /** 占位符 */
  placeholder?: string;
  /** select 类型的选项列表 */
  options?: SelectOption[];
  /**
   * 是否为可折叠项
   * 折叠时隐藏，点击"展开"后显示
   */
  collapsible?: boolean;
  /** 默认值 */
  defaultValue?: any;
  /** 透传给底层 Antdv Next 组件的额外属性 */
  props?: Record<string, any>;
  /** 自定义组件（仅当 type 为 'custom' 时有效） */
  component?: CustomComponentType;
}

/** 表单字段配置 */
export interface FormItemConfig {
  /** 字段名，支持点路径，例如 user.name */
  field: string;
  /** 显示标签 */
  label: string;
  /** 组件类型，默认为 input */
  type?: FormItemType;
  /** 占位符 */
  placeholder?: string;
  /** 标签旁的提示文本，配置后显示问号图标 */
  tooltip?: string;
  /** select / radio 类型的选项列表 */
  options?: SelectOption[] | undefined | null;
  /** tree-select 类型的树节点数据 */
  treeData?: TreeSelectDataNode[] | undefined | null;
  /** 默认值（新增时使用） */
  defaultValue?: any;
  /** 是否必填，为 true 时自动生成必填校验规则 */
  required?: boolean;
  /** 字段是否显示；支持布尔值或根据当前表单数据动态判断 */
  visible?:
    | boolean
    | ((
        formData: Record<string, any>,
        context: { isEdit: boolean },
      ) => boolean);
  /** Antdv Next 表单校验规则（优先级高于 required） */
  rules?: any[];
  /** 栅格宽度，范围 1-24，默认 12（每行两列） */
  span?: number;
  /** 表单项布局。section 为独立分区标题，wide 保持整行宽度并对齐两列控件。 */
  layout?: "default" | "section" | "wide";
  /** 透传给底层 Antdv Next 组件的额外属性 */
  props?: Record<string, any>;
  /** 是否始终禁用 */
  disabled?: boolean;
  /** 编辑模式下是否禁用（如 ID 字段） */
  disableOnEdit?: boolean;
  /** 是否将当前整份表单数据传给自定义组件 */
  passFormData?: boolean;
  /** 自定义组件（仅当 type 为 'custom' 时有效） */
  component?: CustomComponentType;
}

import type { VNode, Component, ComponentPublicInstance } from "vue";

/** 自定义组件类型 */
export type CustomComponentType = Component | ComponentPublicInstance | string;

/** 操作按钮配置 */
export interface ActionButtonConfig {
  /** 按钮文本 */
  label: string;
  /** 按钮类型 */
  type?: "primary" | "success" | "warning" | "danger" | "info";
  /** 点击回调 */
  onClick?: (row: any) => void;
  /** 是否显示（可用于权限控制等） */
  show?: boolean | ((row: any) => boolean);
  /** 自定义类名 */
  className?: string;
}

/** 表格列配置 */
export interface ColumnConfig {
  /** 字段名（type 为特殊列时可省略） */
  prop?: string;
  /** 列标题 */
  label: string;
  /** 固定列宽 */
  width?: string | number;
  /** 最小列宽 */
  minWidth?: number;
  /** 固定列位置 */
  fixed?: boolean | "left" | "right";
  /** 是否可排序 */
  sortable?: boolean;
  /** 内容格式化函数 */
  formatter?: (row: any, col: any, value: any) => string;
  /**
   * 单元格内容渲染函数
   * 返回值可以是字符串、VNode 或组件选项
   */
  render?: (row: any) => string | VNode | Component | null;
  /**
   * 具名插槽名称
   * 设置后该列使用父组件提供的同名插槽渲染内容，插槽参数为 { row }
   */
  slot?: string;
  /** 特殊列类型：序号列、复选框列、展开列、操作列 */
  type?: "index" | "selection" | "expand" | "action";
  /** 文本对齐方式 */
  align?: "left" | "center" | "right";
  /** 内容超出时显示 tooltip */
  showOverflowTooltip?: boolean;
  /** 操作按钮配置（仅当 type 为 'action' 时有效） */
  actions?: ActionButtonConfig[];
  /** 下拉菜单操作按钮配置（用于操作按钮过多的场景） */
  dropdownActions?: ActionButtonConfig[];
  /** 下拉菜单按钮文本，默认为"更多" */
  dropdownText?: string;
  /** 即使当前行没有可见菜单项，也保留禁用的下拉入口以对齐操作列 */
  alwaysShowDropdown?: boolean;
}
