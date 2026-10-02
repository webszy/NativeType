type Availability = 'unavailable' | 'downloadable' | 'downloading' | 'available';
interface TranslatorInstance {
  translate(text: string, options?: { signal?: AbortSignal }): Promise<string>;
  destroy(): void;
}
interface TranslatorAPI {
  availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<Availability>;
  create(options: {
    sourceLanguage: string;
    targetLanguage: string;
    monitor?: (monitor: { addEventListener(type: 'downloadprogress', listener: (event: { loaded: number }) => void): void }) => void;
  }): Promise<TranslatorInstance>;
}

export class TranslationError extends Error {
  constructor(public readonly kind: 'unsupported' | 'enable' | 'error', message: string) {
    super(message);
  }
}

const languages = { sourceLanguage: 'zh', targetLanguage: 'en' };

export function createTranslationService() {
  let instance: TranslatorInstance | undefined;
  let creating: Promise<TranslatorInstance> | undefined;
  let disposed = false;
  const progressListeners = new Set<(progress: number) => void>();

  function api(): TranslatorAPI {
    const translator = (globalThis as typeof globalThis & { Translator?: TranslatorAPI }).Translator;
    if (!translator) throw new TranslationError('unsupported', 'Chrome Translator is unavailable. Use the latest desktop Chrome.');
    return translator;
  }

  async function ready(activated: boolean): Promise<TranslatorInstance> {
    if (disposed) throw new DOMException('Disposed', 'AbortError');
    if (instance) return instance;
    if (creating) return creating;
    const translator = api();
    // The explicit button path calls create before awaiting, preserving user activation.
    if (!activated) {
      const availability = await translator.availability(languages);
      if (availability === 'unavailable') {
        throw new TranslationError('unsupported', 'Chinese → English translation is unavailable in this Chrome installation.');
      }
      if (availability !== 'available') {
        throw new TranslationError('enable', 'Enable Chrome translation. Chrome may download a language pack the first time.');
      }
      if (disposed) throw new DOMException('Disposed', 'AbortError');
      if (instance) return instance;
      if (creating) return creating;
    }
    creating = translator.create({
      ...languages,
      monitor(monitor) {
        monitor.addEventListener('downloadprogress', ({ loaded }) => {
          for (const listener of progressListeners) listener(Math.round(Math.max(0, Math.min(1, loaded)) * 100));
        });
      },
    });
    try {
      const result = await creating;
      if (disposed) {
        result.destroy();
        throw new DOMException('Disposed', 'AbortError');
      }
      instance = result;
      return result;
    } finally {
      creating = undefined;
    }
  }

  return {
    async translate(text: string, signal: AbortSignal, activated: boolean, onProgress: (progress: number) => void) {
      progressListeners.add(onProgress);
      try {
        const translator = await ready(activated);
        signal.throwIfAborted();
        const result = await translator.translate(text, { signal });
        signal.throwIfAborted();
        if (!result.trim()) throw new TranslationError('error', 'Chrome returned an empty translation. Try again.');
        return result;
      } catch (error) {
        if (signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) throw error;
        if (error instanceof TranslationError) throw error;
        const name = error instanceof Error ? error.name : '';
        if (name === 'NotAllowedError') {
          throw new TranslationError('enable', 'Click Enable translation to allow Chrome to initialize its translator.');
        }
        if (name === 'NotSupportedError') {
          throw new TranslationError('unsupported', 'Chinese → English translation is not supported by this Chrome installation.');
        }
        // Do not log the error payload: it may contain the user's text.
        console.debug('[NativeType] Translator failed:', name || 'Unknown error');
        throw new TranslationError('error', 'Translation failed. Check Chrome’s language-pack download and connection, then retry.');
      } finally {
        progressListeners.delete(onProgress);
      }
    },
    dispose() {
      disposed = true;
      instance?.destroy();
      instance = undefined;
      progressListeners.clear();
    },
  };
}
