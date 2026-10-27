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
    v-if="chromeWebStoreUrl"
    class="btn btn-primary"
    :class="sizeClass"
    :href="chromeWebStoreUrl"
    target="_blank"
    rel="noopener noreferrer"
  >Add to Chrome</a>
  <button
    v-else
    class="btn btn-primary is-unavailable"
    :class="sizeClass"
    type="button"
    aria-disabled="true"
    aria-label="Add to Chrome. Chrome Web Store link is not configured yet."
    title="Chrome Web Store link is not configured yet"
  >Add to Chrome</button>
</template>
