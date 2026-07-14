// Mapa: lokalni identita zarizeni - deviceId + privatni klice v IndexedDB,
// klicovano per uid (jeden prohlizec muze postupne hostit vice uctu).
// Privatni klice NIKDY neopousteji zarizeni a NIKDY se neloguji (33 §7).
// Smazani uloziste prohlizece = nove zarizeni; stare srva na serveru a
// uklidi ho auto-revokace po 90 dnech neaktivity (37 §6).
import { idbDelete, idbGet, idbSet } from "../../lib/idb";
import type { DevicePrivateKeys } from "../../lib/crypto/keys";

export interface DeviceIdentity {
  deviceId: string;
  privateKeys: DevicePrivateKeys;
}

const storageKey = (uid: string): string => `device-identity:${uid}`;

export async function loadDeviceIdentity(uid: string): Promise<DeviceIdentity | undefined> {
  return idbGet<DeviceIdentity>(storageKey(uid));
}

export async function saveDeviceIdentity(uid: string, identity: DeviceIdentity): Promise<void> {
  await idbSet(storageKey(uid), identity);
}

export async function clearDeviceIdentity(uid: string): Promise<void> {
  await idbDelete(storageKey(uid));
}
