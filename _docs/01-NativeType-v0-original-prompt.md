你正在一个已经初始化好的 **WXT + Vanilla TypeScript** Chrome Extension 项目中工作。

请直接完成一个可以实际安装、运行和 dogfood 的 **NativeType v0**。

不要只做工程骨架，也不要分 Day 1 / Day 2。请一次性实现完整 MVP，并自行完成检查、构建和必要调试。

# 1. 产品定义

项目名称：

**NativeType**

一句话：

> Write in your language. Publish in another.

NativeType 是一个开源 Chrome Extension，用来解决非英语母语用户在英文互联网写作时频繁切换翻译工具的问题。

v0 的核心场景：

> 用户在 X（x.com）的发帖/回复输入框中直接输入中文，NativeType 使用 Chrome Built-in Translator API 将中文翻译成英文，在输入框附近显示英文预览，用户可以一键 Replace，把中文替换成英文。

核心闭环：

Chinese Input
→ Translate
→ Preview
→ Replace
→ Post

# 2. v0 原则

这是一个 Hackathon MVP。

必须遵守：

- WXT
- Vanilla TypeScript
- Chrome Extension Manifest V3
- 不使用 Vue
- 不使用 React
- 不使用任何 UI Framework
- 不使用后端
- 不使用数据库
- 不使用账号系统
- 不使用支付
- 不使用第三方翻译 API
- 不使用 LLM
- 不要求 API Key
- 翻译只使用 Chrome Built-in Translator API
- 尽可能不申请 Chrome permissions
- 优先支持最新版 Desktop Chrome
- v0 优先把 x.com 做好
- 代码保持简单
- 不做过度工程化
- 不为了未来功能提前创建复杂抽象

这是一个验证需求和交互的开源实验，不是完整 SaaS。

# 3. 首先检查现有项目

先检查当前仓库：

- package.json
- wxt.config.ts
- tsconfig
- entrypoints
- public
- README
- 当前模板代码

确认当前 WXT 配置。

删除没有实际用途的 WXT demo/template 内容。

不要无意义升级依赖。

不要引入大型依赖。

如果当前存在没有用途的 popup / options / background，可以删除。

# 4. Extension Metadata

配置：

Name:
NativeType

Version:
0.0.1

Description:
Write in your language. Publish in another.

v0 默认只需要匹配：

https://x.com/*

如果核心功能完全不需要 Chrome permissions，则不要申请。

不要因为“以后可能需要”而增加权限。

# 5. X 输入框检测

实现对 X 当前可编辑区域的识别。

至少支持：

- New Post
- Reply
- Quote Post（如果使用相同编辑器结构可以自然支持）

重点考虑 X 使用 React 和 contenteditable。

不要硬编码脆弱的动态 class name。

优先使用：

- role
- contenteditable
- aria
- data-testid
- DOM semantics

等相对稳定的特征。

应该能够识别当前用户正在编辑的 X composer。

如果页面存在多个 composer，只处理当前 focus / active 的那个。

# 6. 输入监听

监听用户在 X composer 中的输入。

要求：

- 检测中文内容
- 不要每输入一个字符就翻译
- 使用合理 debounce
- 默认约 800–1200ms
- 用户继续输入时取消上一轮待执行翻译
- 如果翻译请求已经过时，不允许旧结果覆盖新结果
- 空文本不翻译
- 纯英文不翻译
- 相同文本不要重复翻译

保持实现简单。

不要为了 debounce 引入 lodash 等依赖。

# 7. Chrome Built-in Translator API

创建独立模块，例如：

lib/translator.ts

只使用 Chrome Built-in Translator API。

核心方向：

sourceLanguage:
zh

targetLanguage:
en

使用当前 Chrome 正式支持的 Translator API。

例如：

const translator = await Translator.create({
  sourceLanguage: 'zh',
  targetLanguage: 'en',
})

然后：

await translator.translate(text)

但不要机械复制示例。

请根据当前 Chrome Built-in Translator API 的实际接口和 WXT/TypeScript 环境正确实现。

要求：

- 正确检查 Translator API 是否存在
- 正确处理 availability
- 正确处理模型尚未下载的情况
- 如果 API 支持下载 progress，合理处理
- Translator instance 尽可能复用
- 不要每次输入都重新创建 Translator
- 正确处理 translate() error
- API 不可用时不能导致 content script 崩溃

如果 TypeScript DOM 类型尚未包含 Translator API：

只增加最小必要的本地类型声明。

不要为了几个类型安装大型依赖。

# 8. Translation Preview UI

翻译成功后，在当前 composer 附近显示一个轻量 Floating Preview。

建议使用：

Shadow DOM

避免：

- X CSS 污染 NativeType
- NativeType CSS 污染 X

UI 应该非常轻。

例如：

┌─────────────────────────────────┐
│ English translation appears     │
│ here.                           │
│                                 │
│                   Retry Replace │
└─────────────────────────────────┘

必须包含：

- Translation text
- Retry
- Replace

可以包含一个非常轻的 NativeType 标识。

不要：

- 大面积 UI
- Modal
- Popup
- Sidebar
- Dashboard
- 动画库
- UI Framework

视觉方向：

- clean
- minimal
- native
- unobtrusive
- suitable for X

支持 light / dark 环境时尽量自然，但不要为了主题系统增加复杂度。

# 9. Preview 定位

Preview 应该和当前 composer 建立明确视觉关系。

优先：

显示在输入框下方或附近。

要求：

- 不遮挡用户正在输入的文字
- 页面滚动时位置合理
- composer 尺寸变化时尽量保持正确
- 多个 composer 时跟随当前 active composer
- composer 消失后 Preview 应该清理

不需要实现复杂的通用 floating-position engine。

不要引入 Floating UI 等大型依赖，除非确实证明 Vanilla 实现明显不合理。

# 10. Replace

点击 Replace：

将当前中文内容替换成翻译后的英文。

这是整个 MVP 最关键的交互。

特别注意：

X 是 React 应用。

不要只粗暴修改：

element.innerHTML

然后认为任务完成。

必须确保：

- DOM 内容正确变化
- X/React 能感知内容变化
- 用户继续输入不会异常
- X 的 Post 按钮状态正常
- 不破坏 composer
- 尽可能保留正常光标行为

必要时正确触发：

beforeinput / input

等事件。

请实际根据 X contenteditable 的行为设计。

Replace 成功后：

- 清除旧 Preview，或更新为合理完成状态
- 不要立刻把刚刚替换进去的英文再次送去翻译

# 11. Retry

点击 Retry：

对当前中文原文重新调用 Translator。

由于机器翻译结果可能 deterministic，Retry 第一版不需要复杂策略。

它主要用于验证 UI 和未来扩展接口。

如果 Retry 没有实际价值，也可以保留最简单实现。

# 12. Loading / Error

需要最基本的状态：

- translating
- downloading model（如果 API 有此状态）
- translated
- error
- unsupported

但 UI 不要复杂。

例如：

Translating…

或者：

Chrome Translator is unavailable.

错误信息应该可理解。

不要直接把 stack trace 展示给用户。

开发错误可以 console.debug / console.error。

# 13. Privacy

v0 的核心卖点之一：

翻译使用 Chrome Built-in Translator API。

NativeType 不应该把用户输入发送到自己的服务器。

README 明确说明：

- No account
- No API key
- No server
- No external translation API
- Translation uses Chrome's built-in Translator API
- NativeType itself does not upload the text to a NativeType server

措辞不要对 Chrome 自身实现做无法证明的隐私承诺。

# 14. 项目结构

根据实际情况组织。

建议保持类似：

entrypoints/
  content.ts

lib/
  translator.ts
  editable.ts
  overlay.ts

assets / public

wxt.config.ts

不要为了形式强行拆文件。

如果某个模块只有十几行而拆分没有价值，可以合并。

目标：

代码容易理解，而不是目录漂亮。

# 15. README

创建一个简洁但完整的 README。

至少包括：

# NativeType

Write in your language. Publish in another.

说明当前项目是：

Experimental open-source Chrome extension for frictionless cross-language writing.

Current v0:

Chinese
→ Chrome Built-in Translator
→ English
→ Replace

说明：

- Chrome Desktop
- currently optimized for X
- no account
- no API key
- no server
- no external translation API

提供：

## Development

pnpm install

pnpm dev

## Build

pnpm build

## Current limitations

明确写出：

- Chrome Built-in Translator API compatibility
- Chinese → English only
- X-first
- experimental contenteditable support

不要写大量营销内容。

# 16. 明确不要实现

v0 不允许实现：

- Vue
- React
- Svelte
- Tailwind
- UnoCSS
- Pinia
- backend
- login
- payment
- subscription
- analytics
- telemetry
- history
- cloud sync
- external translation API
- DeepL
- Google Translate API
- OpenAI
- Claude
- Gemini
- AI Rewrite
- model selector
- multiple translation providers
- user account
- database
- TokenClash
- server fallback
- generic SaaS infrastructure

也不要加入：

“以后可能用得上”的代码。

# 17. 代码质量要求

保持：

- TypeScript strict-friendly
- clear naming
- small functions
- minimal comments
- no unnecessary abstraction
- no `any`，除非 Chrome Translator API 类型兼容确实没有更合理方案
- no dead code
- no placeholder TODO spam
- no unnecessary dependencies

对于 X-specific workaround：

如果代码本身无法表达原因，可以写简短注释说明为什么这样处理。

# 18. 自行验证

实现完成后，不要立刻结束。

请主动执行：

- pnpm typecheck（如果项目存在）
- pnpm build
- lint（如果已有配置）

如果没有 typecheck script，可以使用项目现有 TypeScript/WXT 能力检查，但不要为了这件事引入新的复杂工具链。

修复：

- TypeScript errors
- WXT errors
- build errors
- obvious runtime issues

如果当前环境允许启动 Chrome / Browser：

进一步实际测试：

1. Extension 是否正常加载
2. x.com 是否加载 content script
3. X composer 是否能够被识别
4. 输入中文是否触发 debounce
5. Translator 是否工作
6. Preview 是否出现
7. Replace 是否真的修改 X composer
8. Post 按钮是否仍然正常
9. Replace 后是否还能继续编辑

如果可以通过浏览器 DevTools 调试，请主动完成。

不要只因为 build 成功就认为功能一定正确。

# 19. 遇到问题时的原则

如果 X 的 React/contenteditable 行为与预期不同：

优先实际调试 DOM 和事件。

不要凭空构造复杂 workaround。

如果 Chrome Translator API 在当前环境无法运行：

不要偷偷改成第三方 API。

保留正确实现，并明确告诉我：

- 为什么当前环境无法验证
- 我应该如何在本地 Chrome 验证
- Chrome 需要什么版本/flag/模型

不要因为 Translator API 无法验证而扩大 scope。

# 20. 完成标准

只有以下闭环成立，才算 NativeType v0 完成：

用户打开 X
→ 点击发帖
→ 输入中文
→ 停顿
→ NativeType 显示英文翻译
→ 用户点击 Replace
→ X composer 变成英文
→ 用户仍然可以正常编辑并发布

# 21. 最终汇报

完成后给我一个简洁报告：

## Implemented
实现了什么。

## Files
主要修改了哪些文件。

## Permissions
Extension 当前申请了哪些权限，以及原因。

## Translator API
当前 Chrome Translator API 实现方式和兼容性。

## X Integration
如何识别和修改 X composer。

## Verification
你实际执行了哪些 build/typecheck/runtime 测试。

## Known Issues
目前确认存在的问题。

## Manual Test
告诉我如何在 Chrome 中加载这个 WXT Extension，并用 1 分钟完成一次：

中文 → 翻译 → Replace

的人工测试。

完成 v0 后停止。

不要继续实现 Pro、AI Rewrite、多模型、后端或其他 v1 功能。