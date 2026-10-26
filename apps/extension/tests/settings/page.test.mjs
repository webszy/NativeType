import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installDOM, settle } from '../dom-fixture.mjs';
import { loadTs } from '../load-ts.mjs';

const { mountSettingsPage } = await loadTs('settings/page.ts');
const { getDefaultSettings } = await loadTs('settings/store.ts');

function delayedStore() {
  let stored = getDefaultSettings();
  const listeners = new Set();
  const writes = [];
  const store = {
    load: async () => structuredClone(stored),
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    save(value) { return new Promise((resolve, reject) => writes.push({ value, resolve, reject })); },
  };
  return {
    store,
    writes,
    current: () => stored,
    publish(value) { stored = value; for (const listener of listeners) listener(value); },
    async commit(index) { this.publish(writes[index].value); writes[index].resolve(); await settle(); },
  };
}

async function setup(t, backend = delayedStore()) {
  const { document } = installDOM(t);
  const root = document.createElement('main');
  document.body.append(root);
  await mountSettingsPage(root, backend.store, '/icon.png');
  return {
    backend,
    post: root.querySelectorAll('input').find(input => input.id === 'context-post'),
    reply: root.querySelectorAll('input').find(input => input.id === 'context-reply'),
    status: root.querySelector('[role="status"]'),
  };
}

test('reverting a switch while saving writes the latest value and ignores older echoes', async t => {
  const { backend, post, status } = await setup(t);
  post.checked = false;
  await post.fire('change');
  post.checked = true;
  await post.fire('change');
  assert.equal(backend.writes.length, 1);
  await backend.commit(0);
  assert.equal(post.checked, true);
  assert.equal(status.textContent, 'Saving…');
  assert.equal(backend.writes.length, 2);
  await backend.commit(1);
  assert.equal(backend.current().contexts.x.post, true);
  assert.equal(status.textContent, 'Saved');
});

test('multiple edits coalesce into the latest complete settings record', async t => {
  const { backend, post, reply } = await setup(t);
  post.checked = false;
  await post.fire('change');
  reply.checked = false;
  await reply.fire('change');
  post.checked = true;
  await post.fire('change');
  await backend.commit(0);
  assert.equal(backend.writes.length, 2);
  assert.deepEqual(backend.writes[1].value.contexts.x, { post: true, reply: false, quote: true });
  await backend.commit(1);
  assert.deepEqual(backend.current().contexts.x, { post: true, reply: false, quote: true });
  const external = getDefaultSettings();
  external.contexts.x.post = false;
  backend.publish(external);
  assert.equal(post.checked, false);
  assert.equal(reply.checked, true);
});

test('failed saves preserve the latest edit and can be retried', async t => {
  const { backend, post, reply, status } = await setup(t);
  post.checked = false;
  await post.fire('change');
  backend.writes[0].reject(new Error('storage unavailable'));
  await settle();
  assert.equal(post.checked, false);
  assert.match(status.textContent, /Couldn’t save/);
  reply.checked = false;
  await reply.fire('change');
  await backend.commit(1);
  assert.deepEqual(backend.current().contexts.x, { post: false, reply: false, quote: true });
  assert.equal(status.textContent, 'Saved');
});

test('a failed intermediate save does not discard a queued revert', async t => {
  const { backend, post, status } = await setup(t);
  post.checked = false;
  await post.fire('change');
  post.checked = true;
  await post.fire('change');
  backend.writes[0].reject(new Error('storage unavailable'));
  await settle();
  assert.equal(post.checked, true);
  assert.equal(backend.writes.length, 1);
  assert.equal(backend.current().contexts.x.post, true);
  assert.equal(status.textContent, 'Saved');
});

test('a slow initial load cannot overwrite newer edits or storage events', async t => {
  const { document } = installDOM(t);
  for (const update of ['edit', 'storage']) {
    const backend = delayedStore();
    let finishLoad;
    backend.store.load = () => new Promise(resolve => { finishLoad = resolve; });
    const root = document.createElement('main');
    document.body.append(root);
    const mounted = mountSettingsPage(root, backend.store, '/icon.png');
    const post = root.querySelectorAll('input').find(input => input.id === 'context-post');
    if (update === 'edit') {
      post.checked = false;
      await post.fire('change');
      await backend.commit(0);
    } else {
      const next = getDefaultSettings();
      next.contexts.x.post = false;
      backend.publish(next);
    }
    finishLoad(getDefaultSettings());
    await mounted;
    assert.equal(post.checked, false, update);
  }
});
