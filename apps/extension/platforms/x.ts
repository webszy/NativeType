import type { PlatformAdapter, PlatformEditorListener, PreviewLayout } from './types';

const composerSelector = '[contenteditable="true"][role="textbox"][data-testid^="tweetTextarea_"]';

function readText(editor: HTMLElement): string {
  const blocks = editor.querySelectorAll<HTMLElement>('[data-block="true"]');
  const text = blocks.length ? Array.from(blocks, block => block.innerText.replace(/\n$/, '')).join('\n') : editor.innerText;
  return text.replace(/\r\n/g, '\n').replace(/\u00a0/g, ' ');
}

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

async function replaceText(editor: HTMLElement, source: string, translation: string, canReplace: () => boolean = () => true): Promise<boolean> {
  if (!canReplace() || !editor.isConnected || readText(editor) !== source) return false;
  editor.focus({ preventScroll: true });
  // Finish the initiating click/focus handlers before changing X's selection.
  await new Promise<void>(resolve => setTimeout(resolve, 0));
  if (!canReplace() || !editor.isConnected || document.activeElement !== editor || readText(editor) !== source) return false;
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
  if (!canReplace() || !editor.isConnected || document.activeElement !== editor || readText(editor) !== source) return false;

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

const menuSelector = '[role="menu"], [role="menuitem"], [data-testid="Dropdown"]';

export interface WritingSignals {
  connected: boolean;
  inMenu: boolean;
  quoteInShell: boolean;
  quoteOutsideShell: boolean;
  reply: boolean;
}

export function isStatusReplyPath(pathname: string): boolean {
  return /\/status\/\d+/.test(pathname);
}

export function resolveWritingContext(signals: WritingSignals): 'post' | 'reply' | 'quote' | 'unknown' {
  if (!signals.connected || signals.inMenu) return 'unknown';
  if (signals.quoteInShell) return 'quote';
  if (signals.quoteOutsideShell && signals.reply) return 'unknown';
  if (signals.quoteOutsideShell) return 'quote';
  if (signals.reply) return 'reply';
  return 'post';
}

function shellOf(editor: HTMLElement): HTMLElement {
  let shell: HTMLElement = editor;
  for (let node = editor.parentElement; node && node !== document.documentElement; node = node.parentElement) {
    if (node === document.body || node.matches('[data-testid="primaryColumn"]')) break;
    const editors = node.querySelectorAll(composerSelector);
    const onlyThisEditor = editors.length === 1 && editors[0] === editor;
    if (!onlyThisEditor) break;
    const parentTweet = [...node.querySelectorAll('article[data-testid="tweet"]')].some(article => !article.contains(editor));
    if (parentTweet) break;
    shell = node;
  }
  return shell;
}

function isComposerQuote(quote: Element, editor: HTMLElement): boolean {
  if (editor.contains(quote) || quote.closest(menuSelector)) return false;
  const tweet = quote.closest('article[data-testid="tweet"]');
  if (tweet && !tweet.contains(editor)) return false;
  let owner = quote.parentElement;
  while (owner && !owner.contains(editor)) owner = owner.parentElement;
  const editors = owner?.querySelectorAll(composerSelector);
  return editors?.length === 1 && editors[0] === editor;
}

function hasComposerQuote(scope: ParentNode, editor: HTMLElement): boolean {
  if ([...scope.querySelectorAll('[data-testid="quoteTweet"]')].some(quote => isComposerQuote(quote, editor))) return true;
  // Current X renders a quote as an attached post button, without quoteTweet
  // or a status link. Require its author and timestamp so media/link cards
  // and the quoted post inside a reply's parent tweet do not count.
  return [...scope.querySelectorAll('[data-testid="attachments"]')].some(attachment =>
    isComposerQuote(attachment, editor)
    && [...attachment.querySelectorAll('button[role="button"]')].some(card =>
      isComposerQuote(card, editor)
      && card.querySelector('[data-testid="User-Name"]')
      && card.querySelector('time[datetime]')));
}

function hasReplyAnchor(editor: HTMLElement, shell: HTMLElement): boolean {
  const dialog = editor.closest('[role="dialog"]');
  if (dialog) {
    return [...dialog.querySelectorAll('article[data-testid="tweet"]')].some(article => !article.contains(editor) && !shell.contains(article));
  }
  let node: HTMLElement | null = shell;
  while (node && !node.matches('[data-testid="primaryColumn"]')) {
    let sibling = node.previousElementSibling;
    while (sibling) {
      if (sibling.querySelector('article[data-testid="tweet"]')) return true;
      sibling = sibling.previousElementSibling;
    }
    node = node.parentElement;
  }
  return isStatusReplyPath(location.pathname);
}

function writingContext(editor: HTMLElement): 'post' | 'reply' | 'quote' | 'unknown' {
  const shell = editor.isConnected ? shellOf(editor) : editor;
  const dialog = editor.closest('[role="dialog"]');
  const quoteInShell = editor.isConnected && hasComposerQuote(shell, editor);
  const outsideScope = dialog && dialog !== shell ? dialog : null;
  return resolveWritingContext({
    connected: editor.isConnected,
    inMenu: editor.closest(menuSelector) !== null,
    quoteInShell,
    quoteOutsideShell: !quoteInShell && !!outsideScope && hasComposerQuote(outsideScope, editor),
    reply: editor.isConnected && hasReplyAnchor(editor, shell),
  });
}

function previewLayout(editor: HTMLElement): PreviewLayout {
  return {
    container: editor.closest<HTMLElement>('[role="dialog"]') ?? document.body,
    heightTarget: editor.closest<HTMLElement>('[data-testid$="RichTextInputContainer"]') ?? editor,
  };
}

function observe(editor: HTMLElement, listener: PlatformEditorListener): () => void {
  const scope = editor.closest<HTMLElement>('[role="dialog"]') ?? shellOf(editor);
  const observer = new MutationObserver(records => {
    if (!editor.isConnected) {
      listener.onDetach();
      return;
    }
    if (records.length) listener.onEdit();
  });
  observer.observe(editor, { childList: true, subtree: true, characterData: true });
  // Quote attachments and reply anchors can change without changing the draft.
  observer.observe(scope, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['data-testid', 'role', 'datetime'],
  });
  // Watch only direct child changes along its ancestor path so removal of
  // the composer or an enclosing dialog also releases the observer.
  for (let parent = editor.parentElement; parent; parent = parent.parentElement) {
    if (parent !== scope) observer.observe(parent, { childList: true });
  }
  return () => observer.disconnect();
}

export const xPlatform: PlatformAdapter = {
  id: 'x',
  replacementErrorMessage: 'X could not accept the replacement. Your current draft is still in the editor. Retry translation before replacing again.',
  matches: location => location.hostname === 'x.com',
  findEditor: target => target instanceof Element ? target.closest<HTMLElement>(composerSelector) : null,
  writingContext,
  getText: readText,
  replaceText,
  observe,
  previewLayout,
};
