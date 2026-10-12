import { CapacitorConfig } from '@capacitor/cli';

// `vite build` writes the static web bundle to dist/client (one index.html per
// route) and the server bundle to dist/server. Capacitor needs the static
// bundle, so webDir points at dist/client — not dist.
const config: CapacitorConfig = {
  appId: 'com.reelgoat.tradevault',
  appName: 'Trade Vault',
  webDir: 'dist/client'
};

export default config;
