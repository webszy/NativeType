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
 * Checked 2026-10-28: the repository has no published GitHub Releases or tags.
 * The Chrome Web Store lists v0.0.3, but supplies no versioned release notes.
 * Leave this empty rather than infer changes or publication dates.
 * Sources: https://github.com/webszy/NativeType/releases
 * https://chromewebstore.google.com/detail/nativetype/emicomnfbabkhcpphlihhbddhlmkdhfk
 */
export const changelogReleases: readonly ChangelogRelease[] = []
