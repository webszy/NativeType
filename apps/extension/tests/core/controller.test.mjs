import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installDOM, settle } from '../dom-fixture.mjs';
import { loadTs } from '../load-ts.mjs';

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
  const attachment = document.createElement('div');
  const quote = document.createElement('div');
  quote.dataset.testid = 'quoteTweet';
  attachment.append(quote);
  dialog.append(editor, attachment);
  document.body.append(dialog);
  editor.focus();
  const settings = getDefaultSettings();
  settings.contexts.x.post = false;
  const pair = options.pair ?? { source: 'zh', target: 'en' };
  settings.translation = { sourceLanguage: pair.source, targetLanguage: pair.target };
  let replacements = 0;
  let signal;
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
      prepare() {}, retainPair() {}, dispose() {},
    },
    languagePair: pair,
    detector: options.detector,
    settings: createSettingsStore(createMemoryBackend(settings)),
    host: { listen() {}, onInvalidated: listener => dom.onCleanup(listener) },
  });
  await settle();
  t.mock.timers.tick(1000);
  await settle();
  dom.flushFrames();
  const overlay = document.body.querySelector('[data-nativetype]');
  return {
    ...dom, editor, overlay,
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
