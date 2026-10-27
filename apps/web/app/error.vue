<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps<{
  error: NuxtError
}>()

useSeoMeta({
  title: 'Error — NativeType',
})
</script>

<template>
  <NuxtLayout>
    <article class="text-page">
      <h1>{{ error.statusCode === 404 ? 'Page not found' : 'Something went wrong' }}</h1>
      <p>This page is not available.</p>
      <NuxtLink class="text-link" to="/">Back to home</NuxtLink>
    </article>
  </NuxtLayout>
</template>
