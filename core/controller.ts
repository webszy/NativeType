import { isTranslatableInput, type LanguagePair } from '../languages/config';
import type { PlatformAdapter } from '../platforms/types';
import { TranslationError, type TranslationProvider } from '../translators/types';
import { createOverlay, type PreviewState } from '../ui/overlay';
import { beginRequest, cancelSession, createSession, isCurrentRequest } from './session';

export interface ExtensionHost {
  listen(target: Document, type: string, listener: (event: Event) => void): void;
  onInvalidated(listener: () => void): void;
}

export function startNativeType(options: {
  platform: PlatformAdapter;
  provider: TranslationProvider;
  languagePair: LanguagePair;
  host: ExtensionHost;
}): void {
  const { platform, provider, languagePair, host } = options;
  const session = createSession();
  const overlay = createOverlay(() => {
    if (!session.replacing) void translate(true);
  }, async () => {
    if (!session.editor || session.preview?.kind !== 'translated' || session.composing || session.replacing) return;
    if (platform.getText(session.editor) !== session.sourceText) {
      refresh();
      return;
    }
    const editor = session.editor;
    const translation = session.preview.text;
    const source = session.sourceText;
    session.replacing = true;
    cancelSession(session);
    let success = false;
    try {
      success = await platform.replaceText(editor, source, translation);
    } catch {
      success = false;
    } finally {
      session.replacing = false;
    }
    if (session.editor !== editor) {
      refresh();
      return;
    }
    if (success) {
      session.sourceText = platform.getText(editor);
      session.preview = undefined;
      overlay.hide();
    } else {
      session.preview = { kind: 'error', text: platform.replacementErrorMessage };
      overlay.show(editor, session.preview);
    }
  }, editor => platform.previewLayout(editor), languagePair);

  function refresh() {
    if (!session.editor || session.replacing) return;
    const text = platform.getText(session.editor);
    if (text === session.sourceText && (session.preview || session.timer)) return;
    cancelSession(session);
    session.sourceText = text;
    session.preview = undefined;
    overlay.hide();
    if (session.composing || !text.trim() || !isTranslatableInput(text, languagePair)) return;
    if (session.cached?.source === text) {
      session.preview = { kind: 'translated', text: session.cached.translation };
      overlay.show(session.editor, session.preview);
      return;
    }
    session.timer = setTimeout(() => {
      session.timer = undefined;
      void translate(false);
    }, 1000);
  }

  async function translate(activated: boolean) {
    if (!session.editor?.isConnected || session.composing) return;
    const editor = session.editor;
    if (activated) editor.focus({ preventScroll: true });
    const text = platform.getText(editor);
    if (!text.trim() || !isTranslatableInput(text, languagePair)) {
      refresh();
      return;
    }
    const snapshot = beginRequest(session, editor, text);
    const current = () => isCurrentRequest(session, snapshot, editor => platform.getText(editor));
    function show(next: PreviewState) {
      if (!current()) return;
      session.preview = next;
      overlay.show(editor, next);
    }
    show({ kind: 'translating', text: 'Translating…' });
    try {
      const result = await provider.translate(text, {
        source: languagePair.source,
        target: languagePair.target,
        signal: snapshot.signal,
        activated,
        onProgress: progress => show({ kind: 'downloading', text: provider.downloadProgressText(progress) }),
      });
      if (!current()) return;
      session.cached = { source: text, translation: result };
      show({ kind: 'translated', text: result });
    } catch (error) {
      if (!current()) return;
      show(error instanceof TranslationError
        ? { kind: error.kind, text: error.message }
        : { kind: 'error', text: 'Translation failed. Please retry.' });
    }
  }

  function deactivate() {
    cancelSession(session);
    const stopObserving = session.stopObserving;
    session.stopObserving = undefined;
    stopObserving?.();
    session.editor = null;
    session.sourceText = '';
    session.composing = false;
    session.preview = undefined;
    overlay.hide();
  }

  function activate(editor: HTMLElement) {
    if (session.editor !== editor) {
      deactivate();
      session.editor = editor;
      session.stopObserving = platform.observe(editor, {
        onEdit() {
          if (!session.editor) return;
          if (platform.getText(session.editor) !== session.sourceText) refresh();
          overlay.reposition();
        },
        onDetach() {
          deactivate();
        },
      });
    }
    refresh();
  }

  host.listen(document, 'focusin', event => {
    if (event.target === overlay.host) return;
    const editor = platform.findEditor(event.target);
    if (editor) activate(editor);
    else deactivate();
  });
  host.listen(document, 'focusout', () => {
    // Native focus transitions can expose BODY until the next task (including AX clicks).
    setTimeout(() => {
      if (document.activeElement !== overlay.host && !platform.findEditor(document.activeElement)) deactivate();
    });
  });
  host.listen(document, 'input', event => {
    if (session.replacing) return;
    const editor = platform.findEditor(event.target);
    if (!editor || platform.findEditor(document.activeElement) !== editor) return;
    activate(editor);
  });
  host.listen(document, 'compositionstart', event => {
    const editor = platform.findEditor(event.target);
    if (!editor) return;
    activate(editor);
    session.composing = true;
    cancelSession(session);
    session.preview = undefined;
    overlay.hide();
  });
  host.listen(document, 'compositionend', event => {
    if (platform.findEditor(event.target) !== session.editor) return;
    session.composing = false;
    refresh();
  });
  host.onInvalidated(() => {
    deactivate();
    overlay.destroy();
    provider.dispose();
  });
  const focused = platform.findEditor(document.activeElement);
  if (focused) activate(focused);
}
