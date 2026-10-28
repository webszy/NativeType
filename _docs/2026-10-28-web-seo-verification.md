# NativeType 官网 SEO 与社交分享验收

日期：2026-10-28（Asia/Shanghai）。

部署前本地实现与验收通过。四个公开页面的服务端 HTML 均包含完整且唯一的页面标题、描述、canonical、Open Graph 和 Twitter Card 标签。本记录保留部署前的检查结果；后续线上状态以发布后的验证为准。

## 新增和修改的文件

| 文件 | 变化 |
| --- | --- |
| `apps/web/app/composables/useSiteSeo.ts` | 新增统一 SEO 默认值、社交分享标签和 canonical 处理。 |
| `apps/web/app/pages/index.vue` | 使用统一首页标题和描述。 |
| `apps/web/app/pages/privacy.vue` | 使用 Privacy 专属标题和描述。 |
| `apps/web/app/pages/support.vue` | 使用 Support 专属标题和描述。 |
| `apps/web/app/pages/changelog.vue` | 使用 Changelog 专属标题和描述，保留原有动态 robots 规则。 |
| `apps/web/nuxt.config.ts` | 更新已过期的 SEO 注释；配置行为不变。 |
| `apps/web/public/og/nativetype-og.png` | 新增标准尺寸分享图片。 |
| `apps/web/README.md` | 记录 SEO 配置、canonical、分享图和现有 robots 规则。 |
| `_docs/2026-10-28-web-seo-verification.md` | 本验收记录。 |

用户提供的 `apps/web/public/og-image.png` 原图完整保留。未添加或升级依赖。

## 统一配置

`apps/web/app/composables/useSiteSeo.ts` 使用 Nuxt 原生 `useSeoMeta()` 和 `useHead()`。页面可以覆盖默认标题和描述；所有页面共用图片及其 alt。

| 配置 | 值 |
| --- | --- |
| Site Name | `NativeType` |
| Site URL | `https://typewith.si` |
| Language | `en`，沿用 `nuxt.config.ts` 的 `htmlAttrs.lang` |
| OG Locale | `en_US` |
| OG Type | `website` |
| Twitter Card | `summary_large_image` |
| OG Image | `https://typewith.si/og/nativetype-og.png` |

canonical 和 `og:url` 从不包含 query 或 fragment 的 `route.path` 生成，固定使用正式 HTTPS 域名。首页保留尾部 `/`，其他页面去除尾部 `/`。未设置未经确认的 `twitter:site` 或 `twitter:creator`。

## 四个页面

下表中的标题和描述同时用于普通 SEO、Open Graph 和 Twitter Card。

| 页面 | Title | Description | Canonical | Robots |
| --- | --- | --- | --- | --- |
| `/` | NativeType — Type with confidence. | Write in your own language. Publish in another. NativeType helps you translate directly in X, preview the result, and replace your draft in one click. | `https://typewith.si/` | `noindex, follow` |
| `/privacy` | Privacy Policy — NativeType | Learn how NativeType processes translations locally and handles optional usage statistics, browser storage, and your privacy choices. | `https://typewith.si/privacy` | `noindex, follow` |
| `/support` | Support & FAQ — NativeType | Get help with NativeType installation, translation previews, language settings, browser compatibility, and troubleshooting. | `https://typewith.si/support` | `noindex, follow` |
| `/changelog` | Changelog — NativeType | Explore NativeType release notes, new features, improvements, and bug fixes. | `https://typewith.si/changelog` | 当前为 `index, follow`；继续沿用无发布记录时 `noindex, follow` 的原有规则。 |

## OG 图片

- 原图：`apps/web/public/og-image.png`，PNG，1672 × 941。
- 发布图片：`apps/web/public/og/nativetype-og.png`，PNG，1200 × 630，792806 字节。
- 处理：等比缩放至 630 px 高，再在左右补白至 1200 px 宽，保留 Logo、标题、文案和翻译演示。
- `og:image:width`、`og:image:height`、`og:image:type` 与实际文件一致。
- `.output/public/og/nativetype-og.png` 与源文件逐字节一致。
- 本地已构建 Worker 的 GET 和 HEAD 均返回 `200`、`Content-Type: image/png`，无登录或重定向要求；GET 内容与图片源文件一致。

正式 URL：[https://typewith.si/og/nativetype-og.png](https://typewith.si/og/nativetype-og.png)。2026-10-28 20:54（Asia/Shanghai）的部署前只读 HEAD 检查为 `404`、`application/json`。此为部署前结果；线上直连需要发布后复核。

## 验收结果

| 检查 | 结果 |
| --- | --- |
| `pnpm --filter @nativetype/web typecheck` | 通过，包含 Nuxt TypeScript、Worker binding 类型检查和 Worker TypeScript。 |
| `pnpm build:web` | 通过，Nuxt 客户端、SSR、四个页面预渲染和 Nitro `cloudflare-module` Worker 构建完成。 |
| `pnpm --filter @nativetype/web exec wrangler deploy --dry-run` | 通过，使用 Nitro 生成的部署配置，正确打包 Worker、40 个静态资源文件及既有绑定。 |
| `pnpm test:web` | 通过，27 项 Vitest 测试及 12 项配置测试。 |
| `pnpm test:web:built` | 通过，6 项已构建 Worker 回归测试。 |
| 四个页面预渲染 HTML | 通过，每页各有唯一的 title、canonical 及 18 项相关 meta 标签。 |
| 四个页面实际 HTTP HTML | 通过，全部返回 200，内容与已核验的预渲染 HTML 完全一致。 |
| query、fragment、尾斜杠 | 通过，本地 HTTP 路径变体均输出规范化的正式域名 canonical 与 `og:url`。 |
| 浏览器站内导航 | 通过，首页 → Privacy → Support → Changelog → 首页，标题、描述、canonical 和分享标签正确更新且无重复。 |
| 浏览器控制台 | 本次导航检查无 warning 或 error。 |
| 图片 | 构建产物包含真实 1200 × 630 PNG，本地 GET/HEAD 的 MIME、状态与内容检查通过。 |
| 页面 UI | 四个页面的 template 与修改前逐字节一致，未修改样式或视觉组件。 |
| `git diff --check` | 通过。 |

每页检查了 `description`、`robots`、`og:title`、`og:description`、`og:image`、`og:image:alt`、`og:image:width`、`og:image:height`、`og:image:type`、`og:url`、`og:type`、`og:site_name`、`og:locale`、`twitter:card`、`twitter:title`、`twitter:description`、`twitter:image`、`twitter:image:alt`，以及单独的 `<title>`、canonical 和 `html[lang]`。

本地构建中没有缺失或冲突的任务所需 SEO／分享标签。现有 robots、robots.txt、路由、Hybrid Worker 部署架构、统计 API、D1 binding 和 Extension 均保持原有行为。Worker 测试使用一次性的本地测试绑定；未操作线上数据库。
