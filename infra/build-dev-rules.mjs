// Vygeneruje infra/firestore.dev.rules - SJEDNOCENI meta + ephemeral
// Rules pro prostredi s JEDNOU databazi (emulator a projekt minuta-dev;
// kolekce obou logickych DB nekoliduji). Zdroj pravdy zustavaji per-DB
// soubory; tento soubor se generuje a necommituje.
// POZOR: staging/prod maji VZDY dve pojmenovane DB s per-DB Rules (ADR-007).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));

function innerMatches(file) {
  const text = readFileSync(join(dir, file), "utf8");
  const open = text.indexOf("match /databases/{db}/documents {");
  const close = text.lastIndexOf("}"); // service }
  const inner = text
    .slice(open + "match /databases/{db}/documents {".length, close)
    .replace(/\}\s*$/, ""); // documents }
  return inner.trimEnd();
}

const meta = innerMatches("firestore.meta.rules");
// Ephemeral az druhy: sdili nazev funkce signedIn() s meta - odstranime
// duplicitni deklaraci (stejne telo).
const ephemeral = innerMatches("firestore.ephemeral.rules").replace(
  /\n\s*function signedIn\(\) \{ return request\.auth != null; \}/,
  "",
);

const combined = `rules_version = '2';

// GENEROVANO skriptem infra/build-dev-rules.mjs - NEEDITOVAT RUCNE.
// Sjednoceni meta + ephemeral Rules pro jednodatabazova prostredi
// (emulator, minuta-dev). Zdroj pravdy: firestore.meta.rules
// a firestore.ephemeral.rules.
service cloud.firestore {
  match /databases/{db}/documents {
${meta}
${ephemeral}
  }
}
`;

writeFileSync(join(dir, "firestore.dev.rules"), combined);
console.log("infra/firestore.dev.rules vygenerovano.");
