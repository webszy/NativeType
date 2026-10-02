你正在一个已经初始化完成的 **WXT + Vanilla TypeScript** Chrome Extension 项目中工作。

项目名称暂定为 **NativeType**。

## 项目背景

NativeType 是一个极简、开源的 Chrome Extension。

核心需求是：

> 用户可以直接在网页输入框中使用自己的母语输入文字，通过 Chrome Built-in Translator API 在本地完成翻译，并最终将翻译结果替换回当前输入框。

第一阶段主要服务场景：

> 中文用户在 X（x.com）直接输入中文，然后翻译成英文发布。

项目目前处于 **v0 / Hackathon 阶段**。

开发原则：

- 不做后端
- 不做账号
- 不做支付
- 不接第三方翻译 API
- 不接 LLM
- 不使用 Vue / React 等 UI Framework
- 使用 Vanilla TypeScript
- 翻译只使用 Chrome Built-in Translator API
- 尽量减少 Chrome Extension permissions
- 当前优先支持 Desktop Chrome
- 当前优先支持 x.com
- 不提前设计复杂架构
- 保持代码简单、可读、容易继续迭代

## 本次任务

只完成 NativeType 的 **Day 1 基础工程整理与技术验证**。

不要提前实现完整产品功能。

### 1. 检查当前 WXT 项目

先检查：

- package.json
- wxt.config.ts
- entrypoints
- tsconfig
- 当前模板生成的示例代码

确认这是一个正常的 WXT + Vanilla TypeScript 项目。

不要无意义升级依赖。

不要引入新的大型依赖。

### 2. 清理 WXT 模板代码

删除明显无用的 demo/example/template 内容。

保持项目尽可能简单。

如果当前存在 popup，而现阶段没有实际用途，可以删除。

v0 当前不需要：

- popup
- options page
- background service worker
- storage
- account
- settings

除非 WXT 本身运行确实需要，否则不要创建。

### 3. 配置 Extension 基础信息

在合适的位置设置：

- name: NativeType
- version: 0.0.1
- description: Write in your language. Publish in another.

不要添加当前功能不需要的 permissions。

### 4. 创建最小 Content Script

创建：

entrypoints/content.ts

当前只匹配：

https://x.com/*

加载后在 console 输出：

[NativeType] Content script loaded

不要实现输入框监听。

不要实现 MutationObserver。

不要实现 Floating UI。

不要实现 Replace。

这个阶段只是验证 Content Script 能正确注入 X。

### 5. 验证 Chrome Translator API

创建：

lib/translator.ts

封装一个最小的 Translator API 调用。

目标 API：

Chrome Built-in Translator API

使用现代 Translator API，例如：

const translator = await Translator.create({
sourceLanguage: 'zh',
targetLanguage: 'en',
})

然后：

await translator.translate(text)

要求：

- TypeScript 类型尽可能正确
- 不为了类型问题引入第三方依赖
- 如果当前 TypeScript DOM lib 尚未包含 Translator API 类型，可以在项目内部增加最小必要的类型声明
- 不污染 global scope 超出必要范围
- 对 API 不支持的情况提供明确错误
- 对模型尚未下载 / API unavailable 等情况进行合理处理
- 不实现复杂 fallback
- 不接任何网络翻译服务

暴露一个简单函数，例如：

translateZhToEn(text: string): Promise<string>

### 6. 在 Content Script 中做一次临时技术验证

在 content.ts 中临时调用：

translateZhToEn('你好，世界')

将翻译结果打印到 console，例如：

[NativeType] Translation test: Hello, world

如果 Translator API 当前不可用，也应该打印清晰的信息，而不是导致 Content Script 崩溃。

这一段明确标记：

// TEMP: Day 1 Translator API verification

方便 Day 2 删除。

### 7. 不要做以下事情

本次任务明确禁止提前实现：

- X 输入框识别
- contenteditable 监听
- textarea 监听
- debounce
- 自动翻译
- Floating UI
- Shadow DOM
- Replace
- Retry
- 快捷键
- 多语言 UI
- 设置页面
- storage
- analytics
- server
- API
- AI rewrite
- LLM
- tests framework
- 大规模抽象
- dependency injection
- 状态管理

不要为了“未来可能需要”创建抽象层。

## 目标目录

最终项目尽量保持类似：

NativeType/
├── entrypoints/
│   └── content.ts
├── lib/
│   └── translator.ts
├── public/
├── wxt.config.ts
├── package.json
├── tsconfig.json
└── README.md

实际目录可以根据 WXT 当前项目结构做合理调整，不需要机械照搬。

## README

简单更新 README，说明：

NativeType is an experimental open-source Chrome extension for frictionless cross-language writing.

Current v0 goal:

Chinese input → Chrome Built-in Translator → English output

同时注明：

- Chrome only
- Desktop only
- No server
- No API key
- No external translation service
- Translation runs through Chrome's built-in Translator API

不要写营销型长 README。

## 最后验证

完成修改后：

1. 运行 TypeScript/typecheck
2. 运行 WXT build
3. 修复所有与你本次修改有关的错误
4. 确认 Extension 可以正常构建
5. 不要启动与本任务无关的重构

最后向我汇报：

1. 修改了哪些文件
2. 删除了哪些模板内容
3. 当前申请了哪些 Chrome permissions
4. Translator API 是如何封装的
5. 如何在本地 Chrome 加载并验证 Extension
6. 是否存在 Chrome Translator API 的版本、模型下载或 Origin Trial 等限制
7. Day 2 建议从哪个文件开始继续

完成这些后停止，不要继续开发 Day 2。