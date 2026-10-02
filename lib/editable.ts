const composerSelector = '[contenteditable="true"][role="textbox"][data-testid^="tweetTextarea_"]';

export function findComposer(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>(composerSelector) : null;
}

export function readComposer(composer: HTMLElement): string {
  const blocks = composer.querySelectorAll<HTMLElement>('[data-block="true"]');
  const text = blocks.length ? Array.from(blocks, block => block.innerText.replace(/\n$/, '')).join('\n') : composer.innerText;
  return text.replace(/\r\n/g, '\n').replace(/\u00a0/g, ' ');
}

export function containsChinese(text: string): boolean {
  return /\p{Script=Han}/u.test(text);
}

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

export async function replaceComposer(composer: HTMLElement, source: string, translation: string): Promise<boolean> {
  if (!composer.isConnected || readComposer(composer) !== source) return false;
  composer.focus({ preventScroll: true });
  // Finish the initiating click/focus handlers before changing X's selection.
  await new Promise<void>(resolve => setTimeout(resolve, 0));
  if (!composer.isConnected || document.activeElement !== composer || readComposer(composer) !== source) return false;
  const selection = window.getSelection();
  if (!selection) return false;
  const range = document.createRange();
  range.selectNodeContents(composer);
  selection.removeAllRanges();
  selection.addRange(range);
  // Draft.js reads selection through React's onSelect; mouseup flushes that snapshot.
  composer.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  // X defers selection updates beyond the first animation frame.
  await new Promise<void>(resolve => setTimeout(resolve, 50));
  if (!composer.isConnected || document.activeElement !== composer || readComposer(composer) !== source) return false;

  const currentRange = selection.rangeCount === 1 ? selection.getRangeAt(0) : null;
  // Draft normalizes element boundaries to text-node boundaries for the same selection.
  if (!currentRange || !composer.contains(selection.anchorNode) || !composer.contains(selection.focusNode)
    || currentRange.toString() !== range.toString()) return false;

  // X's Draft.js paste handler updates its editor state and renders the replacement.
  // Native insertText can mutate Draft's managed text nodes without synchronizing them.
  const clipboard = new DataTransfer();
  clipboard.setData('text/plain', translation);
  const handled = !composer.dispatchEvent(new ClipboardEvent('paste', {
    clipboardData: clipboard,
    bubbles: true,
    cancelable: true,
    composed: true,
  }));
  if (!handled) return false;
  await nextFrame();
  return readComposer(composer) === translation.replace(/\r\n/g, '\n').replace(/\u00a0/g, ' ');
}
