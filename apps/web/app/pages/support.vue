<script setup lang="ts">
import { githubUrl, supportEmail } from '~/site'

useSeoMeta({
  title: 'Support & FAQ — NativeType',
  description: 'Get help with NativeType. Find installation instructions, troubleshooting tips, translation FAQs, and ways to contact the developer.',
})

const issuesUrl = `${githubUrl}/issues`

const steps = [
  {
    id: 'install',
    number: '01',
    title: 'Install NativeType',
    text: 'Install NativeType from the Chrome Web Store and open X in your desktop Chrome browser.',
  },
  {
    id: 'write',
    number: '02',
    title: 'Write Naturally',
    text: 'Start writing in a supported X composer using your configured language. NativeType detects your writing and prepares a translation preview.',
  },
  {
    id: 'replace',
    number: '03',
    title: 'Preview & Replace',
    text: 'Review the translation, then click Replace to insert it into your draft. You stay in control of what gets published.',
  },
] as const

interface SupportFaq {
  id: string
  question: string
  paragraphs: string[]
  checklist?: string[]
  followUp?: string[]
  privacyLink?: boolean
}

const faqs: SupportFaq[] = [
  {
    id: 'compatibility',
    question: 'Which browsers and websites does NativeType support?',
    paragraphs: [
      'NativeType currently supports X on desktop Google Chrome.',
      'It is designed for posts, replies, and quote posts. Support for additional websites may be added in future versions.',
      "NativeType requires Chrome's built-in translation capabilities, which may not be available in other browsers or on every device.",
    ],
  },
  {
    id: 'missing-preview',
    question: "Why isn't the translation preview appearing?",
    paragraphs: [
      "First, make sure you're using NativeType in a supported X composer.",
      'Then check the following:',
    ],
    checklist: [
      'NativeType is installed and enabled.',
      "Your configured language matches the language you're typing.",
      'Translation is enabled for the current composer type in Settings.',
      'Your text contains enough recognizable language content.',
    ],
    followUp: [
      'Very short text, links, emojis, or mixed-language input may not trigger translation.',
      'If the problem continues, reload the X tab and try again.',
    ],
  },
  {
    id: 'unavailable-translation',
    question: 'Why does NativeType say translation is unavailable?',
    paragraphs: [
      "NativeType relies on Chrome's built-in Translator API.",
      'The first time you use a language pair, Chrome may need to download a language pack. Follow the Enable translation prompt when it appears.',
      "Make sure you're using an up-to-date version of desktop Google Chrome and have an internet connection for the initial model download.",
      'Some language pairs or devices may not be supported by Chrome.',
    ],
  },
  {
    id: 'language-settings',
    question: 'How do I change the translation languages?',
    paragraphs: [
      'Click the NativeType icon in your Chrome toolbar to open Settings.',
      'Choose your preferred trigger language and target language. You can also control which supported X composer types activate translation.',
      'Available options depend on your installed NativeType version.',
    ],
  },
  {
    id: 'publishing',
    question: 'Does NativeType automatically publish my posts?',
    paragraphs: [
      'No. NativeType only helps translate and replace text inside the editor.',
      'You review the translation and decide whether to replace your draft. Publishing always remains your decision.',
    ],
  },
  {
    id: 'privacy',
    question: 'Does NativeType upload my writing?',
    paragraphs: [
      "No. Translation uses Chrome's built-in, on-device Translator API.",
      'Your original text and translated drafts are not sent to NativeType servers.',
      'Optional usage statistics are separate from translation and are disabled by default. They can be managed in Settings.',
    ],
    privacyLink: true,
  },
  {
    id: 'account',
    question: 'Can I use NativeType without an account or API key?',
    paragraphs: [
      'Yes. NativeType does not require an account, subscription, or external translation API key.',
      'Chrome manages the translation models used by the extension.',
    ],
  },
]
</script>

<template>
  <article class="wrap support-page">
    <header class="support-intro">
      <p class="eyebrow">NativeType / Support</p>
      <h1>Support</h1>
      <p class="support-tagline">Need a hand with NativeType?</p>
      <p class="support-description">Find answers to common questions, troubleshoot translation issues, or get in touch with us.</p>
    </header>

    <section class="support-section" aria-labelledby="getting-started-title">
      <h2 id="getting-started-title">Getting Started</h2>
      <ol class="steps">
        <li v-for="step in steps" :key="step.id" class="step support-step">
          <p class="step-index">
            <span>{{ step.number }}</span>
            <span class="step-rule" aria-hidden="true" />
          </p>
          <h3>{{ step.title }}</h3>
          <p class="support-step-description">{{ step.text }}</p>
          <div v-if="step.id === 'install'" class="support-install">
            <InstallButton size="sm" />
          </div>
        </li>
      </ol>
    </section>

    <section class="support-section" aria-labelledby="faq-title">
      <h2 id="faq-title">Frequently Asked Questions</h2>
      <div class="faq-list">
        <details v-for="faq in faqs" :id="`faq-${faq.id}`" :key="faq.id" class="faq-item">
          <summary>
            <span>{{ faq.question }}</span>
            <svg class="faq-chevron" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </summary>
          <div class="faq-answer">
            <p v-for="paragraph in faq.paragraphs" :key="paragraph">{{ paragraph }}</p>
            <ul v-if="faq.checklist">
              <li v-for="item in faq.checklist" :key="item">{{ item }}</li>
            </ul>
            <p v-for="paragraph in faq.followUp" :key="paragraph">{{ paragraph }}</p>
            <p v-if="faq.privacyLink">
              Read our <NuxtLink to="/privacy">Privacy Policy</NuxtLink> for more information.
            </p>
          </div>
        </details>
      </div>
    </section>

    <section class="support-section" aria-labelledby="contact-title">
      <h2 id="contact-title">Still Need Help?</h2>
      <p class="support-description">Can't find what you're looking for? We're happy to hear about bugs, compatibility issues, and ideas for improvement.</p>
      <div class="support-contact-grid">
        <article class="support-contact-card">
          <h3>Report an Issue</h3>
          <p>Found something that isn't working?</p>
          <p>Open an issue on GitHub and include your Chrome version, NativeType version, what happened, and the steps to reproduce it.</p>
          <p>Please avoid sharing private drafts or personal information in public issues.</p>
          <a class="btn btn-secondary" :href="issuesUrl" target="_blank" rel="noopener noreferrer">Open GitHub Issues</a>
        </article>
        <article class="support-contact-card">
          <h3>Contact the Developer</h3>
          <p>For general questions or matters you prefer not to discuss publicly, you can contact the developer by email.</p>
          <a class="btn btn-secondary" :href="`mailto:${supportEmail}`">Send an Email</a>
        </article>
      </div>
    </section>

    <footer class="support-end">
      <p>NativeType is an experimental, open-source Chrome extension.</p>
      <div class="support-end-links">
        <a :href="githubUrl" target="_blank" rel="noopener noreferrer">View Source on GitHub</a>
        <span aria-hidden="true">·</span>
        <NuxtLink to="/privacy">Privacy Policy</NuxtLink>
      </div>
    </footer>
  </article>
</template>

<style scoped>
.support-page {
  margin-block: 72px 96px;
}

.support-intro {
  max-width: 640px;
}

.support-intro h1 {
  margin: 16px 0 0;
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 600;
  letter-spacing: -0.045em;
  line-height: 1.05;
}

.support-tagline {
  margin: 20px 0 0;
  font-size: 20px;
  font-weight: 500;
  letter-spacing: -0.025em;
}

.support-description {
  max-width: 640px;
  margin: 12px 0 0;
  color: var(--muted);
  font-size: 15px;
  line-height: 1.7;
}

.support-section {
  margin-top: 64px;
}

.support-section h2 {
  margin: 0;
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 600;
  letter-spacing: -0.035em;
  line-height: 1.2;
}

.support-step {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.support-step-description {
  margin: 0;
  color: var(--muted);
  font-size: 15px;
  line-height: 1.6;
}

.support-install {
  margin-top: 20px;
}

.faq-list {
  margin-top: 28px;
  border: 1px solid rgb(0 0 0 / 0.06);
  border-radius: 24px;
  background: var(--card);
}

.faq-item + .faq-item {
  border-top: 1px solid rgb(0 0 0 / 0.06);
}

.faq-item summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  min-height: 68px;
  padding: 20px 24px;
  color: var(--foreground);
  font-size: 15px;
  font-weight: 500;
  line-height: 1.5;
  list-style: none;
  cursor: pointer;
}

.faq-item summary::-webkit-details-marker {
  display: none;
}

.faq-item summary:focus-visible {
  outline-offset: -4px;
  border-radius: 12px;
}

.faq-chevron {
  flex: none;
  color: var(--muted);
}

.faq-item[open] .faq-chevron {
  transform: rotate(180deg);
}

.faq-answer {
  max-width: 80ch;
  padding: 0 24px 24px;
  color: var(--muted);
  font-size: 15px;
  line-height: 1.7;
}

.faq-answer p {
  margin: 0;
}

.faq-answer p + p,
.faq-answer ul + p {
  margin-top: 12px;
}

.faq-answer ul {
  margin: 12px 0 0;
  padding-left: 1.25em;
}

.faq-answer li + li {
  margin-top: 6px;
}

.faq-answer a,
.support-end a {
  color: var(--foreground);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.support-contact-grid {
  display: grid;
  gap: 20px;
  margin-top: 28px;
}

.support-contact-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 24px;
  border: 1px solid rgb(0 0 0 / 0.06);
  border-radius: 24px;
  background: var(--card);
}

.support-contact-card h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.25;
}

.support-contact-card p {
  margin: 12px 0 0;
  color: var(--muted);
  font-size: 15px;
  line-height: 1.7;
}

.support-contact-card p:last-of-type {
  margin-bottom: 24px;
}

.support-contact-card .btn {
  margin-top: auto;
}

.support-end {
  margin-top: 48px;
  padding-top: 24px;
  border-top: 1px solid rgb(0 0 0 / 0.06);
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}

.support-end p {
  margin: 0;
}

.support-end-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-top: 12px;
}

@media (min-width: 640px) {
  .support-contact-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 639px) {
  .support-page {
    margin-block: 48px 64px;
  }

  .support-section {
    margin-top: 48px;
  }

  .faq-item summary {
    padding: 18px 20px;
  }

  .faq-answer {
    padding: 0 20px 20px;
  }
}
</style>
