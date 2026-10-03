import { describeLanguagePair } from '../languages/config';
import { TranslationError, type TranslationProvider, type TranslationRequest } from './types';

interface TranslatorInstance {
  translate(text: string, options?: { signal?: AbortSignal }): Promise<string>;
  destroy(): void;
}
interface TranslatorAPI {
  availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<'unavailable' | 'downloadable' | 'downloading' | 'available'>;
  create(options: {
    sourceLanguage: string;
    targetLanguage: string;
    monitor?: (monitor: { addEventListener(type: 'downloadprogress', listener: (event: { loaded: number }) => void): void }) => void;
  }): Promise<TranslatorInstance>;
}

interface PairState {
  instance?: TranslatorInstance;
  creating?: Promise<TranslatorInstance>;
  progressListeners: Set<(progress: number) => void>;
}

export function createChromeTranslationProvider(): TranslationProvider {
  const pairs = new Map<string, PairState>();
  let disposed = false;

  function api(): TranslatorAPI {
    const translator = (globalThis as typeof globalThis & { Translator?: TranslatorAPI }).Translator;
    if (!translator) throw new TranslationError('unsupported', 'Chrome Translator is unavailable. Use the latest desktop Chrome.');
    return translator;
  }

  async function ready(request: TranslationRequest, pair: PairState): Promise<TranslatorInstance> {
    if (disposed) throw new DOMException('Disposed', 'AbortError');
    if (pair.instance) return pair.instance;
    if (pair.creating) return pair.creating;
    const translator = api();
    const languages = { sourceLanguage: request.source, targetLanguage: request.target };
    // The explicit button path calls create before awaiting, preserving user activation.
    if (!request.activated) {
      const availability = await translator.availability(languages);
      if (availability === 'unavailable') {
        throw new TranslationError('unsupported', `${describeLanguagePair(request)} translation is unavailable in this Chrome installation.`);
      }
      if (availability !== 'available') {
        throw new TranslationError('enable', 'Enable Chrome translation. Chrome may download a language pack the first time.');
      }
      if (disposed) throw new DOMException('Disposed', 'AbortError');
      if (pair.instance) return pair.instance;
      if (pair.creating) return pair.creating;
    }
    pair.creating = translator.create({
      ...languages,
      monitor(monitor) {
        monitor.addEventListener('downloadprogress', ({ loaded }) => {
          for (const listener of pair.progressListeners) listener(Math.round(Math.max(0, Math.min(1, loaded)) * 100));
        });
      },
    });
    try {
      const result = await pair.creating;
      if (disposed) {
        result.destroy();
        throw new DOMException('Disposed', 'AbortError');
      }
      pair.instance = result;
      return result;
    } finally {
      pair.creating = undefined;
    }
  }

  return {
    id: 'chrome',
    downloadProgressText: progress => `Downloading Chrome language model… ${progress}%`,
    async translate(text, request) {
      if (disposed) throw new DOMException('Disposed', 'AbortError');
      const key = JSON.stringify([request.source, request.target]);
      let pair = pairs.get(key);
      if (!pair) {
        pair = { progressListeners: new Set() };
        pairs.set(key, pair);
      }
      pair.progressListeners.add(request.onProgress);
      try {
        const translator = await ready(request, pair);
        request.signal.throwIfAborted();
        const result = await translator.translate(text, { signal: request.signal });
        request.signal.throwIfAborted();
        if (!result.trim()) throw new TranslationError('error', 'Chrome returned an empty translation. Try again.');
        return result;
      } catch (error) {
        if (request.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) throw error;
        if (error instanceof TranslationError) throw error;
        const name = error instanceof Error ? error.name : '';
        if (name === 'NotAllowedError') {
          throw new TranslationError('enable', 'Click Enable translation to allow Chrome to initialize its translator.');
        }
        if (name === 'NotSupportedError') {
          throw new TranslationError('unsupported', `${describeLanguagePair(request)} translation is not supported by this Chrome installation.`);
        }
        // Do not log the error payload: it may contain the user's text.
        console.debug('[NativeType] Translator failed:', name || 'Unknown error');
        throw new TranslationError('error', 'Translation failed. Check Chrome’s language-pack download and connection, then retry.');
      } finally {
        pair.progressListeners.delete(request.onProgress);
      }
    },
    dispose() {
      disposed = true;
      for (const pair of pairs.values()) {
        pair.instance?.destroy();
        pair.progressListeners.clear();
      }
      pairs.clear();
    },
  };
}
