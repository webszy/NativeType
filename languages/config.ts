export type LanguageCode = string;

export interface LanguagePair {
  source: LanguageCode;
  target: LanguageCode;
}

export const defaultLanguagePair: LanguagePair = {
  source: 'zh',
  target: 'en',
};

export function isTranslatableInput(text: string, pair: LanguagePair): boolean {
  if (pair.source !== 'zh' || pair.target !== 'en') return false;
  return /\p{Script=Han}/u.test(text);
}

export function describeLanguagePair(pair: LanguagePair): string {
  const names = new Intl.DisplayNames(['en'], { type: 'language' });
  return `${names.of(pair.source)} → ${names.of(pair.target)}`;
}
