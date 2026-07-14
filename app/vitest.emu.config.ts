// Emulatorove (integracni) testy - bezi jen pres `npm run test:emu`,
// tj. uvnitr `firebase emulators:exec` (Auth + Firestore musi bezet).
import { createRequire } from "node:module";
import { defineConfig } from "vitest/config";

const require = createRequire(import.meta.url);

export default defineConfig({
  resolve: {
    alias: {
      // Stejne jako ve vite.config.ts - ESM build libsodium-wrappers je rozbity.
      "libsodium-wrappers": require.resolve("libsodium-wrappers"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.emu.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Oba soubory sahaji na tyz emulator - seriove, at si nesahaji do dat.
    fileParallelism: false,
  },
});
