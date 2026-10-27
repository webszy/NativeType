// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // Placeholder pages set `noindex, follow` in the default layout.
  // Add future site meta here. Do not set a production URL or canonical until the domain is confirmed.
  nitro: {
    prerender: {
      routes: ['/', '/privacy', '/support', '/changelog'],
    },
  },
})
