// Mapa: detekce povinnych API pri startu (14 - kompatibilitni matice).
// Chybi-li cokoli, aplikace se NESPUSTI v degradovanem rezimu -
// bezpecnost necouva; zobrazi se vysvetleni (main.tsx).
export function missingRequiredApis(): string[] {
  const missing: string[] = [];
  if (typeof crypto === "undefined" || typeof crypto.getRandomValues !== "function") {
    missing.push("Web Crypto (crypto.getRandomValues)");
  }
  if (typeof WebAssembly === "undefined") {
    missing.push("WebAssembly");
  }
  if (typeof indexedDB === "undefined") {
    missing.push("IndexedDB");
  }
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    missing.push("Service Worker");
  }
  return missing;
}
