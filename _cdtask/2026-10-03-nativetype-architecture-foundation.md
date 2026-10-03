---
task_contract: "cdf-cdtask/v1"
handoff_type: "approved-tasking"
status: "tasking_ready"
source: "cdf"
approval_state: "approved"
risk_level: "Level XL"
workspace: "/Volumes/Development/Workspace/NativeType"
source_branch: "main"
source_commit: "d31acb73ae50c3070d69a0ea229f57f0b61cabe6"
source_worktree_state: "clean"
source_worktree_changes: []
save_drift_preflight: "non-material-drift"
save_drift_notes: "原审批的未提交内容已提交为 d31acb7；相关文件 SHA-256 与审批基线一致，工作区 clean，计划含义未变化。"
scope_lock_sha256: "d6a37e88af14692932ba70c830f8d849a552606b847e3ab4635bfc03b6cdc9b7"
approval_record_sha256: "fffb68d9e63482db634bda27a6ad6bc85bd3a90c207f79675a1b4d15f01f2ff5"
created_at: "2026-10-03T07:23:36+08:00"
---

# NativeType v0.1 Architecture Foundation

## CDF Resume Contract
- Resume Path: CDF only
- Task Contract: cdf-cdtask/v1
- Canonical Scope Lock: cdf-scope/v1
- Saved Definition State: tasking_ready
- Execution Authorized by This Document: No
- Saved Approval Meaning: approved scope and Save as Task persistence authorization only
- Source Workspace: /Volumes/Development/Workspace/NativeType
- Source Branch: main
- Source Commit: d31acb73ae50c3070d69a0ea229f57f0b61cabe6
- Source Worktree State: clean
- Source Worktree Changes: []
- Save Drift Preflight: non-material-drift
- Save Drift Notes: 原审批的未提交内容已提交为 d31acb7；相关文件 SHA-256 与审批基线一致，工作区 clean，计划含义未变化。
- Scope Lock SHA-256: d6a37e88af14692932ba70c830f8d849a552606b847e3ab4635bfc03b6cdc9b7
- Approval Record SHA-256: fffb68d9e63482db634bda27a6ad6bc85bd3a90c207f79675a1b4d15f01f2ff5
- Execution Progress Path: /Volumes/Development/Workspace/NativeType/_cdtask/2026-10-03-nativetype-architecture-foundation.md.progress.yaml
- Execution Progress Created By Save: No

## Approval Summary

````text
我已阅读 [_docs/02-NativeType-Architecture Foundation.md](/Volumes/Development/Workspace/NativeType/_docs/02-NativeType-Architecture%20Foundation.md) 并核对现有代码。以下是准备交给 **Grok Build** 的计划；目前尚未开始架构改动。

### 需求理解

本阶段建立 PlatformAdapter、TranslationProvider、LanguagePair 和 Core 边界，同时保持现有 **X + 中文→英文 + Chrome Translator** 的用户行为。阶段完成边界是现有流程通过验证；其他平台、翻译服务、语言选择和新产品功能均留待以后。

### 技术方案

- 将 X 的编辑器识别、文本读取、局部观察、已验证的 Replace 流程及预览布局所需的 X 特定信息集中到 `platforms/x.ts`。使用简单静态 registry，不引入插件系统。
- 将现有翻译服务迁到 Chrome provider，保留首次启用、下载进度、实例复用、取消和错误行为；将 `zh → en` 及中文输入判断放入语言配置。
- 将焦点、IME、debounce、过期请求保护、Retry 和 Replace 协调移入 controller 与轻量 session；`content.ts` 只负责启动和清理。Overlay 保持独立；没有复用需求的代码不强行抽成 `generic.ts`。

### 实施步骤

1. 先迁移并接通模块边界，再删除已被替代的 `lib` 文件；保留当前 Replace 算法、翻译单位和预览交互。
2. 调整现有测试的导入与覆盖，补齐 Core、X 生命周期及 provider 边界检查；更新简短架构文档和 README 中过时的模块路径。
3. 执行冻结安装、typecheck、现有及新增测试、构建和本地浏览器回归；核对 manifest 仍只覆盖 `https://x.com/*` 且无新增权限。尝试真实 X 的 New Post、Reply、Quote Post、IME、Replace 后继续编辑和按钮状态验证；无法完成的项目明确列为待人工验证，不记为 PASS。

### 风险与回退

这是跨模块的架构迁移，按 **CDF Level XL** 管理。当前工作区已有未提交的 v0.0.2 cleanup 和已暂存的文档改动，Grok Build 必须以当前内容为基线，不重置它们。计划不修改依赖、版本号或 host 权限；真实 X 验证不实际发布帖子或回复。若迁移需要改变产品行为或扩大这些边界，先停止并重新规划。回退时只撤销本阶段的迁移，保留现有未提交改动。

**CDF 技能要求用户先明确批准已展示的计划和执行方式，才能修改代码或交由 Grok Build 执行。请回复“批准上述计划，由 Grok Build 立即执行”；如需调整范围，也请直接指出。**
````

## Development Plan

### Requirement Understanding

本阶段完成已批准的内部架构迁移，保留 X + 中文→英文 + Chrome Translator 的既有行为。未来平台、语言及 provider 能力只建立薄边界，不实现新产品能力。以原审批内容为准；保存请求只改变当前动作，不增加实现范围。

### Evidence Summary

- Fact：工作区为 /Volumes/Development/Workspace/NativeType；当前 main，提交 d31acb73ae50c3070d69a0ea229f57f0b61cabe6，保存前工作区 clean，相关变更数组 []。
- Fact：原审批基线为 58e457245abd852b1e14ff5b157d01e5092d9244 加已检查的未提交 cleanup 和需求文档。新提交标题为 v0.0.2 cleanup；下列已记录内容摘要均与审批基线一致。提交与 clean 状态变化属于非实质性漂移，不改变计划。
- Fact：content.ts 承担完整 orchestration；lib/editable.ts 包含 X selector、读取及已验证的粘贴替换；lib/translator.ts 封装 Chrome 生命周期；lib/overlay.ts 仍有 X 特定布局定位信息。
- Fact：现有命令为 pnpm install --frozen-lockfile、pnpm typecheck、node --test tests/translator.test.mjs、pnpm build；浏览器 fixture 为 tests/browser.html。
- Inference：迁移必须同时保留用户激活时序、过期请求保护及 X 预览布局边界，不能仅移动文件名。
- Assumption / gap：本轮未验证真实 Chrome/X 会话可用性；无法完成时必须报告待人工验证。Grok Build MCP 工具当前会话不可用，保存文档不代表已分配或启动执行。
- Read-only dependencies：package.json、pnpm-lock.yaml、tsconfig.json、wxt.config.ts、.github/workflows/ci.yml、需求文档及历史验证记录参与漂移检查，不因此获得写权限。
- Content baseline（SHA-256，实际计算；删除的 __cd-task 文件保持删除）：

| Path | SHA-256 |
|---|---|
| `entrypoints/content.ts` | `84378a368df025bc6adc3062624e7d378af5b3a8d6244169640d75e78f193226` |
| `lib/editable.ts` | `11e3e057e244c9aabb46dd5e0428f38fc4f7e7b35b65d0912959a1ba180f0623` |
| `lib/translator.ts` | `1e8972615656773a52887e6f2f73eeeacc600c74a923d1781a3c49f17133f3b2` |
| `lib/overlay.ts` | `5f458513797758b15f274534530ffc32b8ead74fe03177b2c31404c099f2d06c` |
| `wxt.config.ts` | `66aa555dc7213f783d7b4c99795241ddbcf91e3f2d76032c3ab3a8584748ae80` |
| `package.json` | `1259461fbb50e69a1333a92edd372b23c219df34a7056a498edf4e42e59319b1` |
| `tsconfig.json` | `2bea7c45c026541ece36273df7760f84ad9fa9c1e0a2935eef34e7a79e5dd836` |
| `pnpm-lock.yaml` | `95aa4cb24abfccc568509683de50ff37d6754790c6a9c7ce705d37b74cc86c3b` |
| `tests/translator.test.mjs` | `e4dbe68dd5b89270666d47b3bfd9d4291029c9aa0917e7cd9645a7557f94f435` |
| `tests/browser.html` | `934661b6c36272fb8c43f8dce9097a594dad59333e0eafff8602d299da76a7b4` |
| `README.md` | `d18c28ec2ae7262cc8559cc22ea0c168154a0d8168628f7a6d819896b3122fd5` |
| `VERIFICATION.md` | `5de75cec29a4d32fca5b59f18beb681847259ca884d715f6d30d14ed41dc7bbc` |
| `_docs/02-NativeType-Architecture Foundation.md` | `86c9be3a566b0e90f7830672104b335b6506876dc2c2e94a73543a1c4f769d2c` |
| `.gitignore` | `bfa42a0651933d9037c26fe4c8b10d26edde87b9a0af462e1a7f052f58ddb848` |
| `.github/workflows/ci.yml` | `c828dc68d589b7677f81890197a9c92b819d91adbaa25b6b7e3443bbe76e5de1` |
| `LICENSE` | `6c9181760cfb7c4ac47afb5c375afcf84562fb02820e2593b39d1e9b6da44470` |
| `_docs/01-NativeType-v0-original-prompt.md` | `293bc5db55f9ad3ac9aa9213f4b7c4e039c19f114c852b7609dcd0dc6fedc8e2` |

### Risk Gate Result

- Final Level: XL
- Dimensions: impact 为内部架构与既有编辑行为；blast radius 覆盖入口、平台、provider、UI 和测试；reversibility 为仅撤销本阶段迁移；uncertainty 在真实 X 外部编辑器验证；sensitivity 涉及当前草稿但不增加上传或权限；coordination 为同一仓库的模块迁移与浏览器验证。
- S Reverse Check: S-01 FAIL（多个目标）；S-02 FAIL（架构）；S-03 FAIL（状态与接口）；S-04 FAIL（跨模块验收）；S-05 FAIL（模块迁移）；S-06 FAIL（架构与外部集成）。
- Mandatory Signals: ESC-01 HIT（共享接口/UI）；ESC-02 HIT（IME、翻译状态）；ESC-03 HIT（编辑当前草稿，不增加持久化）；ESC-04 CLEAR（无账号或付费）；ESC-05 CLEAR（无遥测）；ESC-06 HIT（异步请求、事件、缓存复用）；ESC-07 HIT（现有文本与可访问预览行为需保留）；ESC-08 CLEAR（配置受保护）；ESC-09 HIT（X/Chrome 现有集成）；ESC-10 HIT（架构迁移）；ESC-11 CLEAR（代码边界已确认，真实浏览器限制已披露）；ESC-12 CLEAR（无未解决含义冲突）。
- M Reverse Check: M-01 FAIL（跨模块）；M-02 PASS（已检查当前调用与状态）；M-03 FAIL（架构决策）；M-04 FAIL（XL 架构边界）；M-05 PASS（仅回退迁移）；M-06 FAIL（架构风险下限为 XL）。
- Rationale: 架构迁移必须作为单独受控阶段；当前阶段不授权未来功能阶段。

### Scope Lock

```yaml
Scope-Lock-Version: cdf-scope/v1
in_scope:
  - "建立 X PlatformAdapter 和静态 registry，集中编辑器识别、文本读取、局部观察、已验证的 Replace 流程及预览布局所需的 X 特定信息。"
  - "建立 Chrome TranslationProvider 和静态 registry，将 zh→en 及中文输入判断放入语言配置，保留现有启用、下载、复用、取消和错误行为。"
  - "建立 controller 与轻量 session，迁移焦点、IME、debounce、过期请求保护、Retry 和 Replace 协调，使 content.ts 只负责启动与清理。"
  - "迁移并补齐现有测试和浏览器回归，执行构建与权限核对，尝试真实 X 验证并如实报告结果。"
  - "新增简短架构文档并更新 README 中过时的模块路径。"
out_of_scope:
  - "新增平台、翻译服务、语言选择、新产品功能、动态插件系统或无复用需求的 generic 抽象。"
  - "修改依赖、版本号或 host 权限。"
  - "实际发布帖子、回复或 Quote Post。"
non_goals: []
assumptions:
  - "以审批时的文件内容为迁移基线，保存前这些内容已原样提交为 d31acb73ae50c3070d69a0ea229f57f0b61cabe6。"
  - "真实 X 验证依赖可用的 Chrome 与 X 环境；无法完成的项目标记待人工验证，不能记为 PASS。"
stop_conditions:
  - "若必须改变产品行为、扩大批准边界或发现影响计划含义的仓库漂移，停止并返回 CDF 规划。"
will_change:
  - "platforms/、ui/ 及被迁移的 lib/editable.ts、lib/overlay.ts。"
  - "translators/、languages/ 及被迁移的 lib/translator.ts。"
  - "core/ 与 entrypoints/content.ts。"
  - "tests/ 中现有测试及 Core、X 生命周期、provider 边界检查。"
  - "ARCHITECTURE.md 与 README.md 的架构和模块路径说明。"
will_not_change:
  - "保留当前 Replace 算法、翻译单位、预览交互和 X 中文→英文产品行为。"
  - "保护现有 cleanup、需求文档与历史验证记录；不重置或覆盖既有工作。"
  - "保持现有依赖、版本号、host 范围和最小权限。"
acceptance_criteria:
  - "X 特定的编辑器与预览布局细节集中在 PlatformAdapter；Core 不依赖 X selector、Draft.js 或 Chrome Translator API 内部细节，content.ts 只负责启动和清理。"
  - "Chrome provider 与语言配置保留当前 X + zh→en + Chrome Translator 的启用、下载进度、实例复用、取消、错误、IME、debounce、过期请求保护、Retry、Replace 和预览交互行为。"
  - "活动编辑器的局部观察在切换、关闭及脚本失效时正确清理，不恢复 document.body 全子树监听。"
  - "使用简单静态平台和 provider registry；语言配置包含 zh→en 及中文输入判断，不新增产品能力或无需求的抽象。"
  - "冻结安装、typecheck、现有及新增测试、生产构建和本地浏览器回归通过，生产 manifest 仍只匹配 https://x.com/* 且没有新增权限。"
  - "真实 X 的 New Post、Reply、Quote Post、IME、Replace 后继续编辑和按钮状态给出实际验证结果；无法完成的项目明确待人工验证，不记为 PASS，验证不发布内容。"
  - "简短架构文档说明模块职责及未来扩展入口，README 的模块路径与迁移结果一致，已替代的 lib 文件和旧 import 被清理。"
```

### Technical Approach

使用普通 TypeScript interfaces、functions 和静态 registries。平台拥有 X 编辑器、observer、替换及布局提示；Chrome provider 拥有 API 内部生命周期。语言配置拥有 zh→en 和输入资格判断。Core 只使用抽象接口并保留已有状态保护，UI 保持独立。接口仅携带当前流程所需的信息，不添加未用的 generic helper 或框架。具体类型以现有调用所需的最薄接口表达，不改变批准行为。

### Implementation Plan

1. 迁移 X adapter、registry 与 UI 边界，保留原 Replace 时序和布局行为。
2. 迁移 Chrome provider、registry 与语言配置，保留激活、进度、复用、取消和错误语义。
3. 抽离 controller/session 并接通薄 content.ts；接通后清理已替代 lib 文件和旧 import。
4. 调整并补齐测试，完成安装、类型、单元、构建、本地浏览器与权限检查；尝试真实 X 场景并记录实际结果。
5. 新增简短 ARCHITECTURE.md 并更新 README 的旧模块路径和架构说明。

### Risks

迁移可能影响激活时序、IME、请求身份、Replace 选择同步和预览容器。保留已有流程并用回归检查约束。真实 X 无法自动完成的检查必须明确待人工验证。任何改变行为或扩大边界的需求触发停止条件。

### Rollback Plan

仅撤销本阶段新增模块和迁移 diff，恢复迁移前入口及 lib 实现；保留 d31acb7 的 cleanup、需求文档、配置和历史记录。禁止 reset --hard 或覆盖其他后续工作。不存在数据迁移或线上发布回退。

### Acceptance Criteria

- X 特定的编辑器与预览布局细节集中在 PlatformAdapter；Core 不依赖 X selector、Draft.js 或 Chrome Translator API 内部细节，content.ts 只负责启动和清理。
- Chrome provider 与语言配置保留当前 X + zh→en + Chrome Translator 的启用、下载进度、实例复用、取消、错误、IME、debounce、过期请求保护、Retry、Replace 和预览交互行为。
- 活动编辑器的局部观察在切换、关闭及脚本失效时正确清理，不恢复 document.body 全子树监听。
- 使用简单静态平台和 provider registry；语言配置包含 zh→en 及中文输入判断，不新增产品能力或无需求的抽象。
- 冻结安装、typecheck、现有及新增测试、生产构建和本地浏览器回归通过，生产 manifest 仍只匹配 https://x.com/* 且没有新增权限。
- 真实 X 的 New Post、Reply、Quote Post、IME、Replace 后继续编辑和按钮状态给出实际验证结果；无法完成的项目明确待人工验证，不记为 PASS，验证不发布内容。
- 简短架构文档说明模块职责及未来扩展入口，README 的模块路径与迁移结果一致，已替代的 lib 文件和旧 import 被清理。

### Verification Strategy

以下均为未来执行时的计划检查，本次保存没有运行实现验证：

- 对照迁移前实现检查 X/Chrome 边界及薄入口；搜索 Core 中 X selector、Draft.js、Translator.create 等泄漏，对应验收项 1。
- 保留并调整当前 provider 测试和浏览器 fixture，补齐 Core 异步保护、X 生命周期与 provider 边界检查；对照当前 Replace 算法、翻译单位和预览交互，对应验收项 2、3、4。
- 执行 pnpm install --frozen-lockfile、pnpm typecheck、迁移后的全部现有及新增测试、pnpm build；通过 pnpm exec vite --host 127.0.0.1 --port 5174 运行 tests/browser.html，检查生产 manifest，对应验收项 5。
- 在可用的真实 Chrome/X 环境逐项检查 New Post、Reply、Quote Post、IME、Replace 后继续编辑和按钮状态，不发布内容；不可完成则明确 Requires manual browser verification，对应验收项 6。
- 核对 ARCHITECTURE.md 的模块职责、平台/provider/语言扩展步骤，README 路径及旧 lib/import 清理，对应验收项 7。

### Next Action

1. Execute Now：仅供之后通过 CDF 校验并获得当前执行授权后使用。
2. Save as Task：用户当前选择；保存完成后停止。

## Approved Phase Boundary
- Phase: v0.1 Architecture Foundation
- Phase Scope: 建立 PlatformAdapter、TranslationProvider、LanguagePair、Core 与独立 UI 边界，迁移现有 X 流程并完成批准的测试和文档工作。
- Ends At: 现有流程通过批准的验证；真实 X 无法完成的项明确保持待人工验证状态，不声明 PASS。
- Explicitly Deferred: 新平台、新 provider、新语言选择和其他新产品功能。

## Approval Record
- User Approval: 那就先存成task文本
- Approval Context: 当前对话中的保存请求；此前用户已明确回复“批准上述计划，由 Grok Build 立即执行”，随后因插件工具不可用将当前动作改为保存任务。
- User Choice: Save as Task
- Approval Type: full
- Approved Items:
  - 建立 X PlatformAdapter 和静态 registry，集中编辑器识别、文本读取、局部观察、已验证的 Replace 流程及预览布局所需的 X 特定信息。
  - 建立 Chrome TranslationProvider 和静态 registry，将 zh→en 及中文输入判断放入语言配置，保留现有启用、下载、复用、取消和错误行为。
  - 建立 controller 与轻量 session，迁移焦点、IME、debounce、过期请求保护、Retry 和 Replace 协调，使 content.ts 只负责启动与清理。
  - 迁移并补齐现有测试和浏览器回归，执行构建与权限核对，尝试真实 X 验证并如实报告结果。
  - 新增简短架构文档并更新 README 中过时的模块路径。
- Conditions Added To Scope Lock: none
- Unapproved Items: none
- Scope Approved: Yes
- Code Changes Authorized In This Turn: No

## Dependency Graph
- TASK-001 -> TASK-003
- TASK-002 -> TASK-003
- TASK-003 -> TASK-004
- TASK-003 -> TASK-005

## Dependency Data
| Task ID | Depends On | Approved reason |
|---|---|---|
| TASK-001 | none | 独立迁移已批准的边界。 |
| TASK-002 | none | 独立迁移已批准的边界。 |
| TASK-003 | TASK-001, TASK-002 | 接通模块后才能验证或说明最终结构。 |
| TASK-004 | TASK-003 | 接通模块后才能验证或说明最终结构。 |
| TASK-005 | TASK-003 | 接通模块后才能验证或说明最终结构。 |

## TASK-001: X 平台与 UI 边界

### Goal
建立 X PlatformAdapter 和静态 registry，集中编辑器识别、文本读取、局部观察、已验证的 Replace 流程及预览布局所需的 X 特定信息。

### Dependencies
- none

### Approved Scope Mapping
- `in_scope`: 建立 X PlatformAdapter 和静态 registry，集中编辑器识别、文本读取、局部观察、已验证的 Replace 流程及预览布局所需的 X 特定信息。
- `will_change`: platforms/、ui/ 及被迁移的 lib/editable.ts、lib/overlay.ts。

### Write Scope
- platforms/
- ui/
- lib/editable.ts
- lib/overlay.ts

### Shared Contracts
- PlatformAdapter、TranslationProvider、LanguagePair 及现有状态保护；仅使用当前流程需要的接口。

### Implementation Notes
- 建立 X PlatformAdapter 和静态 registry，集中编辑器识别、文本读取、局部观察、已验证的 Replace 流程及预览布局所需的 X 特定信息。
- 接通后清理本次迁移替代的旧实现；遵循批准的技术方案。

### Acceptance Criteria
- X 特定的编辑器与预览布局细节集中在 PlatformAdapter；Core 不依赖 X selector、Draft.js 或 Chrome Translator API 内部细节，content.ts 只负责启动和清理。
- Chrome provider 与语言配置保留当前 X + zh→en + Chrome Translator 的启用、下载进度、实例复用、取消、错误、IME、debounce、过期请求保护、Retry、Replace 和预览交互行为。
- 活动编辑器的局部观察在切换、关闭及脚本失效时正确清理，不恢复 document.body 全子树监听。

### Must Not Change
- 新增平台、翻译服务、语言选择、新产品功能、动态插件系统或无复用需求的 generic 抽象。
- 修改依赖、版本号或 host 权限。
- 实际发布帖子、回复或 Quote Post。
- 保留当前 Replace 算法、翻译单位、预览交互和 X 中文→英文产品行为。
- 保护现有 cleanup、需求文档与历史验证记录；不重置或覆盖既有工作。
- 保持现有依赖、版本号、host 范围和最小权限。

### Planned Verification
- 检查 X selector、读取、observer、Replace 和布局信息的迁移；对照原算法与局部观察清理。

### Assumptions and Stop Conditions
- 以审批时的文件内容为迁移基线，保存前这些内容已原样提交为 d31acb73ae50c3070d69a0ea229f57f0b61cabe6。
- 真实 X 验证依赖可用的 Chrome 与 X 环境；无法完成的项目标记待人工验证，不能记为 PASS。
- 若必须改变产品行为、扩大批准边界或发现影响计划含义的仓库漂移，停止并返回 CDF 规划。

### Definition Status
READY

## TASK-002: Chrome provider 与语言配置

### Goal
建立 Chrome TranslationProvider 和静态 registry，将 zh→en 及中文输入判断放入语言配置，保留现有启用、下载、复用、取消和错误行为。

### Dependencies
- none

### Approved Scope Mapping
- `in_scope`: 建立 Chrome TranslationProvider 和静态 registry，将 zh→en 及中文输入判断放入语言配置，保留现有启用、下载、复用、取消和错误行为。
- `will_change`: translators/、languages/ 及被迁移的 lib/translator.ts。

### Write Scope
- translators/
- languages/
- lib/translator.ts

### Shared Contracts
- PlatformAdapter、TranslationProvider、LanguagePair 及现有状态保护；仅使用当前流程需要的接口。

### Implementation Notes
- 建立 Chrome TranslationProvider 和静态 registry，将 zh→en 及中文输入判断放入语言配置，保留现有启用、下载、复用、取消和错误行为。
- 接通后清理本次迁移替代的旧实现；遵循批准的技术方案。

### Acceptance Criteria
- Chrome provider 与语言配置保留当前 X + zh→en + Chrome Translator 的启用、下载进度、实例复用、取消、错误、IME、debounce、过期请求保护、Retry、Replace 和预览交互行为。
- 使用简单静态平台和 provider registry；语言配置包含 zh→en 及中文输入判断，不新增产品能力或无需求的抽象。

### Must Not Change
- 新增平台、翻译服务、语言选择、新产品功能、动态插件系统或无复用需求的 generic 抽象。
- 修改依赖、版本号或 host 权限。
- 实际发布帖子、回复或 Quote Post。
- 保留当前 Replace 算法、翻译单位、预览交互和 X 中文→英文产品行为。
- 保护现有 cleanup、需求文档与历史验证记录；不重置或覆盖既有工作。
- 保持现有依赖、版本号、host 范围和最小权限。

### Planned Verification
- 调整现有 provider 测试并核对激活、下载进度、复用、取消、错误和语言配置。

### Assumptions and Stop Conditions
- 以审批时的文件内容为迁移基线，保存前这些内容已原样提交为 d31acb73ae50c3070d69a0ea229f57f0b61cabe6。
- 真实 X 验证依赖可用的 Chrome 与 X 环境；无法完成的项目标记待人工验证，不能记为 PASS。
- 若必须改变产品行为、扩大批准边界或发现影响计划含义的仓库漂移，停止并返回 CDF 规划。

### Definition Status
READY

## TASK-003: Core 与薄入口接通

### Goal
建立 controller 与轻量 session，迁移焦点、IME、debounce、过期请求保护、Retry 和 Replace 协调，使 content.ts 只负责启动与清理。

### Dependencies
- TASK-001
- TASK-002

### Approved Scope Mapping
- `in_scope`: 建立 controller 与轻量 session，迁移焦点、IME、debounce、过期请求保护、Retry 和 Replace 协调，使 content.ts 只负责启动与清理。
- `will_change`: core/ 与 entrypoints/content.ts。

### Write Scope
- core/
- entrypoints/content.ts

### Shared Contracts
- PlatformAdapter、TranslationProvider、LanguagePair 及现有状态保护；仅使用当前流程需要的接口。

### Implementation Notes
- 建立 controller 与轻量 session，迁移焦点、IME、debounce、过期请求保护、Retry 和 Replace 协调，使 content.ts 只负责启动与清理。
- 接通后清理本次迁移替代的旧实现；遵循批准的技术方案。

### Acceptance Criteria
- X 特定的编辑器与预览布局细节集中在 PlatformAdapter；Core 不依赖 X selector、Draft.js 或 Chrome Translator API 内部细节，content.ts 只负责启动和清理。
- Chrome provider 与语言配置保留当前 X + zh→en + Chrome Translator 的启用、下载进度、实例复用、取消、错误、IME、debounce、过期请求保护、Retry、Replace 和预览交互行为。
- 活动编辑器的局部观察在切换、关闭及脚本失效时正确清理，不恢复 document.body 全子树监听。
- 使用简单静态平台和 provider registry；语言配置包含 zh→en 及中文输入判断，不新增产品能力或无需求的抽象。

### Must Not Change
- 新增平台、翻译服务、语言选择、新产品功能、动态插件系统或无复用需求的 generic 抽象。
- 修改依赖、版本号或 host 权限。
- 实际发布帖子、回复或 Quote Post。
- 保留当前 Replace 算法、翻译单位、预览交互和 X 中文→英文产品行为。
- 保护现有 cleanup、需求文档与历史验证记录；不重置或覆盖既有工作。
- 保持现有依赖、版本号、host 范围和最小权限。

### Planned Verification
- 运行类型检查并检查 Core 边界、状态保护、入口启动和清理；运行对应回归。

### Assumptions and Stop Conditions
- 以审批时的文件内容为迁移基线，保存前这些内容已原样提交为 d31acb73ae50c3070d69a0ea229f57f0b61cabe6。
- 真实 X 验证依赖可用的 Chrome 与 X 环境；无法完成的项目标记待人工验证，不能记为 PASS。
- 若必须改变产品行为、扩大批准边界或发现影响计划含义的仓库漂移，停止并返回 CDF 规划。

### Definition Status
READY

## TASK-004: 回归验证与实际结果

### Goal
迁移并补齐现有测试和浏览器回归，执行构建与权限核对，尝试真实 X 验证并如实报告结果。

### Dependencies
- TASK-003

### Approved Scope Mapping
- `in_scope`: 迁移并补齐现有测试和浏览器回归，执行构建与权限核对，尝试真实 X 验证并如实报告结果。
- `will_change`: tests/ 中现有测试及 Core、X 生命周期、provider 边界检查。

### Write Scope
- tests/

### Shared Contracts
- PlatformAdapter、TranslationProvider、LanguagePair 及现有状态保护；仅使用当前流程需要的接口。

### Implementation Notes
- 迁移并补齐现有测试和浏览器回归，执行构建与权限核对，尝试真实 X 验证并如实报告结果。
- 接通后清理本次迁移替代的旧实现；遵循批准的技术方案。

### Acceptance Criteria
- Chrome provider 与语言配置保留当前 X + zh→en + Chrome Translator 的启用、下载进度、实例复用、取消、错误、IME、debounce、过期请求保护、Retry、Replace 和预览交互行为。
- 活动编辑器的局部观察在切换、关闭及脚本失效时正确清理，不恢复 document.body 全子树监听。
- 冻结安装、typecheck、现有及新增测试、生产构建和本地浏览器回归通过，生产 manifest 仍只匹配 https://x.com/* 且没有新增权限。
- 真实 X 的 New Post、Reply、Quote Post、IME、Replace 后继续编辑和按钮状态给出实际验证结果；无法完成的项目明确待人工验证，不记为 PASS，验证不发布内容。

### Must Not Change
- 新增平台、翻译服务、语言选择、新产品功能、动态插件系统或无复用需求的 generic 抽象。
- 修改依赖、版本号或 host 权限。
- 实际发布帖子、回复或 Quote Post。
- 保留当前 Replace 算法、翻译单位、预览交互和 X 中文→英文产品行为。
- 保护现有 cleanup、需求文档与历史验证记录；不重置或覆盖既有工作。
- 保持现有依赖、版本号、host 范围和最小权限。

### Planned Verification
- 执行冻结安装、类型检查、全部现有与新增测试、生产构建及本地浏览器 fixture。
- 核对生产 manifest；尝试真实 X 场景，记录 PASS/FAIL 或待人工验证，禁止实际发布。

### Assumptions and Stop Conditions
- 以审批时的文件内容为迁移基线，保存前这些内容已原样提交为 d31acb73ae50c3070d69a0ea229f57f0b61cabe6。
- 真实 X 验证依赖可用的 Chrome 与 X 环境；无法完成的项目标记待人工验证，不能记为 PASS。
- 若必须改变产品行为、扩大批准边界或发现影响计划含义的仓库漂移，停止并返回 CDF 规划。

### Definition Status
READY

## TASK-005: 架构与路径文档

### Goal
新增简短架构文档并更新 README 中过时的模块路径。

### Dependencies
- TASK-003

### Approved Scope Mapping
- `in_scope`: 新增简短架构文档并更新 README 中过时的模块路径。
- `will_change`: ARCHITECTURE.md 与 README.md 的架构和模块路径说明。

### Write Scope
- ARCHITECTURE.md
- README.md

### Shared Contracts
- PlatformAdapter、TranslationProvider、LanguagePair 及现有状态保护；仅使用当前流程需要的接口。

### Implementation Notes
- 新增简短架构文档并更新 README 中过时的模块路径。
- 接通后清理本次迁移替代的旧实现；遵循批准的技术方案。

### Acceptance Criteria
- 简短架构文档说明模块职责及未来扩展入口，README 的模块路径与迁移结果一致，已替代的 lib 文件和旧 import 被清理。

### Must Not Change
- 新增平台、翻译服务、语言选择、新产品功能、动态插件系统或无复用需求的 generic 抽象。
- 修改依赖、版本号或 host 权限。
- 实际发布帖子、回复或 Quote Post。
- 保留当前 Replace 算法、翻译单位、预览交互和 X 中文→英文产品行为。
- 保护现有 cleanup、需求文档与历史验证记录；不重置或覆盖既有工作。
- 保持现有依赖、版本号、host 范围和最小权限。

### Planned Verification
- 核对新模块职责、未来扩展入口、README 路径及已替代文件/import 的清理。

### Assumptions and Stop Conditions
- 以审批时的文件内容为迁移基线，保存前这些内容已原样提交为 d31acb73ae50c3070d69a0ea229f57f0b61cabe6。
- 真实 X 验证依赖可用的 Chrome 与 X 环境；无法完成的项目标记待人工验证，不能记为 PASS。
- 若必须改变产品行为、扩大批准边界或发现影响计划含义的仓库漂移，停止并返回 CDF 规划。

### Definition Status
READY

## Scope Guard
- [x] Every task maps to approved in_scope or will_change content.
- [x] No exclusion or protected area is treated as positive work.
- [x] The canonical Scope Lock is byte-for-byte unchanged.
- [x] The Development Plan is carried verbatim with its canonical headings and sole Scope Lock.
- [x] The exact displayed approval basis is preserved without undisclosed scope or obligations.
- [x] The Development Plan acceptance projection exactly matches canonical criteria in order.
- [x] Canonical in_scope and acceptance_criteria are non-empty.
- [x] Every task criterion is canonical and retains canonical order.
- [x] Every canonical criterion has task coverage and a planned check.
- [x] The immutable Approval Record and approved phase boundary are preserved.
- [x] Dependencies introduce no product, technical or architecture decision.
- [x] Planned implementation verification is not reported as performed.
- [x] Assumptions, stop conditions and protected areas remain visible.
- [x] Source state and non-material save-drift evidence are preserved.
- [x] Task compilation performed no implementation, execution, scheduling or implementation review.

## Future CDF Execution Constraints
- Resume only through CDF.
- Follow CDF Integrity Verification, Resume a Saved Task, and Repository Drift rules.
- Treat the Scope Lock, Approval Record, phase boundary, task Write Scope and dependencies as immutable limits.
- Stop and return to CDF planning if evidence requires new scope, technical decisions or acceptance criteria.
- After explicit current authorization, record runtime state only in the separate cdf-execution-progress/v1 sidecar.
- Skip only verified sidecar tasks whose evidence still applies; inspect interrupted work.
- Report only checks actually performed. Inspection alone authorizes no implementation or progress mutation.
- Before recording completion, verify every canonical criterion against current successful evidence; task states alone are insufficient.

## Compilation Gate Result
- Compilation Status: READY
- Task Count: 5
- Scope Guard: passed
- Canonical Scope Lock Before Save: matched approved handoff

## Save Verification
- [x] Frontmatter and traceability match the approved handoff.
- [x] Required sections and exact displayed approval basis are preserved.
- [x] Verbatim Development Plan, sole Scope Lock and acceptance projection match.
- [x] Immutable Approval Record and phase boundary are preserved.
- [x] Scope Lock and Approval Record digests recompute and match.
- [x] Source worktree changes and save-drift metadata match.
- [x] Task IDs and dependency data are consistent and acyclic.
- [x] Every canonical criterion has task coverage and a planned check.
- [x] Scope Guard and CDF-only resume constraints are present.
- [x] The document grants no execution authority.
- Verified At: 2026-10-03T07:23:36+08:00
