<script setup lang="ts">
import { githubUrl, makerLinks } from '~/site'

const footerLinks = [
  { label: 'Home', to: '/' },
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Support', to: '/support' },
  { label: 'Changelog', to: '/changelog' },
] as const
</script>

<template>
  <footer class="footer">
    <div class="wrap footer-grid">
      <div class="footer-brand">
        <NuxtLink to="/" class="brand">
          <img src="/icon-128.png" width="22" height="22" alt="">
          <span>NativeType</span>
        </NuxtLink>
        <p>Write in your language. Publish in another.</p>
      </div>
      <nav aria-label="Footer">
        <ul class="footer-links">
          <li v-for="link in footerLinks" :key="link.to">
            <NuxtLink :to="link.to">{{ link.label }}</NuxtLink>
          </li>
          <li>
            <a :href="githubUrl" target="_blank" rel="noopener noreferrer">GitHub</a>
          </li>
        </ul>
      </nav>
      <div>
        <p class="footer-label">More from the maker</p>
        <ul class="footer-links">
          <li v-for="link in makerLinks" :key="link.href">
            <a :href="link.href" target="_blank" rel="noopener noreferrer">{{ link.label }}</a>
          </li>
        </ul>
      </div>
      <p class="footer-copy">© 2026 NativeType</p>
    </div>
  </footer>
</template>
