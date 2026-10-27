import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { experimental_readRawConfig } from 'wrangler';

const root = new URL('../', import.meta.url);
const readme = readFileSync(new URL('README.md', root), 'utf8');
const queries = readFileSync(new URL('src/stats-sql.ts', root), 'utf8');
const analytics = readFileSync(new URL('src/analytics.ts', root), 'utf8');
const { rawConfig: wrangler } = experimental_readRawConfig({
  config: fileURLToPath(new URL('wrangler.jsonc', root)),
});

const databaseId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const databaseBinding = { binding: 'DB', database_name: 'nativetype-analytics' };
const configuredBinding = { ...databaseBinding, database_id: databaseId };

function runGuard(t, config) {
  const fixture = mkdtempSync(path.join(tmpdir(), 'nativetype-api-config-'));
  t.after(() => rmSync(fixture, { recursive: true, force: true }));
  mkdirSync(path.join(fixture, 'scripts'));
  copyFileSync(
    new URL('scripts/require-database-id.mjs', root),
    path.join(fixture, 'scripts/require-database-id.mjs'),
  );
  symlinkSync(
    fileURLToPath(new URL('node_modules', root)),
    path.join(fixture, 'node_modules'),
    'junction',
  );
  writeFileSync(path.join(fixture, 'wrangler.jsonc'), config);

  return spawnSync(
    process.execPath,
    ['scripts/require-database-id.mjs', process.execPath, '-e', 'process.exit(42)'],
    {
      cwd: fixture,
      encoding: 'utf8',
      env: { ...process.env, WRANGLER_LOG_PATH: path.join(fixture, 'wrangler.log') },
    },
  );
}

test('README contains the operator SQL', () => {
  const statements = [...queries.matchAll(/`([^`]+)`/g)]
    .map((match) => match[1].trim())
    .filter((statement) => statement.startsWith('SELECT'));
  assert.equal(statements.length, 5);
  for (const statement of statements) {
    assert.equal(readme.includes(statement), true, statement);
  }
});

test('Wrangler rate limit matches the Worker constants', () => {
  const limit = Number(analytics.match(/export const analyticsRateLimitPerMinute = (\d+);/)?.[1]);
  const period = Number(analytics.match(/export const analyticsRateLimitPeriodSeconds = (\d+);/)?.[1]);
  const { limit: configuredLimit, period: configuredPeriod } = wrangler.ratelimits
    .find((binding) => binding.name === 'ANALYTICS_RATE_LIMITER').simple;
  assert.equal(configuredLimit, limit);
  assert.equal(configuredPeriod, period);
  assert.equal(limit, 60);
  assert.equal(period, 60);
});

test('Wrangler runs retention daily and requires the analytics secret', () => {
  assert.deepEqual(wrangler.triggers.crons, ['0 3 * * *']);
  assert.equal(wrangler.secrets.required.includes('ANALYTICS_HMAC_SECRET'), true);
  assert.equal(wrangler.vars.ALLOWED_ORIGINS.split(',').some((origin) => origin.trim() === '*'), false);
});

test('remote migration uses the database id guard', () => {
  const pkg = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
  assert.equal(pkg.scripts.deploy, 'wrangler deploy');
  assert.equal(
    pkg.scripts['db:migrate:remote'],
    'node scripts/require-database-id.mjs wrangler d1 migrations apply nativetype-analytics --remote',
  );
  assert.equal(pkg.scripts['db:migrate:local'].includes('require-database-id'), false);
  assert.equal(pkg.scripts.build, 'wrangler deploy --dry-run');
});

for (const [name, config] of [
  ['missing id', { d1_databases: [databaseBinding] }],
  ['invalid id', { d1_databases: [{ ...databaseBinding, database_id: 'not-a-uuid' }] }],
  ['id on another binding', {
    d1_databases: [databaseBinding, { ...configuredBinding, binding: 'OTHER' }],
  }],
  ['id on another database', {
    d1_databases: [{ ...configuredBinding, database_name: 'other' }],
  }],
  ['id in another environment', {
    d1_databases: [databaseBinding],
    env: { staging: { d1_databases: [configuredBinding] } },
  }],
]) {
  test(`database guard rejects ${name}`, (t) => {
    const blocked = runGuard(t, JSON.stringify(config));
    assert.equal(blocked.status, 1, blocked.stderr);
    assert.match(blocked.stderr, /database_id/);
    assert.match(blocked.stderr, /resolve nativetype-analytics by name/);
  });
}

test('database guard ignores ids in JSONC comments', (t) => {
  const blocked = runGuard(t, `{
    // "database_id": "${databaseId}",
    /* "database_id": "${databaseId}" */
    "d1_databases": [${JSON.stringify(databaseBinding)}],
  }`);
  assert.equal(blocked.status, 1, blocked.stderr);
  assert.match(blocked.stderr, /database_id/);
});

test('database guard refuses malformed JSONC', (t) => {
  const blocked = runGuard(t, `{"d1_databases":[${JSON.stringify(configuredBinding)}]`);
  assert.equal(blocked.status, 1, blocked.stderr);
  assert.match(blocked.stderr, /not a valid Wrangler configuration/);
});

test('database guard runs the command with a valid id and preserves its exit status', (t) => {
  const allowed = runGuard(t, `{
    // A commented example must not shadow the configured id.
    // "database_id": "not-a-uuid",
    "d1_databases": [${JSON.stringify(configuredBinding)}],
  }`);
  assert.equal(allowed.status, 42, allowed.stderr);
});
