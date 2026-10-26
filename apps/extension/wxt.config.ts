import { defineConfig } from 'wxt';

export default defineConfig({
  outDir: 'dist',
  // Keep the Chrome Web Store zip name stable after the workspace package rename.
  zip: {
    name: 'nativetype',
  },
  manifest: {
    name: 'NativeType',
    description: 'Write in your language. Publish in another.',
    minimum_chrome_version: '138',
    // Language and X context preferences stay on this device. Drafts are not stored.
    permissions: ['storage'],
    action: {
      default_title: 'NativeType Settings',
      default_icon: {
        128: 'icon/128.png',
      },
    },
    icons: {
      128: 'icon/128.png',
    },
  },
});
