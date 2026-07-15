// E2E rez 10 (20): getConfig - vychozi hodnoty, kill switch pres
// config/client dokument (klientum primo nedostupny).
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteApp } from "firebase/app";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { callGetConfig } from "../src/features/chat/api";
import { createParty, loadDevRules, type Party } from "./helpers";

let alice: Party;

beforeAll(async () => {
  await loadDevRules();
  alice = await createParty("cfg-alice");
}, 60_000);

afterAll(async () => {
  await deleteApp(alice.app);
});

describe("getConfig (20 §Release)", () => {
  it("bez dokumentu vraci bezpecne defaulty", async () => {
    const config = await callGetConfig(alice.functions);
    expect(config.minSupportedVersion).toBe(1);
    expect(config.features).toEqual({});
  });

  it("kill switch: hodnota z config/client se propise; klient ji primo necte", async () => {
    const env = await initializeTestEnvironment({ projectId: "demo-minuta" });
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "config", "client"), {
        minSupportedVersion: 99,
        features: { attachments: false },
      });
    });
    await env.cleanup();

    const config = await callGetConfig(alice.functions);
    expect(config.minSupportedVersion).toBe(99);
    expect(config.features).toEqual({ attachments: false });

    // Primy pristup klienta k configu je zakazany (default deny).
    await expect(getDoc(doc(alice.db, "config", "client"))).rejects.toThrow();

    // Uklid, at kill switch neblokne ostatni testovaci soubory.
    const cleanupEnv = await initializeTestEnvironment({ projectId: "demo-minuta" });
    await cleanupEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "config", "client"), {
        minSupportedVersion: 1,
        features: {},
      });
    });
    await cleanupEnv.cleanup();
  });
});
