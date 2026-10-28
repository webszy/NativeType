<script setup lang="ts">
type DemoPhase = 'writing' | 'preview' | 'replaced'

const sourceText = '今天发布了我的新项目 NativeType。现在我可以直接在 X 上用中文写作，再转换成英文。'
const translationText = 'Today I launched my new project, NativeType. Now I can write in Chinese on X and translate it into English directly.'

const phase = ref<DemoPhase>('writing')
const statusMessage = ref('')
const translateButton = ref<HTMLButtonElement | null>(null)
const replaceButton = ref<HTMLButtonElement | null>(null)
const resetButton = ref<HTMLButtonElement | null>(null)

const composerText = computed(() => (phase.value === 'replaced' ? translationText : sourceText))
const composerLang = computed(() => (phase.value === 'replaced' ? 'en' : 'zh-Hans'))

const steps = [
  { id: 'writing', number: '1', label: 'Writing' },
  { id: 'preview', number: '2', label: 'Preview' },
  { id: 'replaced', number: '3', label: 'Replaced' },
] as const

async function focusButton(button: HTMLButtonElement | null) {
  await nextTick()
  button?.focus()
}

function showPreview() {
  if (phase.value !== 'writing') return
  phase.value = 'preview'
  statusMessage.value = 'Translation preview is open.'
  void focusButton(replaceButton.value)
}

function replaceText() {
  if (phase.value !== 'preview') return
  phase.value = 'replaced'
  statusMessage.value = 'The composer text was replaced with the English example.'
  void focusButton(resetButton.value)
}

function closePreview() {
  if (phase.value !== 'preview') return
  phase.value = 'writing'
  statusMessage.value = 'Translation preview closed.'
  void focusButton(translateButton.value)
}

function resetDemo() {
  if (phase.value === 'writing') return
  phase.value = 'writing'
  statusMessage.value = 'Demo reset. The composer shows the Chinese example.'
  void focusButton(translateButton.value)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && phase.value === 'preview') {
    event.preventDefault()
    closePreview()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="demo">
    <p class="demo-label">Interactive Demo</p>
    <div class="demo-float">
      <div class="demo-card">
        <div class="composer-head">
          <p id="composer-label" class="composer-context">Composer on X</p>
          <span class="demo-chip">Demo</span>
        </div>
        <div class="composer-row">
          <span class="avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <circle cx="12" cy="9" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6" />
              <path d="M6.2 18.2c1.3-2.4 3.3-3.5 5.8-3.5s4.5 1.1 5.8 3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
          </span>
          <div class="composer-body">
            <p class="composer-text" :lang="composerLang" aria-labelledby="composer-label">
              <Transition name="text-swap" mode="out-in">
                <span :key="composerLang">{{ composerText }}</span>
              </Transition>
            </p>
            <div class="preview-slot" :class="{ 'is-open': phase === 'preview' }">
              <div class="preview-clip">
                <section
                  class="preview"
                  aria-label="NativeType translation preview"
                  :aria-hidden="phase !== 'preview'"
                >
                  <div class="preview-head">
                    <span class="preview-brand">
                      <img src="/icon-128.png" width="16" height="16" alt="">
                      NativeType
                    </span>
                    <span class="preview-pair">ZH → EN</span>
                    <button
                      class="preview-close"
                      type="button"
                      aria-label="Close preview"
                      :disabled="phase !== 'preview'"
                      @click="closePreview"
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                  </div>
                  <p class="preview-body" lang="en">{{ translationText }}</p>
                  <div class="preview-actions">
                    <button
                      ref="replaceButton"
                      class="btn btn-primary btn-sm"
                      type="button"
                      :disabled="phase !== 'preview'"
                      @click="replaceText"
                    >Replace</button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
        <div class="composer-bar">
          <div class="composer-tools" aria-hidden="true">
            <span class="tool-icon">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <rect x="4" y="5" width="16" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.6" />
                <circle cx="9" cy="10" r="1.4" fill="currentColor" />
                <path d="M7 16.5l3.2-3.2 2.2 2.1 2-2.4L18 16.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
              </svg>
            </span>
            <span class="tool-icon">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="1.6" />
                <circle cx="9.2" cy="10.4" r="0.9" fill="currentColor" />
                <circle cx="14.8" cy="10.4" r="0.9" fill="currentColor" />
                <path d="M9 14.2c.8 1 1.8 1.5 3 1.5s2.2-.5 3-1.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              </svg>
            </span>
          </div>
          <button
            ref="translateButton"
            class="btn btn-primary btn-sm btn-translate"
            type="button"
            :disabled="phase !== 'writing'"
            :aria-pressed="phase === 'preview'"
            @click="showPreview"
          >
            <img src="/icon-128.png" width="16" height="16" alt="">
            Translate
          </button>
          <button class="btn btn-post btn-sm" type="button" disabled aria-label="Post is unavailable in this demo">Post</button>
        </div>
      </div>
    </div>

    <div class="demo-controls">
      <div class="phases" role="list" aria-label="Demo steps">
        <span
          v-for="step in steps"
          :key="step.id"
          class="phase"
          role="listitem"
          :class="{ 'is-active': phase === step.id }"
          :aria-current="phase === step.id ? 'step' : undefined"
        >
          <span class="phase-num">{{ step.number }}</span>
          {{ step.label }}
        </span>
      </div>
      <button
        ref="resetButton"
        class="btn btn-secondary btn-sm"
        type="button"
        :disabled="phase === 'writing'"
        @click="resetDemo"
      >Reset</button>
    </div>
    <p class="demo-hint">Interactive demo with preset text. This page does not translate what you type.</p>
    <p class="sr-only" aria-live="polite">{{ statusMessage }}</p>
  </div>
</template>
