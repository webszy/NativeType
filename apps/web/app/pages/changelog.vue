<script setup lang="ts">
import { changelogCategories, changelogReleases } from '~/data/changelog'
import { githubUrl } from '~/site'

const releases = [...changelogReleases]
  .sort((left, right) => (right.releaseDate ?? '').localeCompare(left.releaseDate ?? ''))
  .map(release => ({
    ...release,
    groups: changelogCategories.flatMap(category => {
      const items = release.changes[category]
      return items?.length ? [{ category, items }] : []
    }),
  }))

const releasesUrl = `${githubUrl}/releases`
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

function formatReleaseDate(date: string): string {
  return dateFormatter.format(new Date(`${date}T00:00:00Z`))
}

function formatVersion(version: string): string {
  return version.startsWith('v') ? version : `v${version}`
}

useSiteSeo({
  title: 'Changelog — NativeType',
  description: 'Explore NativeType release notes, new features, improvements, and bug fixes.',
})

useSeoMeta({
  robots: releases.length ? 'index, follow' : 'noindex, follow',
}, { tagPriority: 'high' })
</script>

<template>
  <article class="wrap changelog-page">
    <header class="changelog-hero">
      <p class="eyebrow">PRODUCT UPDATES</p>
      <h1>What's new in NativeType.</h1>
      <p class="changelog-subtitle">Small improvements, one version at a time.</p>
    </header>

    <ol v-if="releases.length" class="release-timeline" role="list" aria-label="Release history">
      <li v-for="release in releases" :key="release.version" class="release-item">
        <article class="release-entry" :aria-labelledby="`release-${release.version}`">
          <header class="release-meta">
            <p class="release-version">{{ formatVersion(release.version) }}</p>
            <time v-if="release.releaseDate" :datetime="release.releaseDate">{{ formatReleaseDate(release.releaseDate) }}</time>
          </header>
          <div class="release-content">
            <h2 :id="`release-${release.version}`">{{ release.title }}</h2>
            <section v-for="group in release.groups" :key="group.category" class="release-group" :aria-labelledby="`release-${release.version}-${group.category}`">
              <h3 :id="`release-${release.version}-${group.category}`">{{ group.category }}</h3>
              <ul>
                <li v-for="item in group.items" :key="item">{{ item }}</li>
              </ul>
            </section>
            <a v-if="release.releaseUrl" class="text-link" :href="release.releaseUrl" target="_blank" rel="noopener noreferrer">View release on GitHub</a>
          </div>
        </article>
      </li>
    </ol>

    <section v-else class="changelog-empty" aria-labelledby="empty-release-title">
      <h2 id="empty-release-title">No release notes yet.</h2>
      <p>Check back here for the next NativeType update.</p>
    </section>

    <footer class="changelog-footer">
      <a class="btn btn-secondary" :href="releasesUrl" target="_blank" rel="noopener noreferrer">View all releases on GitHub</a>
    </footer>
  </article>
</template>

<style scoped>
.changelog-page {
  max-width: 900px;
  margin-block: 72px 96px;
}

.changelog-hero {
  max-width: 800px;
  margin-inline: auto;
  text-align: center;
}

.changelog-hero h1 {
  margin: 16px 0 0;
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 600;
  letter-spacing: -0.045em;
  line-height: 1.05;
}

.changelog-subtitle {
  margin: 20px 0 0;
  color: var(--muted);
  font-size: 15px;
  line-height: 1.7;
}

.release-timeline {
  position: relative;
  margin: 64px 0 0;
  padding: 0;
  list-style: none;
}

.release-timeline::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 164px;
  width: 1px;
  background: rgb(0 0 0 / 0.08);
  content: '';
}

.release-item + .release-item {
  border-top: 1px solid rgb(0 0 0 / 0.06);
}

.release-entry {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  gap: 24px;
  padding-block: 40px;
}

.release-item:first-child .release-entry {
  padding-top: 0;
}

.release-item:last-child .release-entry {
  padding-bottom: 0;
}

.release-meta {
  min-width: 0;
}

.release-version {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.release-meta time {
  display: block;
  margin-top: 8px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}

.release-content {
  min-width: 0;
  padding-left: 36px;
  overflow-wrap: anywhere;
}

.release-content h2 {
  margin: 0;
  font-size: clamp(1.25rem, 2.5vw, 1.5rem);
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.25;
}

.release-group {
  margin-top: 24px;
}

.release-group h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
}

.release-group ul {
  margin: 8px 0 0;
  padding-left: 1.15em;
  color: var(--muted);
  font-size: 15px;
  line-height: 1.7;
}

.release-group li + li {
  margin-top: 6px;
}

.changelog-empty {
  margin-top: 64px;
  padding: 48px 24px;
  border-block: 1px solid rgb(0 0 0 / 0.06);
  text-align: center;
}

.changelog-empty h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 500;
  letter-spacing: -0.025em;
  line-height: 1.4;
}

.changelog-empty p {
  margin: 12px 0 0;
  color: var(--muted);
  font-size: 15px;
  line-height: 1.7;
}

.changelog-footer {
  margin-top: 48px;
  text-align: center;
}

@media (max-width: 639px) {
  .changelog-page {
    margin-block: 48px 64px;
  }

  .release-timeline,
  .changelog-empty {
    margin-top: 48px;
  }

  .release-timeline::before {
    left: 0;
  }

  .release-entry {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
    padding-left: 24px;
  }

  .release-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 8px 16px;
  }

  .release-meta time {
    margin-top: 0;
  }

  .release-content {
    padding-left: 0;
  }
}
</style>
