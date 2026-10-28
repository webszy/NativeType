<script setup lang="ts">
import { chromeWebStoreUrl } from '~/site'

const props = withDefaults(defineProps<{
  size?: 'md' | 'sm'
}>(), {
  size: 'md',
})

const sizeClass = computed(() => (props.size === 'sm' ? 'btn-sm' : undefined))
</script>

<template>
  <a
    class="btn btn-primary"
    :class="sizeClass"
    :href="chromeWebStoreUrl"
    target="_blank"
    rel="noopener noreferrer"
  >Add to Chrome</a>
</template>
