// Mapa: vstupni bod - detekce povinnych API (14), registrace Service
// Workera (offline shell, auto-update) a mount Reactu. Nepodporovany
// prohlizec = zadny degradovany rezim, jen vysvetleni.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App";
import { missingRequiredApis } from "./lib/support";
import "./app.css";

registerSW({ immediate: true });

const root = document.getElementById("root");
if (!root) {
  throw new Error("Chybi element #root.");
}

const missing = missingRequiredApis();
if (missing.length > 0) {
  root.innerHTML = "";
  const main = document.createElement("main");
  main.className = "card";
  main.innerHTML =
    "<h1>Minuta</h1><p>Tvůj prohlížeč nepodporuje vše, co bezpečný provoz " +
    `vyžaduje (${missing.join(", ")}).</p>` +
    "<p>Použij prosím Chrome/Edge 110+, Safari 16.4+ nebo Firefox 115+.</p>";
  root.appendChild(main);
} else {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
