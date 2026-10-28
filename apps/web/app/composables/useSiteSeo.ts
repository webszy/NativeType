const siteSeo = {
  name: 'NativeType',
  url: 'https://typewith.si',
  locale: 'en_US',
  title: 'NativeType — Type with confidence.',
  description: 'Write in your own language. Publish in another. NativeType helps you translate directly in X, preview the result, and replace your draft in one click.',
  image: {
    path: '/og/nativetype-og.png',
    width: 1200,
    height: 630,
    type: 'image/png',
    alt: 'NativeType — Type with confidence. Write in your own language. Publish in another. Preview and replace a Chinese draft with its English translation on X.',
  },
} as const

interface SiteSeoOptions {
  title?: string
  description?: string
}

/** Shared metadata for public pages, rendered on the server and on navigation. */
export function useSiteSeo(options: SiteSeoOptions = {}) {
  const route = useRoute()
  const title = options.title ?? siteSeo.title
  const description = options.description ?? siteSeo.description
  const imageUrl = `${siteSeo.url}${siteSeo.image.path}`
  // route.path excludes queries and fragments; only the homepage keeps a trailing slash.
  const canonicalUrl = computed(() => `${siteSeo.url}${route.path.replace(/\/+$/, '') || '/'}`)

  useSeoMeta({
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogImage: imageUrl,
    ogImageAlt: siteSeo.image.alt,
    ogImageWidth: siteSeo.image.width,
    ogImageHeight: siteSeo.image.height,
    ogImageType: siteSeo.image.type,
    ogUrl: () => canonicalUrl.value,
    ogType: 'website',
    ogSiteName: siteSeo.name,
    ogLocale: siteSeo.locale,
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: imageUrl,
    twitterImageAlt: siteSeo.image.alt,
  })

  useHead(() => ({
    link: [{ key: 'canonical', rel: 'canonical', href: canonicalUrl.value }],
  }))
}
