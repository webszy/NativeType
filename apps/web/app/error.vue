<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps<{
  error: NuxtError
}>()
</script>

<template>
  <NuxtLayout>
    <h1>{{ error.statusCode === 404 ? '404' : 'Error' }}</h1>
  </NuxtLayout>
</template>
