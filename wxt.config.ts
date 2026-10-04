import { defineConfig } from 'wxt';

export default defineConfig({
  outDir: 'dist',
  manifest: {
    name: 'NativeType',
    description: 'Write in your language. Publish in another.',
    minimum_chrome_version: '138',
    icons: {
      128: 'icon/128.png',
    },
  },
});
