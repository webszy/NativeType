import { canonicalLanguage } from '../languages/catalog';
import { defaultLanguagePair } from '../languages/config';

export interface NativeTypeSettings {
  schemaVersion: 1;
  translation: {
    sourceLanguage: string;
    targetLanguage: string;
  };
  contexts: {
    x: {
      post: boolean;
      reply: boolean;
      quote: boolean;
    };
  };
}

export interface SettingsBackend {
  read(): Promise<unknown>;
  write(value: NativeTypeSettings): Promise<void>;
  watch(listener: (value: unknown) => void): () => void;
}

export interface SettingsStore {
  load(): Promise<NativeTypeSettings>;
  save(settings: NativeTypeSettings): Promise<void>;
  subscribe(listener: (settings: NativeTypeSettings) => void): () => void;
}

export function getDefaultSettings(): NativeTypeSettings {
  return {
    schemaVersion: 1,
    translation: {
      sourceLanguage: defaultLanguagePair.source,
      targetLanguage: defaultLanguagePair.target,
    },
    contexts: {
      x: {
        post: true,
        reply: true,
        quote: true,
      },
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function differentTarget(source: string): string {
  return source === 'en' ? 'zh' : 'en';
}

export function normalizeSettings(input: unknown): NativeTypeSettings {
  const defaults = getDefaultSettings();
  const record = isRecord(input) ? input : {};
  const translation = isRecord(record.translation) ? record.translation : {};
  const contexts = isRecord(record.contexts) ? record.contexts : {};
  const x = isRecord(contexts.x) ? contexts.x : {};
  let sourceLanguage = canonicalLanguage(translation.sourceLanguage) ?? defaults.translation.sourceLanguage;
  let targetLanguage = canonicalLanguage(translation.targetLanguage) ?? defaults.translation.targetLanguage;
  if (sourceLanguage === targetLanguage) targetLanguage = differentTarget(sourceLanguage);
  return {
    schemaVersion: 1,
    translation: { sourceLanguage, targetLanguage },
    contexts: {
      x: {
        post: typeof x.post === 'boolean' ? x.post : defaults.contexts.x.post,
        reply: typeof x.reply === 'boolean' ? x.reply : defaults.contexts.x.reply,
        quote: typeof x.quote === 'boolean' ? x.quote : defaults.contexts.x.quote,
      },
    },
  };
}

export function sameSettings(left: NativeTypeSettings, right: NativeTypeSettings): boolean {
  return left.translation.sourceLanguage === right.translation.sourceLanguage
    && left.translation.targetLanguage === right.translation.targetLanguage
    && left.contexts.x.post === right.contexts.x.post
    && left.contexts.x.reply === right.contexts.x.reply
    && left.contexts.x.quote === right.contexts.x.quote;
}

export function createSettingsStore(backend: SettingsBackend): SettingsStore {
  return {
    async load() {
      return normalizeSettings(await backend.read());
    },
    async save(settings) {
      await backend.write(normalizeSettings(settings));
    },
    subscribe(listener) {
      return backend.watch(value => listener(normalizeSettings(value)));
    },
  };
}

export function createMemoryBackend(initial?: unknown): SettingsBackend & { current(): unknown } {
  let value = initial;
  const listeners = new Set<(value: unknown) => void>();
  return {
    read: async () => value,
    write: async next => {
      value = next;
      for (const listener of listeners) listener(value);
    },
    watch(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    current: () => value,
  };
}
