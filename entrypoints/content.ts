import { containsChinese, findComposer, readComposer, replaceComposer } from '../lib/editable';
import { createOverlay, type PreviewState } from '../lib/overlay';
import { createTranslationService, TranslationError } from '../lib/translator';

export default defineContentScript({
  matches: ['https://x.com/*'],
  runAt: 'document_idle',
  main(ctx) {
    const translator = createTranslationService();
    let active: HTMLElement | null = null;
    let source = '';
    let state: PreviewState | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let request: AbortController | undefined;
    let revision = 0;
    let composing = false;
    let replacing = false;
    let cached: { source: string; translation: string } | undefined;
    const overlay = createOverlay(() => { if (!replacing) void translate(true); }, async () => {
      if (!active || state?.kind !== 'translated' || composing || replacing) return;
      if (readComposer(active) !== source) {
        refresh();
        return;
      }
      const composer = active;
      const translation = state.text;
      replacing = true;
      cancel();
      let success = false;
      try {
        success = await replaceComposer(composer, source, translation);
      } catch {
        success = false;
      } finally {
        replacing = false;
      }
      if (active !== composer) { refresh(); return; }
      if (success) {
        source = readComposer(composer);
        state = undefined;
        overlay.hide();
      } else {
        state = { kind: 'error', text: 'X could not accept the replacement. Your current draft is still in the editor. Retry translation before replacing again.' };
        overlay.show(composer, state);
      }
    });

    function cancel() {
      clearTimeout(timer);
      timer = undefined;
      request?.abort();
      request = undefined;
      revision++;
    }

    function deactivate() {
      cancel();
      observer.disconnect();
      active = null;
      source = '';
      composing = false;
      state = undefined;
      overlay.hide();
    }

    function refresh() {
      if (!active || replacing) return;
      const text = readComposer(active);
      if (text === source && (state || timer)) return;
      cancel();
      source = text;
      state = undefined;
      overlay.hide();
      if (composing || !text.trim() || !containsChinese(text)) return;
      if (cached?.source === text) {
        state = { kind: 'translated', text: cached.translation };
        overlay.show(active, state);
        return;
      }
      timer = setTimeout(() => { timer = undefined; void translate(false); }, 1000);
    }

    async function translate(activated: boolean) {
      if (!active?.isConnected || composing) return;
      const composer = active;
      if (activated) composer.focus({ preventScroll: true });
      const text = readComposer(composer);
      if (!text.trim() || !containsChinese(text)) { refresh(); return; }
      cancel();
      source = text;
      const currentRevision = revision;
      const controller = new AbortController();
      request = controller;
      const current = () => !controller.signal.aborted && currentRevision === revision && active === composer && composer.isConnected && readComposer(composer) === text;
      function show(next: PreviewState) {
        if (!current()) return;
        state = next;
        overlay.show(composer, next);
      }
      show({ kind: 'translating', text: 'Translating…' });
      try {
        const result = await translator.translate(text, controller.signal, activated, progress => {
          show({ kind: 'downloading', text: `Downloading Chrome language model… ${progress}%` });
        });
        if (!current()) return;
        cached = { source: text, translation: result };
        show({ kind: 'translated', text: result });
      } catch (error) {
        if (!current()) return;
        show(error instanceof TranslationError
          ? { kind: error.kind, text: error.message }
          : { kind: 'error', text: 'Translation failed. Please retry.' });
      }
    }

    function activate(composer: HTMLElement) {
      if (active !== composer) {
        deactivate();
        active = composer;
        observer.observe(composer, { childList: true, subtree: true, characterData: true });
        // Watch only direct child changes along its ancestor path so removal of
        // the composer or an enclosing dialog also releases the observer.
        for (let parent = composer.parentElement; parent; parent = parent.parentElement) {
          observer.observe(parent, { childList: true });
        }
      }
      refresh();
    }
    ctx.addEventListener(document, 'focusin', event => {
      if (event.target === overlay.host) return;
      const composer = findComposer(event.target);
      if (composer) activate(composer);
      else deactivate();
    });
    ctx.addEventListener(document, 'focusout', () => {
      // Native focus transitions can expose BODY until the next task (including AX clicks).
      setTimeout(() => {
        if (document.activeElement !== overlay.host && !findComposer(document.activeElement)) deactivate();
      });
    });
    ctx.addEventListener(document, 'input', event => {
      if (replacing) return;
      const composer = findComposer(event.target);
      if (!composer || findComposer(document.activeElement) !== composer) return;
      activate(composer);
    });
    ctx.addEventListener(document, 'compositionstart', event => {
      const composer = findComposer(event.target);
      if (!composer) return;
      activate(composer);
      composing = true;
      cancel();
      state = undefined;
      overlay.hide();
    });
    ctx.addEventListener(document, 'compositionend', event => {
      if (findComposer(event.target) !== active) return;
      composing = false;
      refresh();
    });
    const observer = new MutationObserver(records => {
      const composer = active;
      if (!composer) return;
      if (!composer.isConnected) { deactivate(); return; }
      if (records.some(record => record.target === composer || composer.contains(record.target))) {
        if (readComposer(composer) !== source) refresh();
        overlay.reposition();
      }
    });
    ctx.onInvalidated(() => {
      deactivate();
      overlay.destroy();
      translator.dispose();
    });
    const focused = findComposer(document.activeElement);
    if (focused) activate(focused);
  },
});
