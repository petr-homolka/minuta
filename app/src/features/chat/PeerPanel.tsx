// Mapa: panel protistrany v duu (37 §4, 40) - identicon, bezpecnostni
// kod (12 cislic + QR, 33 §6), oznaceni "overeno" (vazane na aktualni IK)
// a ulozeni mezi Zname (sifrovany roster, 40 §3).
// U vicecelenneho Space se zobrazi prvni protistrana (per-clen overeni
// prijde s UX passem).
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { formatSafetyCode, ikFingerprint, safetyCode } from "../../lib/crypto/fingerprint";
import { identityPublicFromSecret } from "../../lib/crypto/keys";
import { functions, metaDb } from "../../lib/firebase";
import { Identicon } from "../contacts/Identicon";
import { addContact, ensureRosterKey } from "../contacts/store";
import { loadDeviceIdentity } from "../device/key-store";
import { callGetSpaceKeyBundles } from "./api";
import { isVerified, markVerified } from "./tofu";

interface PeerInfo {
  uid: string;
  identityPk: string;
  fingerprint: string;
  code: string;
  qrDataUrl: string;
  verified: boolean;
}

export function PeerPanel(props: { uid: string; spaceId: string }) {
  const [peer, setPeer] = useState<PeerInfo | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [contactName, setContactName] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const identity = await loadDeviceIdentity(props.uid);
      if (!identity) throw new Error("bez klicu");
      const recipients = await callGetSpaceKeyBundles(functions, props.spaceId);
      const first = recipients[0];
      if (!first) {
        if (!cancelled) setStatus("empty");
        return;
      }
      const myIk = await identityPublicFromSecret(identity.privateKeys.identitySk);
      const code = await safetyCode(myIk, first.identityPk);
      const [fingerprint, qrDataUrl, verified] = await Promise.all([
        ikFingerprint(first.identityPk),
        QRCode.toDataURL(`minuta:verify:${code}`, { errorCorrectionLevel: "H", width: 160 }),
        isVerified(first.uid, first.identityPk),
      ]);
      if (!cancelled) {
        setPeer({ uid: first.uid, identityPk: first.identityPk, fingerprint, code, qrDataUrl, verified });
        setStatus("ready");
      }
    })().catch(() => {
      if (!cancelled) setStatus("error");
    });
    return () => {
      cancelled = true;
    };
  }, [props.uid, props.spaceId]);

  async function handleVerify() {
    if (!peer) return;
    await markVerified(peer.uid, peer.identityPk);
    setPeer({ ...peer, verified: true });
  }

  async function handleSaveContact() {
    if (!peer || contactName.trim().length === 0) return;
    const identity = await loadDeviceIdentity(props.uid);
    if (!identity) return;
    const rosterKey = await ensureRosterKey(metaDb, props.uid, identity);
    await addContact(metaDb, props.uid, rosterKey, {
      uid: peer.uid,
      name: contactName.trim().slice(0, 32),
      ikFingerprint: peer.fingerprint,
      verified: peer.verified,
    });
    setSaved(true);
  }

  if (status === "loading") return <p className="note">Načítám protistranu…</p>;
  if (status === "empty") return <p className="note">Ve Space zatím nikdo není.</p>;
  if (status === "error" || !peer) return <p className="note error">Nelze načíst protistranu.</p>;

  return (
    <div className="peer">
      <p>
        <Identicon fingerprint={peer.fingerprint} size={40} />{" "}
        {peer.verified ? "ověřeno ✓" : "neověřeno"}
      </p>
      <p className="note">
        Bezpečnostní kód (porovnej jiným kanálem nebo naskenuj):{" "}
        <b className="code">{formatSafetyCode(peer.code)}</b>
      </p>
      <img src={peer.qrDataUrl} alt="QR bezpečnostního kódu" width={160} height={160} />
      {!peer.verified && (
        <p>
          <button type="button" onClick={() => void handleVerify()}>
            Kódy souhlasí — označit jako ověřené
          </button>
        </p>
      )}
      {saved ? (
        <p className="note">Uloženo mezi Známé ✓</p>
      ) : (
        <p>
          <input
            placeholder="Moje jméno pro protistranu"
            value={contactName}
            maxLength={32}
            onChange={(e) => setContactName(e.target.value)}
          />{" "}
          <button type="button" onClick={() => void handleSaveContact()}>
            Uložit mezi Známé
          </button>
        </p>
      )}
    </div>
  );
}
