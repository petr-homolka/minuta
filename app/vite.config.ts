// Vite + unit testy (Vitest). Emulatorove testy maji vlastni config
// (vitest.emu.config.ts) - nemichaji se do rychleho `npm test`.
// PWA: Service Worker s autoUpdate (14 - offline shell, auto aktualizace);
// manifest zustava nas staticky soubor v public/.
import react from "@vitejs/plugin-react";
import { createRequire } from "node:module";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

const require = createRequire(import.meta.url);

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: false, // pouzivame vlastni public/manifest.webmanifest
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,webmanifest}"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // Obsah zprav NIKDY necachovat - SW cachuje jen aplikacni shell;
        // Firestore/Functions jde mimo cache (zadny navigateFallback pro API).
        runtimeCaching: [],
      },
    }),
  ],
  resolve: {
    alias: {
      // ESM distribuce libsodium-wrappers 0.7.16 odkazuje na soubor, ktery
      // v balicku neni; require.resolve vrati funkcni CJS build.
      "libsodium-wrappers": require.resolve("libsodium-wrappers"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
