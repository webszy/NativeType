import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installDOM, settle } from '../dom-fixture.mjs';
import { loadTs } from '../load-ts.mjs';
import { attachedPost } from '../platforms/x-fixture.mjs';

const { startNativeType } = await loadTs('core/controller.ts');
const { xPlatform } = await loadTs('platforms/x.ts');
const { createMemoryBackend, createSettingsStore, getDefaultSettings } = await loadTs('settings/store.ts');

async function setup(t, translate = async () => 'Translated draft', replace, options = {}) {
  const dom = installDOM(t);
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { document } = dom;
  const dialog = document.createElement('div');
  dialog.setAttribute('role', 'dialog');
  const editor = document.createElement('div');
  editor.contentEditable = 'true';
  editor.setAttribute('role', 'textbox');
  editor.dataset.testid = 'tweetTextarea_0';
  editor.innerText = options.text ?? '這是一段測試文字';
  const { attachment, card: quote } = attachedPost(document);
  dialog.append(editor, attachment);
  document.body.append(dialog);
  editor.focus();
  const settings = getDefaultSettings();
  settings.contexts.x.post = false;
  Object.assign(settings.contexts.x, options.contexts);
  const pair = options.pair ?? { source: 'zh', target: 'en' };
  settings.translation = { sourceLanguage: pair.source, targetLanguage: pair.target };
  let replacements = 0;
  let signal;
  const backend = createMemoryBackend(settings);
  const store = options.settings ?? createSettingsStore({
    ...backend,
    watch: options.missSettingsEvents ? () => () => {} : backend.watch,
  });
  const listeners = [];
  let invalidate;
  const retainedPairs = [];
  let disposals = 0;
  const platform = {
    ...xPlatform,
    async replaceText(...args) {
      replacements += 1;
      if (replace) return replace(...args);
      args[0].innerText = args[2];
      return true;
    },
  };
  startNativeType({
    platform,
    provider: {
      translate(text, request) { signal = request.signal; return translate(text, request); },
      prepare() {},
      retainPair: (source, target) => retainedPairs.push({ source, target }),
      dispose: () => { disposals += 1; },
    },
    languagePair: pair,
    detector: options.detector,
    settings: store,
    host: {
      listen: (target, type, listener) => listeners.push({ target, type, listener }),
      onInvalidated(listener) { invalidate = listener; dom.onCleanup(listener); },
      openSettings: options.openSettings,
    },
  });
  await settle();
  t.mock.timers.tick(1000);
  await settle();
  dom.flushFrames();
  const overlay = document.body.querySelector('[data-nativetype]');
  return {
    ...dom, editor, overlay, settings: store, retainedPairs,
    disposals: () => disposals,
    invalidate: () => invalidate(),
    emit(type, target = document, eventTarget = document.activeElement) {
      for (const item of listeners) if (item.type === type && item.target === target) item.listener({ target: eventTarget });
    },
    replacements: () => replacements,
    signal: () => signal,
    replace: () => overlay.shadowRoot.querySelectorAll('button').find(button => button.textContent === 'Replace').fire('click'),
    removeQuote(notify = true) {
      quote.remove();
      if (notify) dom.mutate([{ type: 'childList', target: attachment }]);
    },
  };
}

test('removing a quote without editing text hides the preview and restores input height', async t => {
  const fixture = await setup(t);
  assert.equal(fixture.overlay.style.display, 'block');
  assert.notEqual(fixture.editor.style.getPropertyValue('min-height'), '');
  fixture.removeQuote();
  assert.equal(fixture.overlay.style.display, 'none');
  assert.equal(fixture.editor.style.getPropertyValue('min-height'), '');
  await fixture.replace();
  assert.equal(fixture.replacements(), 0);
  assert.equal(fixture.editor.innerText, '這是一段測試文字');
});

test('Replace rechecks the context before the observer has delivered a DOM change', async t => {
  const fixture = await setup(t);
  fixture.removeQuote(false);
  await fixture.replace();
  assert.equal(fixture.replacements(), 0);
  assert.equal(fixture.overlay.style.display, 'none');
  assert.equal(fixture.editor.innerText, '這是一段測試文字');
});

test('a context change cancels an in-flight request and cannot restore its preview', async t => {
  let finishTranslation;
  const fixture = await setup(t, () => new Promise(resolve => { finishTranslation = resolve; }));
  fixture.removeQuote();
  assert.equal(fixture.signal().aborted, true);
  finishTranslation('Stale result');
  await settle();
  fixture.flushFrames();
  assert.equal(fixture.overlay.style.display, 'none');
  assert.notEqual(fixture.overlay.shadowRoot.querySelector('p').textContent, 'Stale result');
});

test('late translation results recheck context even before a DOM notification', async t => {
  let finishTranslation;
  const fixture = await setup(t, () => new Promise(resolve => { finishTranslation = resolve; }));
  fixture.removeQuote(false);
  finishTranslation('Stale result');
  await settle();
  fixture.flushFrames();
  assert.equal(fixture.overlay.style.display, 'none');
  assert.notEqual(fixture.overlay.shadowRoot.querySelector('p').textContent, 'Stale result');
});

test('a context change during asynchronous replacement invalidates the final write', async t => {
  let finishReplacement;
  const fixture = await setup(t, undefined, async (editor, _source, translation, canReplace) => {
    await new Promise(resolve => { finishReplacement = resolve; });
    if (!canReplace()) return false;
    editor.innerText = translation;
    return true;
  });
  const replacing = fixture.replace();
  fixture.removeQuote();
  finishReplacement();
  await replacing;
  assert.equal(fixture.editor.innerText, '這是一段測試文字');
  assert.equal(fixture.overlay.style.display, 'none');
});

test('unrelated composer mutations do not restart pending language detection', async t => {
  let finishDetection;
  let detectionSignal;
  let detections = 0;
  const fixture = await setup(t, undefined, undefined, {
    text: 'Hello world',
    pair: { source: 'en', target: 'zh' },
    detector: {
      detect(_text, _source, request) {
        detections += 1;
        detectionSignal = request.signal;
        return new Promise(resolve => { finishDetection = resolve; });
      },
      prepare() {}, reset() {}, dispose() {},
    },
  });
  fixture.mutate([{ type: 'childList', target: fixture.editor.parentElement }]);
  t.mock.timers.tick(1000);
  await settle();
  assert.equal(detections, 1);
  assert.equal(detectionSignal.aborted, false);
  finishDetection({ status: 'match' });
  await settle();
  fixture.flushFrames();
  assert.equal(fixture.overlay.shadowRoot.querySelector('p').textContent, 'Translated draft');
});

test('the Quote switch controls the live attached-post structure independently of New posts', async t => {
  let translations = 0;
  const fixture = await setup(t, async () => { translations += 1; return 'A quote translation'; });
  assert.equal(fixture.overlay.style.display, 'block');
  const next = await fixture.settings.load();
  next.contexts.x = { post: true, reply: false, quote: false };
  await fixture.settings.save(next);
  assert.equal(fixture.overlay.style.display, 'none');
  await fixture.replace();
  t.mock.timers.tick(1000);
  await settle();
  assert.equal(translations, 1);
  assert.equal(fixture.replacements(), 0);
  next.contexts.x = { post: false, reply: false, quote: true };
  await fixture.settings.save(next);
  fixture.flushFrames();
  assert.equal(fixture.overlay.style.display, 'block');
  await fixture.replace();
  assert.equal(fixture.editor.innerText, 'A quote translation');
});

test('returning to X resyncs a missed language update before allowing the old preview to replace', async t => {
  const requests = [];
  let resets = 0;
  const fixture = await setup(t, async (_text, request) => {
    requests.push({ source: request.source, target: request.target });
    return `${request.source} to ${request.target}`;
  }, undefined, {
    missSettingsEvents: true,
    detector: {
      detect: async () => ({ status: 'match' }),
      prepare() {}, reset: () => { resets += 1; }, dispose() {},
    },
  });
  const next = await fixture.settings.load();
  next.translation = { sourceLanguage: 'zh-Hant', targetLanguage: 'ja' };
  await fixture.settings.save(next);
  fixture.emit('focus', window);
  assert.equal(fixture.overlay.style.display, 'none');
  await fixture.replace();
  assert.equal(fixture.replacements(), 0);
  await settle();
  t.mock.timers.tick(1000);
  await settle();
  fixture.flushFrames();
  assert.deepEqual(requests, [{ source: 'zh', target: 'en' }, { source: 'zh-Hant', target: 'ja' }]);
  assert.equal(resets, 1);
  assert.equal(fixture.overlay.shadowRoot.querySelector('p').textContent, 'zh-Hant to ja');
});

test('visibility and pageshow recover missed context changes without reloading the page', async t => {
  const fixture = await setup(t, undefined, undefined, { missSettingsEvents: true });
  const next = await fixture.settings.load();
  next.contexts.x = { post: true, reply: true, quote: false };
  await fixture.settings.save(next);
  fixture.document.visibilityState = 'hidden';
  fixture.emit('visibilitychange');
  assert.equal(fixture.overlay.style.display, 'block');
  fixture.document.visibilityState = 'visible';
  fixture.emit('visibilitychange');
  assert.equal(fixture.overlay.style.display, 'none');
  await settle();
  t.mock.timers.tick(1000);
  await settle();
  assert.equal(fixture.overlay.style.display, 'none');
  next.contexts.x.quote = true;
  await fixture.settings.save(next);
  fixture.emit('pageshow', window);
  await settle();
  fixture.flushFrames();
  assert.equal(fixture.overlay.style.display, 'block');
});

test('focusing a composer resyncs settings when its context was previously disabled', async t => {
  const fixture = await setup(t, undefined, undefined, {
    missSettingsEvents: true,
    contexts: { quote: false },
  });
  assert.notEqual(fixture.overlay.style.display, 'block');
  const next = await fixture.settings.load();
  next.contexts.x.quote = true;
  await fixture.settings.save(next);
  fixture.emit('focusin');
  await settle();
  t.mock.timers.tick(1000);
  await settle();
  fixture.flushFrames();
  assert.equal(fixture.overlay.style.display, 'block');
});

function delayedSettings() {
  const initial = getDefaultSettings();
  initial.contexts.x.post = false;
  const pending = [];
  let reads = 0;
  let notify;
  return {
    initial, pending, reads: () => reads,
    notify: settings => notify(settings),
    store: {
      load() {
        reads += 1;
        return reads === 1 ? Promise.resolve(initial) : new Promise(resolve => pending.push(resolve));
      },
      subscribe(listener) { notify = listener; return () => { notify = () => {}; }; },
    },
  };
}

test('a newer resume during a slow read is re-read before any stale pair is applied', async t => {
  const settings = delayedSettings();
  const requests = [];
  const fixture = await setup(t, async (_text, request) => {
    requests.push(request.target);
    return request.target;
  }, undefined, { settings: settings.store });
  fixture.emit('focus', window);
  fixture.emit('pageshow', window);
  settings.pending[0]({ ...settings.initial, translation: { sourceLanguage: 'zh', targetLanguage: 'ja' } });
  await settle();
  assert.equal(settings.pending.length, 2);
  assert.deepEqual(fixture.retainedPairs, []);
  assert.equal(fixture.overlay.style.display, 'none');
  settings.pending[1]({ ...settings.initial, translation: { sourceLanguage: 'zh', targetLanguage: 'ko' } });
  await settle();
  t.mock.timers.tick(1000);
  await settle();
  assert.deepEqual(requests, ['en', 'ko']);
  assert.deepEqual(fixture.retainedPairs, [{ source: 'zh', target: 'ko' }]);
});

test('a storage notification wins over an older asynchronous settings read', async t => {
  const settings = delayedSettings();
  const fixture = await setup(t, async (_text, request) => request.target, undefined, { settings: settings.store });
  fixture.emit('focus', window);
  settings.notify({ ...settings.initial, translation: { sourceLanguage: 'zh', targetLanguage: 'fr' } });
  settings.pending[0]({ ...settings.initial, translation: { sourceLanguage: 'zh', targetLanguage: 'ja' } });
  await settle();
  t.mock.timers.tick(1000);
  await settle();
  fixture.flushFrames();
  assert.deepEqual(fixture.retainedPairs, [{ source: 'zh', target: 'fr' }]);
  assert.equal(fixture.overlay.shadowRoot.querySelector('p').textContent, 'fr');
});

test('invalidation prevents a late settings read from restarting the disposed controller', async t => {
  const settings = delayedSettings();
  const fixture = await setup(t, undefined, undefined, { settings: settings.store });
  fixture.emit('focus', window);
  fixture.invalidate();
  settings.pending[0]({ ...settings.initial, translation: { sourceLanguage: 'zh', targetLanguage: 'ja' } });
  await settle();
  fixture.emit('pageshow', window);
  assert.equal(settings.reads(), 2);
  assert.equal(fixture.disposals(), 1);
  assert.deepEqual(fixture.retainedPairs, []);
  assert.equal(fixture.overlay.isConnected, false);
});

test('a failed resume read retains the last successful settings and translation', async t => {
  const settings = delayedSettings();
  const store = { ...settings.store, load: () => settings.reads() === 0 ? settings.store.load() : Promise.reject(new Error('Storage unavailable')) };
  const fixture = await setup(t, undefined, undefined, { settings: store });
  fixture.emit('focus', window);
  await settle();
  fixture.flushFrames();
  assert.equal(fixture.overlay.style.display, 'block');
  assert.equal(fixture.overlay.shadowRoot.querySelector('p').textContent, 'Translated draft');
  assert.deepEqual(fixture.retainedPairs, []);
});

test('resuming the page invalidates a paste already waiting for X selection', async t => {
  let finishReplacement;
  const fixture = await setup(t, undefined, async (editor, _source, translation, canReplace) => {
    await new Promise(resolve => { finishReplacement = resolve; });
    if (!canReplace()) return false;
    editor.innerText = translation;
    return true;
  });
  const replacing = fixture.replace();
  fixture.emit('focus', window);
  await settle();
  finishReplacement();
  await replacing;
  assert.equal(fixture.editor.innerText, '這是一段測試文字');
});

test('IME composition started during a settings read waits for the committed input', async t => {
  const settings = delayedSettings();
  const requests = [];
  const fixture = await setup(t, async text => { requests.push(text); return 'Translation'; }, undefined, { settings: settings.store });
  fixture.emit('focus', window);
  fixture.emit('compositionstart');
  fixture.editor.innerText = '這是輸入法尚未提交的文字';
  fixture.emit('input');
  settings.pending[0](settings.initial);
  await settle();
  t.mock.timers.tick(1000);
  await settle();
  assert.deepEqual(requests, ['這是一段測試文字']);
  fixture.emit('compositionend');
  t.mock.timers.tick(1000);
  await settle();
  assert.deepEqual(requests, ['這是一段測試文字', '這是輸入法尚未提交的文字']);
});

test('the preview settings button opens settings without changing the draft and survives language updates', async t => {
  let opens = 0;
  const fixture = await setup(t, undefined, undefined, { openSettings: () => { opens += 1; } });
  const settingsButton = fixture.overlay.shadowRoot.querySelectorAll('button').find(button => button.getAttribute('aria-label') === 'Open NativeType settings');
  await settingsButton.fire('click');
  assert.equal(opens, 1);
  assert.equal(fixture.editor.innerText, '這是一段測試文字');
  assert.equal(fixture.overlay.style.display, 'block');
  const next = await fixture.settings.load();
  next.translation.targetLanguage = 'ja';
  await fixture.settings.save(next);
  t.mock.timers.tick(1000);
  await settle();
  assert.match(fixture.overlay.shadowRoot.querySelector('header').textContent, /Chinese → Japanese/);
  assert.equal(settingsButton.isConnected, true);
  await settingsButton.fire('click');
  assert.equal(opens, 2);
  assert.equal(fixture.replacements(), 0);
});

test('a settings-open failure preserves the translation and allows replacement', async t => {
  const fixture = await setup(t, undefined, undefined, { openSettings: async () => { throw new Error('Extension context invalidated'); } });
  const settingsButton = fixture.overlay.shadowRoot.querySelectorAll('button').find(button => button.getAttribute('aria-label') === 'Open NativeType settings');
  await settingsButton.fire('click');
  assert.equal(settingsButton.disabled, false);
  assert.match(settingsButton.title, /Couldn’t open settings/);
  assert.equal(fixture.overlay.shadowRoot.querySelector('p').textContent, 'Translated draft');
  assert.equal(fixture.editor.innerText, '這是一段測試文字');
  await fixture.replace();
  assert.equal(fixture.editor.innerText, 'Translated draft');
});

test('returning from settings with keyboard focus in the preview resumes the same composer', async t => {
  const requests = [];
  let fixture;
  fixture = await setup(t, async (_text, request) => { requests.push(request.target); return request.target; }, undefined, {
    missSettingsEvents: true,
    openSettings: () => {
      fixture.overlay.focus();
      fixture.emit('focusin');
    },
  });
  const settingsButton = fixture.overlay.shadowRoot.querySelectorAll('button').find(button => button.getAttribute('aria-label') === 'Open NativeType settings');
  await settingsButton.fire('click');
  const next = await fixture.settings.load();
  next.translation.targetLanguage = 'ja';
  await fixture.settings.save(next);
  fixture.emit('focus', window);
  await settle();
  t.mock.timers.tick(1000);
  await settle();
  fixture.flushFrames();
  assert.deepEqual(requests, ['en', 'ja']);
  assert.equal(fixture.overlay.style.display, 'block');
  assert.equal(fixture.editor.innerText, '這是一段測試文字');
});
