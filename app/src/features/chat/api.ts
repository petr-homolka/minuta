// Mapa: volani Cloud Functions `/v1` (18 §2). Instance functions se
// predava parametrem (testovatelnost proti emulatoru s vice ucty).
import { httpsCallable, type Functions } from "firebase/functions";
import type { RecipientDevice } from "../../lib/crypto/message";

export interface KeyBundleDevice extends RecipientDevice {
  kxPk: string;
}

export interface SpaceRecipient extends KeyBundleDevice {
  uid: string;
}

export interface CreatedInvite {
  token: string;
  tokenHash: string;
  expireAtMillis: number;
  maxUses: number;
}

export interface InvitePreview {
  type: string;
  memberCount: number;
  spaceExpireAtMillis: number | null;
  requiresPassword: boolean;
}

function call<Req, Res>(functions: Functions, name: string) {
  return httpsCallable<Req, Res>(functions, name);
}

export async function callCreateSpace(
  functions: Functions,
  type: "duo" | "space",
  peerUid?: string,
): Promise<string> {
  const result = await call<
    { type: string; peerUid?: string },
    { spaceId: string }
  >(functions, "createSpace")({ type, ...(peerUid ? { peerUid } : {}) });
  return result.data.spaceId;
}

export async function callGetKeyBundles(
  functions: Functions,
  uid: string,
  spaceId: string,
): Promise<KeyBundleDevice[]> {
  const result = await call<
    { uid: string; spaceId: string },
    { devices: KeyBundleDevice[] }
  >(functions, "getKeyBundles")({ uid, spaceId });
  return result.data.devices;
}

export async function callGetSpaceKeyBundles(
  functions: Functions,
  spaceId: string,
): Promise<SpaceRecipient[]> {
  const result = await call<{ spaceId: string }, { devices: SpaceRecipient[] }>(
    functions,
    "getSpaceKeyBundles",
  )({ spaceId });
  return result.data.devices;
}

export async function callCreateInvite(
  functions: Functions,
  input: {
    spaceId: string;
    expiresInMinutes?: number;
    maxUses?: number;
    password?: string;
  },
): Promise<CreatedInvite> {
  const result = await call<typeof input, CreatedInvite>(
    functions,
    "createInvite",
  )(input);
  return result.data;
}

export async function callPreviewInvite(
  functions: Functions,
  token: string,
): Promise<InvitePreview> {
  const result = await call<{ token: string }, InvitePreview>(
    functions,
    "previewInvite",
  )({ token });
  return result.data;
}

export async function callJoinSpace(
  functions: Functions,
  token: string,
  password?: string,
): Promise<string> {
  const result = await call<
    { token: string; password?: string },
    { spaceId: string }
  >(functions, "joinSpace")({ token, ...(password ? { password } : {}) });
  return result.data.spaceId;
}

export async function callRevokeInvite(
  functions: Functions,
  tokenHash: string,
): Promise<void> {
  await call<{ tokenHash: string }, { revoked: boolean }>(
    functions,
    "revokeInvite",
  )({ tokenHash });
}

/** Klientska konfigurace (20): force update / kill switch + flagy. */
export async function callGetConfig(
  functions: Functions,
): Promise<{ minSupportedVersion: number; features: Record<string, boolean> }> {
  const result = await call<
    Record<string, never>,
    { minSupportedVersion: number; features: Record<string, boolean> }
  >(functions, "getConfig")({});
  return result.data;
}

/** Nahlaseni zpravy (27) - dukaz uz je zapeceteny na klic moderace. */
export async function callReportMessage(
  functions: Functions,
  input: {
    spaceId: string;
    msgId: string;
    reportedUid: string;
    category: string;
    evidence: string;
  },
): Promise<string> {
  const result = await call<typeof input, { reportId: string }>(
    functions,
    "reportMessage",
  )(input);
  return result.data.reportId;
}

/** Panika (N7 bod 4): spali vsechny me zive zpravy ve vsech Spaces. */
export async function callBurnAll(functions: Functions): Promise<number> {
  const result = await call<Record<string, never>, { deleted: number }>(
    functions,
    "burnAll",
  )({});
  return result.data.deleted;
}
