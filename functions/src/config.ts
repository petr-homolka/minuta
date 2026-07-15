// Mapa: klientska konfigurace (18 §2 "GET /v1/config"; 20 §Release).
// Vraci minSupportedVersion (force update / kill switch kompromitovane
// verze) a feature flagy. Zdroj: meta dokument config/client - klientum
// primo NEdostupny (default deny), meni se adminem; zmena
// minSupportedVersion podleha ctyrem ocim (29 §1.4). Bez dokumentu
// plati bezpecne vychozi hodnoty. Umyslne funguje i bez prihlaseni.
import { onCall } from "firebase-functions/v2/https";
import { metaDb, REGION } from "./lib/db";

const DEFAULTS = { minSupportedVersion: 1, features: {} };

export const getConfig = onCall({ region: REGION }, async () => {
  const snap = await metaDb.doc("config/client").get();
  if (!snap.exists) {
    return DEFAULTS;
  }
  return {
    minSupportedVersion:
      (snap.get("minSupportedVersion") as number | undefined) ??
      DEFAULTS.minSupportedVersion,
    features: (snap.get("features") as Record<string, boolean> | undefined) ?? {},
  };
});
