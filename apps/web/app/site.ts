/** Public site links. Do not invent a Chrome Web Store URL. */

export const githubUrl = 'https://github.com/webszy/NativeType'

/**
 * Real Chrome Web Store listing URL.
 * Leave this empty until the listing is published. Install buttons stay
 * non-navigating while it is empty, and they must not point at GitHub.
 */
export const chromeWebStoreUrl = ''

export const makerLinks = [
  { label: 'webify.tools', href: 'https://webify.tools' },
  { label: 'deepusername.ai', href: 'https://deepusername.ai' },
  { label: 'deepcheck.dev', href: 'https://deepcheck.dev' },
] as const
