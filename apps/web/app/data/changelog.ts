export const changelogCategories = ['Added', 'Improved', 'Fixed'] as const

export type ChangelogCategory = (typeof changelogCategories)[number]

export interface ChangelogRelease {
  version: string
  /** Verified publication date in YYYY-MM-DD format; omit if unknown. */
  releaseDate?: string
  title: string
  changes: Partial<Record<ChangelogCategory, readonly string[]>>
  /** Link only to an existing published release. */
  releaseUrl?: string
}

/**
 * Add only confirmed published releases and their documented changes.
 * Package versions, commit messages, and commit dates are not release records.
 * Dated entries are displayed newest first; undated entries retain their order
 * after dated releases. Empty change categories are not displayed.
 *
 * v0.0.4 is the current product release: public site, language settings, composer
 * controls, and the usage API. GitHub has no matching Release or tag.
 * v0.0.3 remains the Chrome Web Store listing as of 2026-10-28.
 * Store listing: https://chromewebstore.google.com/detail/nativetype/emicomnfbabkhcpphlihhbddhlmkdhfk
 */
export const changelogReleases: readonly ChangelogRelease[] = [
  {
    version: '0.0.4',
    releaseDate: '2026-10-28',
    title: 'Official website, language settings, and statistics API',
    changes: {
      Added: [
        'Launched the official NativeType website at typewith.si.',
        'Choose source and target languages in Settings, covering Chrome Translator language pairs.',
        'Control where translation appears on X: new posts, replies, and quote posts.',
        'Optional statistics API for translation, replace, and error counts.',
      ],
    },
  },
  {
    version: '0.0.3',
    releaseDate: '2026-10-05',
    title: 'Basic translation, now on the Chrome Web Store',
    changes: {
      Added: [
        'Chinese-to-English translation inside the X composer, with an instant preview and one-click replace.',
        'Published NativeType on the Chrome Web Store.',
      ],
    },
  },
]
