// Mapa: vytvoreni pozvanky (12) - platnost + max pouziti, magic link
// a QR podoba (korekce H dle 12 §QR; logo a export az UX pass, rez 9).
// Token zije jen v teto obrazovce a v URL fragmentu (#join=...) -
// fragment se neposila serveru ani do logu. Revokace pres tokenHash.
import QRCode from "qrcode";
import { useState } from "react";
import { functions } from "../../lib/firebase";
import { callCreateInvite, callRevokeInvite, type CreatedInvite } from "./api";

export function inviteUrl(token: string): string {
  return `${window.location.origin}/#join=${token}`;
}

export function InvitePanel(props: { spaceId: string }) {
  const [ttlMin, setTtlMin] = useState(60);
  const [maxUses, setMaxUses] = useState(5);
  const [invite, setInvite] = useState<CreatedInvite | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "busy" | "error" | "revoked">("idle");

  async function handleCreate() {
    setStatus("busy");
    try {
      const created = await callCreateInvite(functions, {
        spaceId: props.spaceId,
        expiresInMinutes: ttlMin,
        maxUses,
      });
      // QR: tataz URL, korekce chyb H (12 §QR - rezerva na budouci logo).
      const dataUrl = await QRCode.toDataURL(inviteUrl(created.token), {
        errorCorrectionLevel: "H",
        margin: 4,
        width: 220,
      });
      setInvite(created);
      setQrDataUrl(dataUrl);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  async function handleRevoke() {
    if (!invite) return;
    setStatus("busy");
    try {
      await callRevokeInvite(functions, invite.tokenHash);
      setInvite(null);
      setQrDataUrl(null);
      setStatus("revoked");
    } catch {
      setStatus("error");
    }
  }

  if (invite) {
    return (
      <div className="invite">
        <p className="note">
          Pozvánka platí do {new Date(invite.expireAtMillis).toLocaleTimeString()}
          {" "}(max {invite.maxUses}×). Sdílej link nebo QR:
        </p>
        <input readOnly value={inviteUrl(invite.token)} onFocus={(e) => e.target.select()} />
        {qrDataUrl && <img src={qrDataUrl} alt="QR pozvánka" width={220} height={220} />}
        <button
          type="button"
          className="secondary"
          disabled={status === "busy"}
          onClick={() => void handleRevoke()}
        >
          Revokovat pozvánku
        </button>
      </div>
    );
  }

  return (
    <div className="invite">
      <label htmlFor="ttl">Platnost</label>
      <select id="ttl" value={ttlMin} onChange={(e) => setTtlMin(Number(e.target.value))}>
        <option value={10}>10 minut</option>
        <option value={60}>1 hodina</option>
        <option value={24 * 60}>24 hodin</option>
      </select>
      <label htmlFor="uses">Max. použití</label>
      <select id="uses" value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value))}>
        <option value={1}>1× (jednorázová)</option>
        <option value={5}>5×</option>
        <option value={15}>15×</option>
      </select>
      <button type="button" disabled={status === "busy"} onClick={() => void handleCreate()}>
        Vytvořit pozvánku
      </button>
      {status === "error" && <p className="note error">Pozvánku se nepodařilo vytvořit.</p>}
      {status === "revoked" && <p className="note">Pozvánka revokována.</p>}
    </div>
  );
}
