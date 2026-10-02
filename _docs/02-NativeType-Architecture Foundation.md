你正在维护 Chrome Extension 项目 **NativeType**。

Repository:

https://github.com/webszy/NativeType

当前 NativeType v0 已经完成并可以工作。

现有核心闭环：

```text
X Composer
→ 中文输入
→ debounce
→ Chrome Built-in Translator API
→ Translation Preview
→ Replace
→ X 正确更新
→ 继续编辑 / 发布
```

本次任务不是增加功能。

本次任务定义为：

# NativeType v0.1 — Architecture Foundation

目标：

> 在完全保持现有产品行为的前提下，重构 NativeType 的内部架构，为未来多平台、多语言、多 Translation Provider 建立稳定扩展边界。

最终希望未来增加能力时大致变成：

```text
新增平台
→ 新增 Platform Adapter
→ registry 注册
→ manifest host
→ browser test

新增 Translation Provider
→ 新增 Provider Adapter
→ registry 注册

新增语言
→ 修改 Language Config

Core 不需要修改
```

---

# 1. Architecture Goal

NativeType 应拆分为四个核心概念：

```text
Platform
Language
Translation Provider
Core
```

完整关系：

```text
Web Platform
    │
    ▼
PlatformAdapter
    │
    ▼
NativeType Core
    │
    ├── LanguagePair
    │
    ▼
TranslationProvider
    │
    ▼
Translation Result
    │
    ▼
Overlay
    │
    ▼
PlatformAdapter.replace()
```

核心原则：

> Core must not know X-specific DOM details.

例如以下内容不能存在于 Core：

```text
tweetTextarea
data-testid
X composer selector
Draft.js
X-specific paste workaround
```

这些全部属于：

```text
platforms/x.ts
```

---

# 2. Target Directory Structure

根据现有代码进行最小但清晰的迁移。

目标结构建议：

```text
NativeType/
├── entrypoints/
│   └── content.ts
│
├── core/
│   ├── controller.ts
│   ├── session.ts
│   └── types.ts
│
├── platforms/
│   ├── types.ts
│   ├── registry.ts
│   ├── generic.ts
│   └── x.ts
│
├── translators/
│   ├── types.ts
│   ├── registry.ts
│   └── chrome.ts
│
├── languages/
│   ├── types.ts
│   └── config.ts
│
├── ui/
│   └── overlay.ts
│
├── tests/
│   ├── core/
│   ├── platforms/
│   └── translators/
│
├── wxt.config.ts
├── package.json
└── tsconfig.json
```

不要求机械创建所有空文件。

只创建当前真正需要的文件。

原则：

> Clear boundaries, not empty architecture.

---

# 3. PlatformAdapter

定义统一 Platform Adapter。

可以根据现有代码实际需要调整接口，但总体应接近：

```ts
export interface PlatformAdapter {
  readonly id: string;

  matches(location: Location): boolean;

  findActiveEditor(): HTMLElement | null;

  isEditor(element: Element): boolean;

  getText(editor: HTMLElement): string;

  replaceText(
    editor: HTMLElement,
    text: string,
  ): Promise<boolean>;

  observe(
    editor: HTMLElement,
    onChange: () => void,
  ): () => void;
}
```

如果实际代码需要额外能力，可以增加非常有限的字段或方法。

不要为了未来猜测增加大量接口。

---

# 4. Move X-specific Logic Into `platforms/x.ts`

检查当前：

```text
entrypoints/content.ts
lib/editable.ts
```

以及其他文件中的 X-specific 实现。

以下内容应该迁移到：

```text
platforms/x.ts
```

包括但不限于：

- X composer detection
- X-specific selector
- `data-testid`
- `role=textbox`
- `contenteditable`
- New Post detection
- Reply detection
- Quote Post detection
- X editor text reading
- X editor observation
- X-specific Replace strategy
- Draft.js compatibility
- paste event workaround
- X-specific editor lifecycle

尤其是当前已经验证成功的 Replace：

```text
focus
→ select contents
→ synchronize editor selection
→ wait if required
→ paste/input simulation
→ X handles update
→ verify result
```

必须保留行为。

不要因为重构把它替换成：

```ts
innerHTML = ...
```

或：

```ts
textContent = ...
```

或 React internal state manipulation。

---

# 5. Generic Editable Utilities

如果现有 `editable.ts` 同时包含：

```text
generic editable helpers
+
X-specific logic
```

则进行拆分。

真正通用的 helper 放入：

```text
platforms/generic.ts
```

例如：

```text
isContentEditable
generic text extraction
selection helper
generic input event helper
```

但只有确实被多个地方复用的代码才放 generic。

不要为了抽象而抽象。

如果某段逻辑只服务 X，则留在：

```text
x.ts
```

---

# 6. Platform Registry

建立简单静态 registry。

例如：

```ts
const platforms: PlatformAdapter[] = [
  xPlatform,
];

export function resolvePlatform(
  location: Location,
): PlatformAdapter | null {
  return platforms.find(
    platform => platform.matches(location),
  ) ?? null;
}
```

当前只注册：

```text
X
```

未来可以：

```ts
[
  xPlatform,
  youtubePlatform,
  redditPlatform,
]
```

不要实现：

- dynamic plugin loading
- runtime discovery
- DI framework
- extension marketplace
- reflection
- filesystem auto-registration

Registry 必须简单、静态、可读。

---

# 7. TranslationProvider Interface

当前业务逻辑不能继续直接依赖 Chrome Translator API。

定义：

```ts
export interface TranslationProvider {
  readonly id: string;

  isAvailable(
    source: LanguageCode,
    target: LanguageCode,
  ): Promise<boolean>;

  prepare?(
    source: LanguageCode,
    target: LanguageCode,
  ): Promise<void>;

  translate(
    text: string,
    options: {
      source: LanguageCode;
      target: LanguageCode;
      signal?: AbortSignal;
    },
  ): Promise<string>;

  dispose?(): void;
}
```

可根据 Chrome Translator API 的真实生命周期适当调整。

关键要求：

> Core 只能依赖 TranslationProvider abstraction。

不能直接：

```ts
Translator.create(...)
```

---

# 8. Chrome Translation Provider

把现有：

```text
translator.ts
```

重构为：

```text
translators/chrome.ts
```

职责包括：

- Chrome Translator API availability
- source/target capability check
- translator instance creation
- user activation requirements
- download lifecycle
- download progress
- instance reuse
- translate
- abort/error handling
- dispose

保持现有已工作的逻辑。

不要改变当前翻译体验。

---

# 9. Translation Provider Registry

建立简单静态 registry。

例如：

```ts
const providers = {
  chrome: chromeTranslationProvider,
};
```

或者：

```ts
const providers: TranslationProvider[] = [
  chromeTranslationProvider,
];
```

并提供简单 resolver：

```ts
getTranslationProvider("chrome")
```

当前只能注册：

```text
Chrome Built-in Translator
```

不要实现：

- DeepL
- Google Cloud Translation
- OpenAI
- Gemini
- Claude
- provider selection UI

本次只是建立接口。

---

# 10. Language Model

去掉业务代码里的：

```ts
translateZhToEn(...)
```

这类强绑定函数。

定义：

```ts
export type LanguageCode = string;

export interface LanguagePair {
  source: LanguageCode;
  target: LanguageCode;
}
```

当前配置：

```ts
export const DEFAULT_LANGUAGE_PAIR: LanguagePair = {
  source: 'zh',
  target: 'en',
};
```

Core 使用：

```ts
provider.translate(text, {
  source,
  target,
  signal,
});
```

当前产品行为仍然只能是：

```text
Chinese → English
```

不要增加语言选择 UI。

不要实现自动语言检测。

---

# 11. Core Controller

将当前 `content.ts` 中的业务 orchestration 抽离。

创建：

```text
core/controller.ts
```

Controller 负责：

```text
platform
↓
active editor
↓
editor observation
↓
text change
↓
IME guard
↓
debounce
↓
language eligibility
↓
translation request
↓
stale request protection
↓
preview
↓
retry
↓
replace
```

Controller 可以依赖：

```text
PlatformAdapter
TranslationProvider
LanguagePair
Overlay
```

但不能依赖：

```text
X selectors
Chrome Translator API internals
```

---

# 12. Translation Session

如果现有代码已经有以下状态：

```text
active editor
revision
source text
translation result
AbortController
debounce timer
```

建议集中到：

```text
core/session.ts
```

例如：

```ts
interface TranslationSession {
  editor: HTMLElement;
  platform: PlatformAdapter;

  revision: number;

  sourceText: string;
  translatedText?: string;

  abortController?: AbortController;
}
```

不要为了面向对象形式强行创建复杂 class。

优先选择当前代码最自然的形式。

目标只是：

> Session state 不继续散落在 content script 中。

---

# 13. Thin `content.ts`

重构完成后：

```text
entrypoints/content.ts
```

应该只承担 extension entrypoint 的职责。

理想形式类似：

```ts
const platform = resolvePlatform(window.location);

if (platform) {
  startNativeType({
    platform,
    provider,
    languagePair,
  });
}
```

实际可以稍复杂，但不能再承担完整业务流程。

---

# 14. Overlay

将现有：

```text
overlay.ts
```

迁移至：

```text
ui/overlay.ts
```

如果当前目录已经合理，也可以保留，但 Core 和 Platform 都不能直接实现重复 UI。

Overlay 负责：

```text
loading
translation preview
error
retry
replace
position
cleanup
theme
```

Overlay 不应该知道：

```text
Chrome Translator API
X Draft.js
```

---

# 15. MutationObserver Architecture

借这次架构调整，同时处理 Observer scope。

禁止长期：

```ts
observe(document.body, {
  subtree: true,
  ...
})
```

监听整个 X DOM。

改为：

```text
find active editor
↓
platform.observe(editor)
↓
只观察 editor 或必要 composer container
```

Platform Adapter 自己决定如何监听当前 editor。

当 editor 切换：

```text
old cleanup()
↓
new platform.observe()
```

确保：

- 不残留 observers
- 不重复 attach
- composer close 后 cleanup
- Reply → Post 切换正常
- SPA 页面切换正常

如果发现 X 的 composer detection 必须依赖非常轻量的 document-level detection，可以保留必要的检测机制，但：

> document-level observer 只能负责发现 composer 生命周期，不能在每次 X 页面 mutation 时重新执行完整 translation pipeline。

保持开销最小。

---

# 16. Platform Metadata

Platform 可以增加非常有限的 metadata。

例如：

```ts
export const xPlatform = {
  id: 'x',

  hosts: [
    'https://x.com/*',
  ],

  ...
};
```

但不要尝试从这里动态生成 Manifest。

当前 `wxt.config.ts` 仍然显式维护：

```text
https://x.com/*
```

未来新增 YouTube 时，接受：

```text
platforms/youtube.ts
platform registry
wxt.config.ts host
tests
```

四处明确修改。

不要为了做到“只新增一个文件”引入 build magic。

---

# 17. Future Platform Design

本次不实现 YouTube。

但架构必须保证未来可以这样实现：

```text
platforms/youtube.ts
```

里面独立负责：

```text
YouTube comment box detection
text reading
text observation
replacement behavior
editor quirks
```

然后：

```text
registry.ts
```

增加：

```ts
youtubePlatform
```

再在 manifest 增加 host 即可。

Core 不应该因此修改。

---

# 18. Testing Structure

整理测试，使测试边界和 architecture 一致。

目标结构：

```text
tests/
├── core/
├── platforms/
│   └── x.*
└── translators/
    └── chrome.*
```

不强求文件名完全一致。

现有测试不要删除。

迁移时保证覆盖：

### Core

- debounce
- stale translation
- AbortController
- revision
- source equality
- replace flow coordination

### X Platform

- composer detection
- text reading
- observation
- Replace behavior
- X editor lifecycle

### Chrome Provider

- availability
- prepare
- translate
- reuse
- error state
- dispose

---

# 19. Real Browser Verification Is Required

Platform Adapter 是否完成，不能只依赖 unit test。

对 X 必须保留真实浏览器验证。

验证：

## New Post

```text
打开 X
→ Post
→ 中文输入
→ Preview
→ Replace
→ 英文
→ 继续输入
→ 正常 Post
```

## Reply

```text
Reply
→ 中文
→ Preview
→ Replace
→ 正常回复
```

## Quote Post

如果当前已支持：

```text
Quote
→ 中文
→ Preview
→ Replace
```

## IME

中文输入法 composition 期间不得错误触发。

## Replace State

Replace 后：

```text
X React/Draft.js state correct
Post button correct
continue typing works
undo behavior unchanged
```

---

# 20. Preserve Existing Race Protection

当前已存在的类似机制：

```text
revision
AbortController
composer identity
source equality
```

必须保留。

例如：

```text
Input A
↓
Translation A
↓
用户改为 B
↓
A 返回
```

A 不得覆盖 B。

架构迁移不能弱化这些保护。

---

# 21. Preserve Current UX

本次架构重构后，用户看到的行为应该基本没有变化。

仍然：

```text
Chinese
↓
debounce
↓
Translation Preview
↓
Retry / Replace
```

不要增加：

```text
platform selector
provider selector
language selector
settings
popup
```

---

# 22. Explicit Non-goals

本次禁止实现：

```text
YouTube
Reddit
GitHub
LinkedIn
Gmail

DeepL
Google Translate
OpenAI
Claude
Gemini

AI Rewrite

multiple languages UI
auto language detection

partial translation
selection translation
paragraph translation
diff translation

account
backend
database
history
analytics
payment
subscription

plugin system
dynamic adapters
dependency injection framework
runtime module loading
```

本次目标只有：

> Build stable extension boundaries.

---

# 23. Avoid Overengineering

非常重要。

我们需要的是：

```text
PlatformAdapter
TranslationProvider
LanguagePair
Core
```

不是一个通用浏览器自动化框架。

如果某个 abstraction：

- 当前只有一个实现
- 未来变化方向明确
- interface 很薄

可以保留。

但不要引入：

```text
BaseAdapter
AbstractPlatform
AdapterFactory
AdapterManager
PluginManager
ServiceContainer
Repository Pattern
Command Bus
Event Bus
CQRS
```

除非现有代码真的已经需要。

优先使用：

```text
plain TypeScript interfaces
functions
small modules
static registries
```

---

# 24. Cleanup Existing `lib`

完成迁移后检查：

```text
lib/
```

如果：

```text
translator.ts
editable.ts
overlay.ts
```

已经全部迁移，则删除旧文件。

不要留下：

```text
old implementation
unused duplicate modules
compat wrapper
```

除非有明确必要。

所有 import 必须指向新结构。

---

# 25. Build-time Platform Host

保持：

```text
wxt.config.ts
```

显式 host configuration。

当前：

```text
https://x.com/*
```

不要增加 YouTube。

不要申请额外 permissions。

保持 minimum permissions 原则。

---

# 26. Architecture Documentation

新增一个简短架构说明。

可以：

```text
ARCHITECTURE.md
```

或 README 中增加 Architecture section。

推荐独立：

```text
ARCHITECTURE.md
```

内容必须简洁。

包括：

```text
PlatformAdapter
Core
TranslationProvider
LanguagePair
UI
```

以及扩展示例：

### Add a platform

```text
1. Create platforms/<platform>.ts
2. Register adapter
3. Add host match
4. Add platform tests
5. Verify in real browser
```

### Add a provider

```text
1. Implement TranslationProvider
2. Register provider
3. Add provider tests
```

### Add language support

```text
1. Add language configuration
2. Verify provider capability
3. Add product/UI behavior only when required
```

特别注明：

> Architecture supports future capabilities. Current product scope remains X + zh → en + Chrome Translator.

---

# 27. Architecture Acceptance Criteria

本次完成后，必须满足：

### Platform isolation

搜索 Core：

不应该出现：

```text
x.com
tweetTextarea
Draft.js
data-testid specific to X
```

### Translator isolation

搜索 Core：

不应该出现：

```text
Translator.create
window.Translator
Chrome Translator API lifecycle
```

### Language isolation

不应该继续以：

```text
translateZhToEn()
```

作为核心 API。

### Thin entrypoint

`content.ts` 不再承担完整业务逻辑。

### Existing behavior

X 的所有现有核心流程继续工作。

---

# 28. Verification

完成后执行项目真实命令：

```bash
<package-manager> install
<typecheck>
<tests>
<build>
```

如果存在 browser regression tests，也执行。

然后人工确认：

```text
New Post: PASS / FAIL
Reply: PASS / FAIL
Quote Post: PASS / FAIL / N/A
IME: PASS / FAIL
Replace: PASS / FAIL
Continue editing: PASS / FAIL
Post button: PASS / FAIL
```

不要为了让 tests 通过而删除测试或降低断言。

---

# 29. Final Report

完成后输出：

## Architecture

说明新的模块关系。

## Files Changed

列出：

```text
created
moved
modified
deleted
```

## Platform Boundary

说明 X-specific 代码现在在哪里。

## Translation Boundary

说明 Chrome Translator API 现在如何隔离。

## Language Boundary

说明 zh → en 如何变成配置。

## Core

说明 controller/session 当前职责。

## Regression

说明旧行为是否完全保持。

## Verification

输出：

```text
typecheck: PASS / FAIL
tests: PASS / FAIL
build: PASS / FAIL

New Post: PASS / FAIL
Reply: PASS / FAIL
Quote Post: PASS / FAIL / N/A
```

如果真实浏览器测试无法自动完成：

明确说明：

```text
Requires manual browser verification
```

不要虚构 PASS。

---

# Final Principle

NativeType 当前不是要增加更多功能。

本次工作的目标是让未来：

```text
YouTube
Reddit
Japanese
DeepL
AI Rewrite Provider
```

等能力可以自然接入，而不会不断污染已有代码。

最终目标：

```text
Stable Core
+
Replaceable Platform Adapter
+
Replaceable Translation Provider
+
Configurable Language Pair
```

但始终遵守：

> Build extension points for known variation, not abstractions for imagined complexity.

保持现有 v0 行为稳定，比架构形式上的完美更重要。