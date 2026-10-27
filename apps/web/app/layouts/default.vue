<script setup lang="ts">
useSeoMeta({
  robots: 'noindex, follow',
})
</script>

<template>
  <div class="site">
    <a class="skip" href="#main">Skip to content</a>
    <SiteHeader />
    <main id="main">
      <slot />
    </main>
    <SiteFooter />
  </div>
</template>
