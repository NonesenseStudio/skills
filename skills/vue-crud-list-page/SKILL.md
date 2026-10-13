---
name: vue-crud-list-page
description: Implement or reuse configuration-driven CRUD list pages in Vue 3 + TypeScript projects, combining search, data tables, and dynamic form dialogs while adapting to the project's API and UI library. Use for configuring CRUD pages, extending form controls, or adding row actions; not for non-Vue projects or display pages without list management.
---

# Vue Configuration-Driven CRUD List Pages

Describe search fields, form fields, and table columns through configuration. Use a page container to coordinate queries, pagination, add/edit dialogs, and delete confirmation. Keep business requests and data transformations in the consuming page rather than shared controls.

This skill calls the shared page component `CrudListPage`. The bundled source is a snapshot of `DPage` from `D:\project\AirWater\AirWater-UI\src\components\DPage`; `DPage` is the component name in the source project. The snapshot is a portable migration reference, not a standalone component library with every edge case resolved. Its original Chinese UI strings and source comments are retained; English documentation does not change the target application's language.

## Choose Resources

- To understand responsibilities, actual interfaces, and known limitations, read [references/implementation.md](references/implementation.md).
- To configure a business page or adapt a different backend, read [references/integration.md](references/integration.md).
- If the target project has no CrudListPage and this implementation has been chosen, reference or copy the six source files in `assets/CrudListPage/`. The table uses the UI library's built-in empty state by default. Add project-specific images only when a branded design is explicitly required.
- If the target project already has a component with this name, inspect its source and consuming pages first. Integrate with its existing contract rather than overwriting it or assuming it matches the snapshot.

## Integration Decisions

Inspect the target project's Vue, TypeScript, UI library, auto-imports, path aliases, API wrappers, page height constraints, and notification services. Preserve its existing conventions.

The snapshot uses `antdv-next`, `@antdv-next/icons`, and SCSS. It does not directly depend on Axios, Pinia, Vue Router, or Day.js; do not install unrelated source-project dependencies just to use CrudListPage. For another UI library, preserve responsibilities and data contracts while adapting controls, slots, validation, and styles. Replacing package imports alone is insufficient. Consult official API documentation matching the version installed in the target project.

Handle these dependencies when migrating the source:

1. Vue runtime functions rely on auto-imports in the snapshot. Reuse the target project's auto-imports where they cover those functions; otherwise add the Vue imports each file needs. UI components also require a resolver or explicit registration/imports.
2. `App.useApp()` requires an ancestor Antdv Next App context. Reuse existing ConfigProvider, locale, and theme settings, or adapt to the target project's notification and confirmation services.
3. Styles include `workspace-*` classes, `--ant-*` CSS variables, and selectors targeting UI-library internals. Check actual styles and DOM in the target environment rather than copying the source project's global styles, theme, or layout to mask dependencies.
4. The container uses a flex layout with constrained height. Ancestors must provide usable height; retain `min-height: 0` / `min-width: 0` along the flex chain and keep pagination outside the scrolling region.

## Component Responsibilities

| File | Responsibility |
| --- | --- |
| `index.vue` | Data requests, search parameters, pagination, dialog state, CRUD flows, slot forwarding, and ref methods |
| `SearchBar.vue` | Search inputs, defaults, collapsing, responsive grid, and search/reset events |
| `DataTable.vue` | Mapping configuration to UI-library columns, cells and row actions, external pagination, and overflow detection |
| `form/FormDialog.vue` | Add/edit initialization, validation, visibility, disabled state, and form submission |
| `form/FormItem.vue` | Mapping field types to controls, consistent value updates, and custom-component protocol |
| `types.ts` | Configuration types for search, forms, columns, action buttons, and custom components |

Business pages provide field configuration, APIs or adapters, business actions, and slots. Prefer `props`, column slots, and `type: 'custom'` for extensions. Consider adding shared configuration only when multiple pages need the capability.

## Request and Interaction Contracts

- Paginated queries consume `{ data: { records, total } }` with parameters `{ ...searchParams, pageNum, pageSize }`; non-paginated queries consume `{ data: rows }`. Convert other formats in an API adapter or `fetchData`.
- Default writes call `api.create(data)` / `api.update(data.id, data)`; details call `api.detail(row[idField])`; deletion calls `api.delete(value)` with the exact argument passed to `handleDelete`. Adapt different primary keys or delete signatures with custom methods.
- Configure action columns and callbacks explicitly in `columns`. CrudListPage does not add edit/delete buttons automatically.
- The snapshot emits `search` and `page-change` externally. It declares `submit` and `delete` but never emits them. Handle business requests through `addMethod` / `editMethod` / `deleteMethod`, not those unimplemented events.
- The parent supplies `formLoading`; internal CRUD loading is not connected to the submit button. To prevent duplicate submissions, maintain this prop in custom save methods, or add separate saving state when component modification is authorized.
- `setSearchParams` merges parameters and refreshes asynchronously. It neither resets the page nor updates search controls. Implement replacement, pagination reset, or control synchronization explicitly when needed.

See the implementation reference for detailed boundaries. Source defects are not requirements for new projects. Distinguish compatibility migration from fixes, and limit changes in existing projects to the current task.

## Field and Column Extensions

- Search and forms share FormItem. Built-in controls use the underlying UI library's value binding and emit a consistent `update:modelValue` event upward.
- Custom fields accept `modelValue` and `disabled`, and emit `update:modelValue`. Set `passFormData: true` when they need sibling fields. Follow the target project's conventions for reactive component objects, using `markRaw` when necessary.
- Forms support dotted paths, `visible(data, { isEdit })`, `disabled`, `disableOnEdit`, `required`, and custom `rules`. Check hidden-field values and validation, as well as UI-library binding for nested paths, against target requirements.
- Prefer named cell slots receiving `{ row }`. Use `formatter` for text and `render` for lightweight rendering; keep rendering functions free of side effects.
- Selection currently enables UI-library checkboxes without exposing selected rows to the parent. Sorting only sets `sorter: true`, with no sort-parameter flow. `expand` configuration does not generate expanded content. Define and implement the missing contracts for bulk actions, remote sorting, or detail expansion.

## UI Copy and Delivery

Use concrete business objects and actions in visible text, such as "Add user", "Save", and "Delete", in the target application's language. Do not render implementation terms such as eyebrow, kicker, or placeholder as UI copy, or add abstract headings and repeated descriptions without business meaning. This does not require renaming internal classes, API fields, or legitimate business terms.

Validate according to the target project's conventions and the scope of changes. For skill-documentation changes alone, check structure, references, and the diff without running an application build or browser. For component migration or interaction changes, run appropriate type/build checks and verify queries, pagination, and the affected form interactions on an existing page.

Report file locations, integration approach, completed checks, and any unconfirmed interfaces or copy. Do not claim runtime validation that has not been performed.
