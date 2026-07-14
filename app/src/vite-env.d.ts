/// <reference types="vite/client" />

// Typy env promennych (viz .env.devcloud). Vsechny volitelne -
// bez nich bezi aplikace v DEV rezimu proti emulatorum.
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
