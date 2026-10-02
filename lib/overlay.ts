export type PreviewState =
  | { kind: 'translating' | 'downloading' | 'error' | 'unsupported' | 'enable'; text: string }
  | { kind: 'translated'; text: string };

export function createOverlay(onRetry: () => void, onReplace: () => void) {
  const host = document.createElement('div');
  host.dataset.nativetype = 'preview';
  host.setAttribute('translate', 'no');
  host.style.cssText = 'all:initial;position:fixed!important;z-index:2147483647!important;display:none;';
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `
    :host { color-scheme: light dark; }
    * { box-sizing: border-box; }
    section { background:var(--nt-bg,#fff);color:var(--nt-fg,#0f1419);border:1px solid var(--nt-border,#cfd9de);border-radius:12px;padding:12px 14px;box-shadow:0 4px 18px #0002;font:14px/1.45 system-ui,sans-serif; }
    header { font-size:11px;font-weight:600;opacity:.65;margin-bottom:6px; }
    p { margin:0;white-space:pre-wrap;overflow-wrap:anywhere;overflow:auto;max-height:var(--nt-text-height,160px); }
    footer { display:flex;justify-content:flex-end;gap:8px;margin-top:10px; }
    button { font:600 13px system-ui,sans-serif;cursor:pointer;border:1px solid var(--nt-border,#cfd9de);border-radius:999px;padding:6px 12px;background:transparent;color:inherit; }
    button:hover { background:#8882; }
    button:focus-visible { outline:2px solid #1d9bf0;outline-offset:2px; }
    button.primary { background:var(--nt-fg,#0f1419);color:var(--nt-bg,#fff);border-color:transparent; }
    [hidden] { display:none!important; }
  `;
  const panel = document.createElement('section');
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', 'NativeType translation');
  const label = document.createElement('header');
  label.textContent = 'NativeType · Chinese → English';
  const message = document.createElement('p');
  message.setAttribute('role', 'status');
  message.setAttribute('aria-live', 'polite');
  const footer = document.createElement('footer');
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.addEventListener('click', onRetry);
  const replace = document.createElement('button');
  replace.type = 'button';
  replace.className = 'primary';
  replace.textContent = 'Replace';
  replace.addEventListener('click', onReplace);
  // Keep the caret in X; its focus trap does not understand shadow-internal buttons.
  for (const button of [retry, replace]) button.addEventListener('pointerdown', event => event.preventDefault());
  footer.append(retry, replace);
  panel.append(label, message, footer);
  shadow.append(style, panel);
  document.body.append(host);
  const spacer = document.createElement('div');
  spacer.setAttribute('aria-hidden', 'true');
  spacer.style.cssText = 'display:block;flex:0 0 auto;pointer-events:none;';
  let anchor: HTMLElement | null = null;
  let visible = false;
  let frame = 0;

  function position() {
    frame = 0;
    if (!visible || !anchor?.isConnected) {
      host.style.display = 'none';
      return;
    }
    let rect = anchor.getBoundingClientRect();
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (rect.bottom <= 0 || rect.top >= height || rect.width === 0 || rect.right <= 0 || rect.left >= width) {
      host.style.display = 'none';
      return;
    }
    // Match X's selected theme rather than the OS theme.
    for (let el: HTMLElement | null = anchor; el; el = el.parentElement) {
      const bg = getComputedStyle(el).backgroundColor;
      const rgb = bg.match(/[\d.]+/g)?.map(Number);
      // X also uses transparent white: rgba(255, 255, 255, 0).
      if (!rgb || rgb.length < 3 || rgb[3] === 0) continue;
      const dark = ((rgb[0] ?? 255) + (rgb[1] ?? 255) + (rgb[2] ?? 255)) < 384;
      host.style.setProperty('--nt-bg', bg);
      host.style.setProperty('--nt-fg', dark ? '#e7e9ea' : '#0f1419');
      host.style.setProperty('--nt-border', dark ? '#536471' : '#cfd9de');
      break;
    }
    host.style.width = `${Math.min(420, Math.max(260, rect.width), width - 16)}px`;
    const below = height - rect.bottom - 16;
    const above = rect.top - 16;
    const space = below >= 120 || below >= above ? below : above;
    // Keep the preview outside the text even for a tall composer; scroll to reveal it.
    host.style.setProperty('--nt-text-height', `${Math.max(36, Math.min(160, space - 92))}px`);
    host.style.display = 'block';
    // A transformed X dialog establishes the fixed containing block, even with
    // an identity transform. Measure its origin instead of assuming the viewport.
    host.style.left = '0px';
    host.style.top = '0px';
    const panelHeight = host.getBoundingClientRect().height;
    // Keep the card's space outside Draft's shared-height nodes.
    let branch = anchor.closest<HTMLElement>('[data-testid$="RichTextInputContainer"]') ?? anchor;
    const boundary = anchor.closest('[role="dialog"]') ?? document.body;
    while (branch.parentElement && branch.parentElement !== boundary) {
      const layout = getComputedStyle(branch.parentElement);
      if (layout.display === 'flex' && layout.flexDirection === 'column') break;
      branch = branch.parentElement;
    }
    spacer.style.height = `${panelHeight + 16}px`;
    if (spacer.previousElementSibling !== branch) branch.after(spacer);
    rect = anchor.getBoundingClientRect();
    const origin = host.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.left, width - origin.width - 8));
    const top = height - rect.bottom - 16 >= panelHeight ? rect.bottom + 8 : rect.top - panelHeight - 8;
    host.style.left = `${left - origin.left}px`;
    host.style.top = `${top - origin.top}px`;
  }
  function schedule() {
    if (visible && !frame) frame = requestAnimationFrame(position);
  }
  const observer = new ResizeObserver(schedule);
  observer.observe(panel);
  window.addEventListener('scroll', schedule, true);
  window.addEventListener('resize', schedule);
  return {
    host,
    show(composer: HTMLElement, state: PreviewState) {
      if (anchor !== composer) {
        spacer.remove();
        if (anchor) observer.unobserve(anchor);
        anchor = composer;
        observer.observe(anchor);
      }
      // X traps focus and hides accessibility nodes outside its composer dialog.
      const container = composer.closest('[role="dialog"]') ?? document.body;
      if (host.parentElement !== container) container.append(host);
      visible = true;
      message.textContent = state.text;
      message.lang = state.kind === 'translated' ? 'en' : '';
      retry.textContent = state.kind === 'enable' ? 'Enable translation' : 'Retry';
      retry.hidden = !['translated', 'error', 'enable'].includes(state.kind);
      replace.hidden = state.kind !== 'translated';
      footer.hidden = retry.hidden && replace.hidden;
      schedule();
    },
    reposition: schedule,
    hide() {
      visible = false;
      spacer.remove();
      host.style.display = 'none';
    },
    destroy() {
      cancelAnimationFrame(frame);
      spacer.remove();
      observer.disconnect();
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      host.remove();
    },
  };
}
