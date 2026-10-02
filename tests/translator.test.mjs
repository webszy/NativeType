import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../lib/translator.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { createTranslationService } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const signal = () => new AbortController().signal;
const translate = (service, activated = false, progress = () => {}) => service.translate('你好', signal(), activated, progress);

test('missing API and unsupported language pair produce actionable states', async () => {
  delete globalThis.Translator;
  await assert.rejects(translate(createTranslationService()), { kind: 'unsupported' });
  globalThis.Translator = { availability: async () => 'unavailable' };
  await assert.rejects(translate(createTranslationService()), { kind: 'unsupported' });
});

test('download requires activation, progress is forwarded, instance is reused', async () => {
  let creations = 0;
  globalThis.Translator = {
    availability: async () => 'downloadable',
    create: async ({ monitor }) => {
      creations++;
      monitor({ addEventListener: (_, listener) => listener({ loaded: .5 }) });
      return { translate: async () => 'Hello', destroy() {} };
    },
  };
  const service = createTranslationService();
  await assert.rejects(translate(service), { kind: 'enable' });
  assert.equal(creations, 0);
  const progress = [];
  assert.equal(await translate(service, true, p => progress.push(p)), 'Hello');
  assert.equal(await translate(service), 'Hello');
  assert.deepEqual(progress, [50]);
  assert.equal(creations, 1);
  service.dispose();
});

test('concurrent requests share initialization; aborted text is never translated', async () => {
  let resolveCreate;
  let creations = 0;
  const texts = [];
  globalThis.Translator = {
    availability: async () => 'available',
    create: () => { creations++; return new Promise(resolve => { resolveCreate = resolve; }); },
  };
  const service = createTranslationService();
  const aborted = new AbortController();
  const first = service.translate('旧文本', aborted.signal, true, () => {});
  const assertion = assert.rejects(first, { name: 'AbortError' });
  const second = translate(service, true);
  aborted.abort();
  resolveCreate({ translate: async text => { texts.push(text); return 'Hello'; }, destroy() {} });
  await assertion;
  assert.equal(await second, 'Hello');
  assert.equal(creations, 1);
  assert.deepEqual(texts, ['你好']);
});

test('failed creation can retry, permission failures request activation', async () => {
  let attempts = 0;
  globalThis.Translator = {
    create: async () => {
      if (++attempts === 1) throw new DOMException('activation', 'NotAllowedError');
      return { translate: async () => 'Hello', destroy() {} };
    },
  };
  const service = createTranslationService();
  await assert.rejects(translate(service, true), { kind: 'enable' });
  assert.equal(await translate(service, true), 'Hello');
});

test('translation errors and empty responses do not escape as raw errors', async () => {
  for (const result of ['empty', 'error']) {
    globalThis.Translator = {
      create: async () => ({ translate: async () => {
        if (result === 'error') throw new DOMException('test', 'OperationError');
        return ' ';
      }, destroy() {} }),
    };
    await assert.rejects(translate(createTranslationService(), true), { kind: 'error' });
  }
});

test('disposing while the model loads destroys the eventual instance', async () => {
  let resolveCreate;
  let destroyed = false;
  globalThis.Translator = { create: () => new Promise(resolve => { resolveCreate = resolve; }) };
  const service = createTranslationService();
  const pending = translate(service, true);
  const assertion = assert.rejects(pending, { name: 'AbortError' });
  service.dispose();
  resolveCreate({ translate: async () => 'Hello', destroy() { destroyed = true; } });
  await assertion;
  assert.equal(destroyed, true);
});
