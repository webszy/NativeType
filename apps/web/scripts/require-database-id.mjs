import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { experimental_readRawConfig } from 'wrangler';

// Remote `wrangler d1 migrations apply` resolves a D1 database by name when
// database_id is omitted. Block that path until the top-level DB binding for
// nativetype-analytics has a UUID from `wrangler d1 create`.
let databaseId;
try {
  const { rawConfig } = experimental_readRawConfig({
    config: fileURLToPath(new URL('../wrangler.jsonc', import.meta.url)),
  });
  const database = rawConfig.d1_databases?.find((binding) => (
    binding.binding === 'DB' && binding.database_name === 'nativetype-analytics'
  ));
  databaseId = database?.database_id;
} catch {
  console.error('Refusing to continue: apps/web/wrangler.jsonc is not a valid Wrangler configuration.');
  process.exit(1);
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

if (typeof databaseId !== 'string' || !uuid.test(databaseId)) {
  console.error(
    [
      'Refusing to continue: the DB binding for nativetype-analytics has no valid D1 database_id in apps/web/wrangler.jsonc.',
      'Remote migration would resolve nativetype-analytics by name in the logged-in account.',
      'Run `wrangler d1 create nativetype-analytics` and paste the printed id first.',
    ].join('\n'),
  );
  process.exit(1);
}

const [command, ...args] = process.argv.slice(2);
if (!command) process.exit(0);

const result = spawnSync(command, args, { stdio: 'inherit' });
if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
