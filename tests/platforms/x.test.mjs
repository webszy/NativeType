import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadTs } from '../load-ts.mjs';

const { resolvePlatform } = await loadTs('platforms/registry.ts');
const { xPlatform } = await loadTs('platforms/x.ts');
const source = await readFile(new URL('../../platforms/x.ts', import.meta.url), 'utf8');

test('registry resolves only X on x.com', () => {
  assert.equal(resolvePlatform({ hostname: 'x.com' }), xPlatform);
  assert.equal(resolvePlatform({ hostname: 'www.x.com' }), null);
  assert.equal(resolvePlatform({ hostname: 'example.com' }), null);
  assert.equal(xPlatform.id, 'x');
});

test('X keeps the verified selector, paste replacement, and local observer', () => {
  assert.match(source, /\[contenteditable="true"\]\[role="textbox"\]\[data-testid\^="tweetTextarea_"\]/);
  assert.match(source, /\[data-block="true"\]/);
  assert.match(source, /\[role="dialog"\]/);
  assert.match(source, /setTimeout\(resolve, 0\)/);
  assert.match(source, /setTimeout\(resolve, 50\)/);
  assert.match(source, /new MouseEvent\('mouseup'/);
  assert.match(source, /new ClipboardEvent\('paste'/);
  assert.match(source, /requestAnimationFrame/);
  assert.doesNotMatch(source, /innerHTML|textContent\s*=/);
  assert.match(source, /observer\.observe\(editor, \{ childList: true, subtree: true, characterData: true \}\)/);
  assert.match(source, /observer\.observe\(parent, \{ childList: true \}\)/);
  assert.doesNotMatch(source, /document\.body[\s\S]{0,120}subtree:\s*true/);
  assert.doesNotMatch(source, /observe\(\s*document\.body/);
});
