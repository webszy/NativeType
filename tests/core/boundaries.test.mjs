import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const leak = /tweetTextarea|data-testid|Draft|Translator|contenteditable|innerHTML|from '\.\.\/lib\/|from '\.\/lib\//;

async function typescriptFiles(directory) {
  const entries = await readdir(path.join(root, directory), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await typescriptFiles(relative));
    else if (entry.name.endsWith('.ts')) files.push(relative);
  }
  return files;
}

test('core, the content entry, and overlay do not absorb platform or provider internals', async () => {
  const files = [...await typescriptFiles('core'), ...await typescriptFiles('ui'), 'entrypoints/content.ts'];
  for (const relative of files) {
    const source = await readFile(path.join(root, relative), 'utf8');
    assert.doesNotMatch(source, leak, relative);
  }
  for (const relative of await typescriptFiles('core')) {
    const source = await readFile(path.join(root, relative), 'utf8');
    assert.doesNotMatch(source, /platforms\/x|platforms\/registry|translators\/chrome|translators\/registry|Chrome|X could not/, relative);
  }
});

test('the entry only starts and stops the approved registries', async () => {
  const source = await readFile(path.join(root, 'entrypoints/content.ts'), 'utf8');
  assert.match(source, /resolvePlatform\(window\.location\)/);
  assert.match(source, /getTranslationProvider\('chrome'\)/);
  assert.match(source, /defaultLanguagePair/);
  assert.match(source, /startNativeType\(/);
  assert.match(source, /matches: \['https:\/\/x\.com\/\*'\]/);
  assert.doesNotMatch(source, /setTimeout|compositionstart|MutationObserver|translate\(/);
});

test('registries stay static and replaced lib files are gone', async () => {
  const platforms = await readFile(path.join(root, 'platforms/registry.ts'), 'utf8');
  const translators = await readFile(path.join(root, 'translators/registry.ts'), 'utf8');
  assert.match(platforms, /const platforms: PlatformAdapter\[\] = \[xPlatform\]/);
  assert.match(translators, /chrome: createChromeTranslationProvider/);
  assert.doesNotMatch(platforms, /youtube|reddit|plugin|import\(/);
  assert.doesNotMatch(translators, /deepl|openai|gemini|plugin|import\(/i);
  await assert.rejects(access(path.join(root, 'platforms/generic.ts')));
  await assert.rejects(access(path.join(root, 'lib/editable.ts')));
  await assert.rejects(access(path.join(root, 'lib/overlay.ts')));
  await assert.rejects(access(path.join(root, 'lib/translator.ts')));
});

test('manifest inputs keep the current host and add no permissions', async () => {
  const config = await readFile(path.join(root, 'wxt.config.ts'), 'utf8');
  const manifest = await readFile(path.join(root, 'package.json'), 'utf8');
  assert.match(config, /version: '0\.0\.2'/);
  assert.doesNotMatch(config, /permissions|host_permissions/);
  assert.match(manifest, /"version": "0\.0\.2"/);
});
