import type { PlatformAdapter, PlatformEditorListener, PreviewLayout } from './types';

const composerSelector = '[contenteditable="true"][role="textbox"][data-testid^="tweetTextarea_"]';

function readText(editor: HTMLElement): string {
  const blocks = editor.querySelectorAll<HTMLElement>('[data-block="true"]');
  const text = blocks.length ? Array.from(blocks, block => block.innerText.replace(/\n$/, '')).join('\n') : editor.innerText;
  return text.replace(/\r\n/g, '\n').replace(/\u00a0/g, ' ');
}

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

async function replaceText(editor: HTMLElement, source: string, translation: string): Promise<boolean> {
  if (!editor.isConnected || readText(editor) !== source) return false;
  editor.focus({ preventScroll: true });
  // Finish the initiating click/focus handlers before changing X's selection.
  await new Promise<void>(resolve => setTimeout(resolve, 0));
  if (!editor.isConnected || document.activeElement !== editor || readText(editor) !== source) return false;
  const selection = window.getSelection();
  if (!selection) return false;
  const range = document.createRange();
  range.selectNodeContents(editor);
  selection.removeAllRanges();
  selection.addRange(range);
  // Draft.js reads selection through React's onSelect; mouseup flushes that snapshot.
  editor.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  // X defers selection updates beyond the first animation frame.
  await new Promise<void>(resolve => setTimeout(resolve, 50));
  if (!editor.isConnected || document.activeElement !== editor || readText(editor) !== source) return false;

  const currentRange = selection.rangeCount === 1 ? selection.getRangeAt(0) : null;
  // Draft normalizes element boundaries to text-node boundaries for the same selection.
  if (!currentRange || !editor.contains(selection.anchorNode) || !editor.contains(selection.focusNode)
    || currentRange.toString() !== range.toString()) return false;

  // X's Draft.js paste handler updates its editor state and renders the replacement.
  // Native insertText can mutate Draft's managed text nodes without synchronizing them.
  const clipboard = new DataTransfer();
  clipboard.setData('text/plain', translation);
  const handled = !editor.dispatchEvent(new ClipboardEvent('paste', {
    clipboardData: clipboard,
    bubbles: true,
    cancelable: true,
    composed: true,
  }));
  if (!handled) return false;
  await nextFrame();
  return readText(editor) === translation.replace(/\r\n/g, '\n').replace(/\u00a0/g, ' ');
}

function previewLayout(editor: HTMLElement): PreviewLayout {
  let reserveAfter = editor.closest<HTMLElement>('[data-testid$="RichTextInputContainer"]') ?? editor;
  const container = editor.closest<HTMLElement>('[role="dialog"]') ?? document.body;
  while (reserveAfter.parentElement && reserveAfter.parentElement !== container) {
    const layout = getComputedStyle(reserveAfter.parentElement);
    if (layout.display === 'flex' && layout.flexDirection === 'column') break;
    reserveAfter = reserveAfter.parentElement;
  }
  return { container, reserveAfter };
}

function observe(editor: HTMLElement, listener: PlatformEditorListener): () => void {
  const observer = new MutationObserver(records => {
    if (!editor.isConnected) {
      listener.onDetach();
      return;
    }
    if (records.some(record => record.target === editor || editor.contains(record.target))) listener.onEdit();
  });
  observer.observe(editor, { childList: true, subtree: true, characterData: true });
  // Watch only direct child changes along its ancestor path so removal of
  // the composer or an enclosing dialog also releases the observer.
  for (let parent = editor.parentElement; parent; parent = parent.parentElement) {
    observer.observe(parent, { childList: true });
  }
  return () => observer.disconnect();
}

export const xPlatform: PlatformAdapter = {
  id: 'x',
  replacementErrorMessage: 'X could not accept the replacement. Your current draft is still in the editor. Retry translation before replacing again.',
  matches: location => location.hostname === 'x.com',
  findEditor: target => target instanceof Element ? target.closest<HTMLElement>(composerSelector) : null,
  getText: readText,
  replaceText,
  observe,
  previewLayout,
};
