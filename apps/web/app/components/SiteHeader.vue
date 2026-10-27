<script setup lang="ts">
import { githubUrl } from '~/site'

const scrolled = ref(false)

function onScroll() {
  scrolled.value = window.scrollY > 8
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <header class="header" :class="{ 'is-scrolled': scrolled }">
    <div class="wrap header-inner">
      <NuxtLink to="/" class="brand">
        <img src="/icon-128.png" width="22" height="22" alt="">
        <span>NativeType</span>
      </NuxtLink>
      <nav class="nav" aria-label="Main">
        <NuxtLink class="nav-link" to="/#how-it-works">How it Works</NuxtLink>
        <a class="nav-link" :href="githubUrl" target="_blank" rel="noopener noreferrer">GitHub</a>
        <InstallButton size="sm" />
      </nav>
    </div>
  </header>
</template>
