import { fileURLToPath } from 'node:url'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'NativeType',
      meta: [
        { name: 'theme-color', content: '#fcfcfd' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/icon-128.png' },
        { rel: 'apple-touch-icon', href: '/icon-128.png' },
      ],
    },
  },

  // Pages set `noindex, follow` in the default layout.
  // Do not set a production URL or canonical until the domain is confirmed.
  // Hybrid Cloudflare Worker: prerender the site, and run /api/** on the Worker.
  routeRules: {
    '/': { prerender: true },
    '/privacy': { prerender: true },
    '/support': { prerender: true },
    '/changelog': { prerender: true },
    '/api/**': { prerender: false },
  },

  nitro: {
    preset: 'cloudflare_module',
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
    },
    hooks: {
      'rollup:before'(nitro, config) {
        // Keep the dev/prerender entries; wrap only the production Worker.
        if (nitro.options.preset === 'cloudflare-module') {
          config.input = fileURLToPath(new URL('./worker/entry.ts', import.meta.url))
        }
      },
    },
    prerender: {
      crawlLinks: true,
      routes: ['/', '/privacy', '/support', '/changelog'],
      ignore: ['/api', '/api/**'],
    },
  },
})
