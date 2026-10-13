# 个人 Agent Skills

存放和维护个人使用的 agent skills。每个 skill 独立成目录，以 `SKILL.md` 描述适用场景和执行指引。

## 目录结构

```text
.
├── skills/                      # 正式 skills，每个 skill 一个子目录
│   └── vue-crud-list-page/
│       ├── SKILL.md              # Vue 配置驱动列表管理页的执行指引
│       ├── references/
│       │   ├── implementation.md # 实现分析、接口契约和已知限制
│       │   └── integration.md    # 页面接入示例与接口适配方法
│       └── assets/
│           └── CrudListPage/     # 六个 Vue / TypeScript 组件源码文件
├── templates/
│   └── SKILL.md.template        # 新建 skill 的起点，不作为正式 skill 加载
├── AGENTS.md                    # 仓库维护与 UI 文案规范
└── LICENSE                      # MIT 许可证
```

## 技能列表

| 技能 | 用途 | 参考资料 |
| --- | --- | --- |
| [vue-crud-list-page](skills/vue-crud-list-page/SKILL.md) | 在 Vue 3 + TypeScript 项目中接入或配置包含搜索、表格、分页和增删改表单的列表管理页 | [实现说明](skills/vue-crud-list-page/references/implementation.md) · [接入示例](skills/vue-crud-list-page/references/integration.md) |

`vue-crud-list-page` 附带的 [CrudListPage 源码](skills/vue-crud-list-page/assets/CrudListPage/) 是迁移参考快照，使用 `antdv-next`、`@antdv-next/icons` 和 SCSS。接入应用时需按目标项目处理导入、UI 上下文、布局和接口适配，详细限制见实现说明。

## 新建 skill

在仓库根目录执行以下 PowerShell 命令，将 `your-skill-name` 换成实际名称：

```powershell
$skillName = "your-skill-name"
New-Item -ItemType Directory -Path "skills/$skillName" -ErrorAction Stop
Copy-Item -LiteralPath "templates/SKILL.md.template" -Destination "skills/$skillName/SKILL.md" -ErrorAction Stop
```

编辑新建的 `SKILL.md`，替换所有 `{{...}}` 标记并补全实际指引：

- `name` 与目录名一致，使用小写字母、数字和连字符，少于 64 个字符。
- `description` 说明技能做什么，以及什么请求应触发它。
- 正文写明任务需要的上下文、执行方法和完成标准；避免重复 agent 已有的通用能力。
- 需要脚本、参考资料或输出资源时再添加对应目录，并在正文中说明何时使用。

每个 skill 必须有 `SKILL.md`；`agents/`、`scripts/`、`references/` 和 `assets/` 均为可选。新增或调整 skill 后，同步更新上面的目录结构和技能列表。

## 使用 skill

将所需的单个 skill 目录复制或链接到目标 agent 支持的 skills 目录，具体位置和加载方式以该 agent 的说明为准。此仓库本身不执行安装，也不修改本机 agent 配置。

分发时保留 skill 的完整目录，以免脚本、资料或资源链接失效。

例如，加载 `vue-crud-list-page` 后，可提出这样的任务：

```text
请使用 vue-crud-list-page 技能，为现有 Vue 3 + TypeScript 项目接入用户管理页，
包含姓名搜索、分页、新增、编辑和删除，并沿用项目已有的 API 和 UI 配置。
```

## 提交前检查

- 确认名称、触发条件和正文一致，清理正式 skills 中未替换的模板标记。
- 检查引用路径，实际运行新增或修改的脚本。
- 如目标 agent 提供校验工具，执行相应校验。
- 检查用户可见文案，遵守 [AGENTS.md](AGENTS.md) 中的规范。
- 不提交密钥、令牌、私人数据或本地环境文件；示例使用脱敏数据。

## 许可证

本仓库使用 [MIT 许可证](LICENSE)。引入第三方资源时，保留其必要的授权和署名信息。
