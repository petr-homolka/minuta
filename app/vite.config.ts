// Vite + unit testy (Vitest). Emulatorove testy maji vlastni config
// (vitest.emu.config.ts) - nemichaji se do rychleho `npm test`.
import react from "@vitejs/plugin-react";
import { createRequire } from "node:module";
import { defineConfig } from "vitest/config";

const require = createRequire(import.meta.url);

export default defineConfig({
  plugins: [react()],
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
