# Implementation and Actual Contracts

Source component directory: `D:\project\AirWater\AirWater-UI\src\components\DPage`. The original analysis also covered AirWater-UI's Vite auto-import configuration, application App context, request wrapper, and consuming user, role, and vessel list pages. The original component is named `DPage`; this skill calls this shared component `CrudListPage`. The source snapshot was created on 2026-10-13. The behavior below describes that snapshot; versions in target projects may differ. Original Chinese UI strings and source comments remain in the bundled files; their meanings are described in English here.

## 1. Architecture

`CrudListPage` is a page container that owns request flows. Search and forms use configuration arrays and share a field renderer. Table configuration becomes Antdv Next `columns`, rendered through branches in `bodyCell`. Configuration callbacks extend business behavior, while slots support complex UI.

```text
Business page: API/adapters + searchItems + formItems + columns + slots
  └─ CrudListPage: queries, pagination, CRUD, and dialog state
       ├─ Optional aside / header / toolbar slots
       ├─ SearchBar → FormItem
       ├─ DataTable → columns + bodyCell + separate Pagination
       └─ FormDialog → FormItem
```

Internal state includes `tableData`, `pager`, `searchParams`, table `loading`, `dialogVisible`, `editingRow`, and `addInitialValues`. Pagination starts at page 1 with 20 rows per page. The component queries on mount; it does not watch changes to `api`, `fetchData`, or `pagination` to trigger another query.

## 2. CrudListPage Props

| Configuration | Actual behavior / default |
| --- | --- |
| `columns` | Required; passed unchanged to DataTable without an injected action column |
| `api` | Required in the type declaration as `any`; provide methods only for operations actually used |
| `searchItems` | Defaults to `[]`; search is shown only when nonempty |
| `formItems` | Defaults to `[]`; a nonempty list mounts FormDialog and allows the Add button |
| `addTitle` / `editTitle` | Default to Chinese labels meaning Add / Edit; affect dialog titles only |
| `formDialogWidth` | Explicit width; computed by FormDialog when omitted |
| `formLoading` | Defaults to false; controls submit-button loading only |
| `pagination` | Defaults to true; determines page/list request and response formats |
| `defaultExpandAll` | Defaults to false; controls tree-row expansion |
| `fetchData` | Replaces the table query method, not response unwrapping |
| `addMethod(data)` / `editMethod(data)` | Replace create and update requests |
| `deleteMethod(value)` | Replaces deletion; receives the exact argument passed to handleDelete |
| `detailMethod(id, row)` | Replaces the detail request and can use the full original row |
| `showAdd` / `showRefresh` | Default to true; Add still requires nonempty formItems |
| `hasSider` / `siderWidth` | Default to false / 240; control the aside region |
| `idField` | Defaults to `id`; used only to extract the key for detail requests |

The `loading`, `total`, and `pageSize` entries in `withDefaults` have no corresponding page-component prop declarations or controlled data flow. Do not treat them as supported external APIs. DataTable has these props, but the page component supplies them from internal state.

## 3. Queries, Pagination, and Search

| Entry point | Behavior |
| --- | --- |
| Mount, `refresh()`, toolbar refresh | Query current parameters and page |
| SearchBar search | Replace searchParams, call DataTable.resetPage, emit page-change, and query; also emit search to the parent |
| SearchBar reset | Restore control defaultValue values but emit `{}` to the page component, so the query omits those defaults |
| Page-size change | Reset page to 1, store the new size, and query |
| Successful deletion | Call resetPage and query page 1 |
| Successful create/update | Close the dialog and query the current page |
| `setSearchParams(params)` | Shallow-merge filters and query the current page on nextTick; neither emit search nor synchronize SearchBar |

Paginated responses must be `{ data: { total: number, records: any[] } }`; non-paginated responses must be `{ data: any[] }`. Default calls are `api.page(params)` / `api.list(params)` respectively. Custom fetchData must return the same formats.

The source project's Axios response interceptor returns the business response body, so `res.data` in the component is business data. An AxiosResponse that has not been unwrapped may introduce another `data` layer. Adapt at the boundary rather than inferring the format from the request library's TypeScript types alone.

SearchBar behavior:

- Supports input, select, date, daterange, number, and custom. The field is a flat key, with no dotted-path access.
- Rebuilds input data when the items reference changes. Initializing defaultValue does not emit search, so the initial automatic query does not apply search defaults.
- Filters out only `undefined`, `null`, and empty strings; preserves 0, false, and empty arrays.
- Collapsing hides controls only; hidden fields still participate in search. Fields with `collapsible: true` are collapsed by default.
- Uses a 24-column grid: one field per row at xs, two at sm, three at md, and four at lg/xl. Buttons occupy the remaining space in the last row or start a new row when it is full.

Query failures clear data and total. The custom fetchData branch also resets internal pagination to 1/20; the default API branch does not. Error messages rely on the caller or a global interceptor. Stale responses from concurrent queries are not handled. Add request sequencing or cancellation when the task requires rapid successive filtering.

## 4. Create, Edit, and Delete

`openAddDialog(initialValues = {})` clears editingRow, shallow-copies initial values, and opens the dialog. Initial values match the exact configured `item.field` key and override defaultValue. For a dotted field such as `user.name`, pass `{ 'user.name': 'Alex' }`; nested `initialValues.user.name` is not read.

The snapshot's Add button uses `@click="openAddDialog"`, which may pass the click event as initialValues. During migration, a call without arguments avoids depending on enumerable event properties; passing an event is not a business-prefill protocol.

`openEditDialog(row)` extracts `row[idField]`, calls the detail method, and uses `res?.data ?? res` as editing data. On failure it still opens the dialog using row data. Confirm whether partial row data is sufficient for editing in the business context.

FormDialog validates and emits submit to the page component, which performs the request internally. Default calls are `api.create(data)` for creation and `api.update(data.id, data)` for editing. Success shows a message, closes the dialog, and refreshes; failure keeps the dialog open. `idField` does not change the key used by update.

`handleDelete(value)` opens confirmation, then calls `deleteMethod(value)` or `api.delete(value)`, shows a message, and resets pagination. It can receive a row or an ID depending on the API signature. The source project's user and role pages pass string IDs. Do not describe the default behavior as automatically extracting `row.id`.

## 5. Public Events, Methods, and Slots

| Category | Actual capability |
| --- | --- |
| External events | `search(params)`, `page-change(page, pageSize)`; the component handles querying as part of both flows |
| Declared-only events | `submit(data, isEdit, originalRow)`, `delete(row)`; neither has an emit call |
| Ref methods | `closeDialog()`, `openAddDialog(initialValues?)`, asynchronous `openEditDialog(row)`, `refresh()`, `handleDelete(value)`, `setSearchParams(params)` |
| Page slots | `aside` (requires hasSider), `header`, `toolbar-left`, `toolbar-right` |
| Column slots | Set `column.slot` to forward the matching named slot dynamically, with `{ row }` |
| Action slot | `action`, rendered only inside a configured action column, with `{ row }` |

Avoid requesting the same table data again in search/page-change listeners. Change request parameters in an API/fetchData adapter; notification events are not awaitable request interceptors.

## 6. Form Initialization and Control Protocol

FormDialog determines edit mode from whether data is nonempty. It recursively copies arrays and objects, targeting plain JSON data rather than preserving Date, Map, or class-instance prototypes. Edit mode copies all detail data, including unconfigured fields. Existing configured values take precedence; only `undefined` falls back to defaultValue, while explicit null is preserved.

`getValueByPath` / `setValueByPath` support nested objects through dotted paths, not array-path parsing. Validation rules use `rules[item.field]`, while form items use the string `name=item.field`. Nested value binding and validation paths may differ. Verify them during migration or use the target library's supported NamePath format.

Opening the dialog rebuilds data and clears validation. Deep changes to edit data also rebuild it; changes to items do not directly rebuild form data. Visible-field changes clear validation, but rules are built for all configured fields. Do not assume hidden required fields always skip validation.

Nonempty custom rules take precedence over required. Generated required messages use a Chinese string meaning "[Field label] cannot be empty". input/textarea use blur; other types use change. An omitted type renders input but still uses change for its generated rule.

Submission validates, shallow-copies formData, sets currently hidden fields to undefined, and emits. JSON serialization normally omits undefined; it is not equivalent to null for clearing backend fields. Because the copy is shallow, clearing a nested hidden field may mutate the same nested object in the current form.

`disabled`, or `disableOnEdit` in edit mode, disables controls. `passFormData` passes current form data only to custom components; a same-named entry in forwarded props can override it.

| Control type | Emitted value |
| --- | --- |
| input / textarea / number / select / radio | Underlying control value |
| tree-select | value; clear explicitly emits null |
| date / daterange | Default value-format is YYYY-MM-DD, overridable through props |
| switch | checked, normally boolean; adapt other business encodings |
| upload | Primarily a URL or undefined, not a multi-file list model |
| custom | modelValue / update:modelValue; also receives disabled and props |

Upload display converts URLs into completed UploadFile arrays. On completion, it resolves the value from `response.data[urlField]`, `response.data`, then `file.url`; urlField defaults to `url`. Multiple files, complex responses, and non-URL data need custom conversion. Do not assume any upload service works directly.

With up to 9 visible fields, the default span is 24 and dialog width is 640. With 10–18 fields, span is 12 and width is 800; more fields use width 920. Explicit span/width take precedence. The type comment claiming a default span of 12 differs from the implementation. `layout: section/wide` changes label/control layout styles without automatically setting span=24; configure span explicitly for a full-width field.

## 7. Table Implementation

- `tableColumns` maps prop→dataIndex and label→title, preserving the original configuration in `__config` for bodyCell.
- Rendering precedence is index → action → slot → render → formatter → original text.
- Row numbering uses the current page's index+1, not a cumulative index across pages.
- `showOverflowTooltip` maps to ellipsis and defaults to true; there is no separate custom Tooltip branch.
- `sortable` sets sorter=true without handling sort changes or backend sort parameters. Sorting is not fully implemented.
- selection/expand configurations are filtered out of ordinary columns. selection creates only an empty rowSelection configuration with no selection-result event; expand provides no expandedRowRender content.
- row-key is fixed to `id`, and tree expansion keys also use id. children in the data define tree nodes. Custom idField does not affect these locations.
- When defaultExpandAll is true, data is traversed recursively to build controlled expandedRowKeys. Data or flag changes reset expansion state.
- actions and dropdownActions are filtered per row using show booleans/functions. Clicks only call onClick(row). show controls UI visibility and cannot replace backend authorization.
- `alwaysShowDropdown` retains a disabled entry when no actions are available. The dropdown button text is configurable.
- render may run multiple times for the same row in the template; keep it free of side effects. Prefer slots for complex VNode/component results and verify them against the actual UI library.

Overflow detection compares table content height with container height minus pagination height. Only overflow sets scroll.y=100%. It watches data, loading, columns, and ResizeObserver, batches detection through nextTick, and disconnects the observer on unmount. Horizontal scrolling uses scroll.x=max-content. Pagination is separate from a-table and stays at the bottom of the container.

AirWater-UI's original DataTable used its own `data-empty.svg` and an explicit Chinese "No data" message. The bundled generic source removes that branded resource and renders the UI library's built-in Empty component so the illustration and description follow the target project's library and locale. Add target-project assets only when the business explicitly requires a branded empty state.

## 8. Layout and Style Boundaries During Migration

CrudListPage→main content→table card→card body→DataTable→internal table container forms a flex chain. `overflow: hidden` and `min-height: 0` prevent content from stretching ancestors. Without usable ancestor height, height:100% and internal scrolling cannot solve the layout alone.

FormDialog uses non-scoped styles to override `.form-dialog .ant-modal` and `.ant-modal-container` in the portal. The header/footer stay fixed, the body scrolls within a height limit, and narrow screens use one column. These class names are implementation details of the current UI library; check them again when switching libraries or upgrading.

`workspace-*` classes are internal style hooks, not UI copy. Do not display them to users or rename them mechanically because of the word itself. Preserve the target project's design system; migration does not include AirWater routing, authentication, global themes, or business APIs.
