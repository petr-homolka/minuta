// Mapa: verze klienta a force-update brana (20 §Release).
// APP_VERSION se zvysuje s kazdym release; server (getConfig) urcuje
// minSupportedVersion. Sitova chyba = fail-open (offline uzivatele
// nezamykame), explicitne nizsi verze = hard block (kill switch).
export const APP_VERSION = 1;

export function isVersionSupported(minSupportedVersion: number): boolean {
  return APP_VERSION >= minSupportedVersion;
}
