import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

export default defineManifest({
  manifest_version: 3,
  // Localized name + description — Chrome substitutes these from
  // _locales/<lang>/messages.json based on the user's UI language.
  // Falls back to default_locale when the user's locale isn't shipped.
  default_locale: 'en',
  name: '__MSG_extName__',
  description: '__MSG_extDesc__',
  version: pkg.version,
  icons: {
    16: 'public/icons/16.png',
    32: 'public/icons/32.png',
    48: 'public/icons/48.png',
    128: 'public/icons/128.png',
  },
  action: {
    default_popup: 'src/popup/popup.html',
    default_icon: {
      16: 'public/icons/16.png',
      32: 'public/icons/32.png',
    },
  },
  options_ui: { page: 'src/options/options.html', open_in_tab: true },
  devtools_page: 'src/panel/devtools.html',
  background: { service_worker: 'src/background/index.ts', type: 'module' },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/injected/index.ts'],
      run_at: 'document_start',
      world: 'MAIN',
    },
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.ts'],
      run_at: 'document_start',
      world: 'ISOLATED',
    },
  ],
  web_accessible_resources: [
    {
      resources: ['src/inspector/inspector.html'],
      matches: ['<all_urls>'],
    },
  ],
  host_permissions: ['<all_urls>'],
  permissions: ['tabs', 'storage', 'alarms'],
});
