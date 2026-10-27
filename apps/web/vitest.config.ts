import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));
const testHmacSecret = 'test-only-hmac-secret-do-not-deploy-01';
process.env.ANALYTICS_HMAC_SECRET = testHmacSecret;

export default defineConfig({
  plugins: [
    cloudflareTest(async () => {
      const migrations = await readD1Migrations(path.join(root, 'migrations'));
      return {
        wrangler: { configPath: './test/wrangler.jsonc' },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            ANALYTICS_HMAC_SECRET: testHmacSecret,
            ALLOWED_ORIGINS: 'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          },
        },
      };
    }),
  ],
  test: {
    include: ['test/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    setupFiles: ['./test/apply-migrations.ts'],
  },
});
