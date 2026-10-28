<script setup lang="ts">
import { chromeWebStoreUrl, githubUrl } from '~/site'

useSiteSeo()

const steps = [
  { number: '01', title: 'Write', text: 'Write in Chinese, naturally.' },
  { number: '02', title: 'Translate', text: 'Preview the English translation without leaving X.' },
  { number: '03', title: 'Replace', text: 'Replace your original text and keep writing.' },
]

const features = [
  { title: 'Write Directly on X', text: 'No copying and pasting between tabs.' },
  { title: 'Preview Before Replacing', text: 'Review the translation before changing your original text.' },
  { title: 'Powered by Chrome', text: "Uses Chrome's built-in Translator API." },
]
</script>

<template>
  <div>
    <section class="hero" aria-labelledby="hero-title">
      <div class="wrap">
        <a
          class="hero-brand fade-up"
          :href="chromeWebStoreUrl"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="NativeType on the Chrome Web Store"
        >
          <img src="/icon-128.png" width="30" height="30" alt="">
          <span>NativeType</span>
          <svg class="hero-brand-arrow" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 7h10v10" />
            <path d="M7 17 17 7" />
          </svg>
        </a>
        <h1 id="hero-title" class="hero-title fade-up delay-1">Type with confidence.</h1>
        <p class="lede fade-up delay-2">Write in your own language. Publish in another.</p>
        <TranslationDemo class="fade-up delay-3" />
        <div class="hero-actions fade-up delay-4">
          <InstallButton />
          <a class="btn btn-secondary" :href="githubUrl" target="_blank" rel="noopener noreferrer">View on GitHub</a>
        </div>
      </div>
    </section>

    <section id="how-it-works" class="section" aria-labelledby="how-title">
      <div class="wrap">
        <h2 id="how-title" class="section-title">How it works</h2>
        <ol class="steps">
          <li v-for="step in steps" :key="step.number" class="step">
            <p class="step-index">
              <span>{{ step.number }}</span>
              <span class="step-rule" aria-hidden="true" />
            </p>
            <h3>{{ step.title }}</h3>
            <p>{{ step.text }}</p>
          </li>
        </ol>
      </div>
    </section>

    <section class="section" aria-labelledby="features-title">
      <div class="wrap">
        <h2 id="features-title" class="section-title">Features</h2>
        <ul class="feature-grid">
          <li v-for="feature in features" :key="feature.title">
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.text }}</p>
          </li>
        </ul>
      </div>
    </section>

    <section class="section" aria-labelledby="open-source-title">
      <div class="wrap">
        <div class="open-panel">
          <h2 id="open-source-title" class="section-title">Open source. Built to make writing across languages easier.</h2>
          <a class="btn btn-primary" :href="githubUrl" target="_blank" rel="noopener noreferrer">View on GitHub</a>
        </div>
      </div>
    </section>
  </div>
</template>
