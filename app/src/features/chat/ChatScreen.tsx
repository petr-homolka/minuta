// Mapa: obrazovka jednoho Space - listener obalek, odeslani, otevreni
// (zamek 34 §2), 60s odpocet s wipe, key-change banner (37 §3),
// nahlaseni (27) a skryvani obalek od blokovanych. Radky zprav
// vykresluje MessageRow.tsx; plny vizual "Sklo a cas" (43) v rezu 9.
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState, type FormEvent } from "react";
import { x25519PublicFromSecret } from "../../lib/crypto/keys";
import { ephemeralDb, functions, metaDb } from "../../lib/firebase";
import { loadDeviceIdentity, type DeviceIdentity } from "../device/key-store";
import { callGetKeyBundles, callGetSpaceKeyBundles, callLeaveSpace } from "./api";
import { listBlockedUids } from "./blocks";
import { InvitePanel } from "./InvitePanel";
import { MessageRow } from "./MessageRow";
import { PeerPanel } from "./PeerPanel";
import { ReportPanel } from "./ReportPanel";
import {
  burnOwnMessage,
  MAX_TEXT_LENGTH,
  openReceivedMessage,
  sendTextMessage,
} from "./messages";
import { acceptNewKey, KeyChangedError } from "./tofu";
import { useBurnCountdown } from "./useBurnCountdown";
import { useMessages, type MessageMeta } from "./useChatData";

export function ChatScreen(props: { uid: string; spaceId: string; onBack: () => void }) {
  const allMessages = useMessages(ephemeralDb, props.spaceId);
  const { burning, burned, ignite, snuff, announcement } = useBurnCountdown();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openedMsgId, setOpenedMsgId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showPeer, setShowPeer] = useState(false);
  const [reporting, setReporting] = useState<MessageMeta | null>(null);
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [keyChange, setKeyChange] = useState<{
    uid: string;
    deviceId: string;
    newPk: string;
  } | null>(null);

  useEffect(() => {
    listBlockedUids(metaDb, props.uid)
      .then(setBlocked)
      .catch(() => setBlocked(new Set()));
  }, [props.uid, showPeer]); // showPeer: po (od)blokovani v panelu obnovit

  // Zanik mistnosti (ADR-014): kdyz Space doc zmizi (nekdo odesel nebo
  // owner spalil), vyhod me z obrazovky. Smazani clenstvi se z pohledu
  // uz-neclena projevi jako permission-denied (ne jako !exists), proto
  // odchazime i pri chybe listeneru. Bezi i pro toho, kdo neodesel.
  useEffect(() => {
    return onSnapshot(
      doc(ephemeralDb, "spaces", props.spaceId),
      (snap) => {
        if (!snap.exists()) props.onBack();
      },
      () => props.onBack(),
    );
    // onBack je stabilni akce navigace; re-subscribe pri jeho zmene nevadi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.spaceId]);

  // Obalky od blokovanych se nezobrazuji (27) - server jim navic
  // nevydava nase bundly, takze nove zpravy pro nas ani nevznikaji.
  const messages = allMessages.filter((m) => !blocked.has(m.senderUid));

  async function requireIdentity(): Promise<DeviceIdentity> {
    const identity = await loadDeviceIdentity(props.uid);
    if (!identity) {
      throw new Error("Zarizeni nema klice.");
    }
    return identity;
  }

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const identity = await requireIdentity();
      // Prijemci = vsechna aktivni zarizeni vsech ostatnich clenu (ADR-012).
      const recipients = await callGetSpaceKeyBundles(functions, props.spaceId);
      if (recipients.length === 0) {
        throw new Error("Ve Space zatim nikdo neni.");
      }
      await sendTextMessage({
        db: ephemeralDb,
        spaceId: props.spaceId,
        text,
        sender: {
          uid: props.uid,
          deviceId: identity.deviceId,
          identitySk: identity.privateKeys.identitySk,
        },
        recipients,
      });
      setText("");
    } catch {
      setError("Odeslání selhalo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleBurnOwn(message: MessageMeta) {
    setBusy(true);
    setError(null);
    try {
      await burnOwnMessage(ephemeralDb, props.spaceId, message.msgId);
    } catch {
      setError("Spálení selhalo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLeave() {
    setBusy(true);
    setError(null);
    try {
      await callLeaveSpace(functions, props.spaceId);
      props.onBack(); // Space listener by nas vyhodil tak jako tak.
    } catch {
      setError("Místnost se nepodařilo ukončit.");
      setBusy(false);
    }
  }

  async function handleOpen(message: MessageMeta) {
    setBusy(true);
    setError(null);
    try {
      const identity = await requireIdentity();
      const senderDevices = await callGetKeyBundles(
        functions,
        message.senderUid,
        props.spaceId,
      );
      const senderDevice = senderDevices.find(
        (d) => d.deviceId === message.senderDeviceId,
      );
      if (!senderDevice) {
        throw new Error("Zarizeni odesilatele neni k dispozici.");
      }
      const opened = await openReceivedMessage({
        db: ephemeralDb,
        spaceId: props.spaceId,
        msgId: message.msgId,
        senderUid: message.senderUid,
        senderDeviceId: message.senderDeviceId,
        presentedSenderIdentityPk: senderDevice.identityPk,
        receiver: {
          deviceId: identity.deviceId,
          wrapPk: await x25519PublicFromSecret(identity.privateKeys.signedPrekeySk),
          wrapSk: identity.privateKeys.signedPrekeySk,
        },
      });
      setOpenedMsgId(message.msgId);
      ignite(opened.plaintext);
    } catch (e) {
      if (e instanceof KeyChangedError) {
        // 37 §3: nezablokovat, ale nezprehlednutelne upozornit.
        const senderDevices = await callGetKeyBundles(
          functions,
          message.senderUid,
          props.spaceId,
        ).catch(() => []);
        const device = senderDevices.find((d) => d.deviceId === message.senderDeviceId);
        setKeyChange({
          uid: message.senderUid,
          deviceId: message.senderDeviceId,
          newPk: device?.identityPk ?? "",
        });
      } else {
        setError("Zprávu se nepodařilo otevřít (možná už shořela).");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <button type="button" className="secondary" onClick={props.onBack}>
        ← Zpět
      </button>{" "}
      <button
        type="button"
        className="secondary"
        onClick={() => setShowInvite((v) => !v)}
      >
        {showInvite ? "Skrýt pozvánku" : "Pozvat"}
      </button>{" "}
      <button
        type="button"
        className="secondary"
        onClick={() => setShowPeer((v) => !v)}
      >
        {showPeer ? "Skrýt ověření" : "Ověřit / Známí"}
      </button>{" "}
      <button
        type="button"
        className="secondary"
        disabled={busy}
        onClick={() => setLeaveConfirm(true)}
      >
        Ukončit místnost
      </button>
      <h2>Space {props.spaceId.slice(0, 8)}…</h2>

      {leaveConfirm && (
        <div className="banner">
          <p>
            Odchodem <b>místnost zanikne pro všechny</b> — všechny zprávy
            zmizí a nikdo se už nepřipojí (ADR-014).
          </p>
          <button type="button" disabled={busy} onClick={() => void handleLeave()}>
            Ano, ukončit místnost
          </button>{" "}
          <button
            type="button"
            className="secondary"
            onClick={() => setLeaveConfirm(false)}
          >
            Zrušit
          </button>
        </div>
      )}

      {showInvite && <InvitePanel spaceId={props.spaceId} />}
      {showPeer && <PeerPanel uid={props.uid} spaceId={props.spaceId} />}

      {keyChange && (
        <div className="banner">
          <p>
            ⚠️ Klíče protistrany se změnily — nové zařízení, nebo nový telefon.
            Ověř bezpečnostní kód, pokud si chceš být jistý (37 §3).
          </p>
          <button
            type="button"
            disabled={busy || keyChange.newPk === ""}
            onClick={() => {
              void acceptNewKey(keyChange.uid, keyChange.deviceId, keyChange.newPk).then(
                () => setKeyChange(null),
              );
            }}
          >
            Důvěřovat novým klíčům
          </button>{" "}
          <button
            type="button"
            className="secondary"
            onClick={() => setKeyChange(null)}
          >
            Zavřít
          </button>
        </div>
      )}

      {reporting && burning && (
        <ReportPanel
          spaceId={props.spaceId}
          message={reporting}
          plaintext={burning.text}
          onReported={() => {
            setReporting(null);
            snuff(); // nahlasena zprava se u nahlasujiciho hned uhasi (27)
          }}
          onCancel={() => setReporting(null)}
        />
      )}

      {/* Oznameni odpoctu pro odecitace obrazovky (28) - vizualne skryte. */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {messages.length === 0 && (
        <p className="empty-state">Zprávy tu žijí jen minutu.</p>
      )}
      <ul className="messages">
        {messages.map((m) => (
          <li key={m.msgId} className={m.senderUid === props.uid ? "mine" : "theirs"}>
            <MessageRow
              message={m}
              me={props.uid}
              openedMsgId={openedMsgId}
              burningText={burning?.text ?? null}
              secondsLeft={burning?.secondsLeft ?? 0}
              burned={burned}
              busy={busy}
              onOpen={() => void handleOpen(m)}
              onBurnOwn={() => void handleBurnOwn(m)}
              onReport={() => setReporting(m)}
            />
          </li>
        ))}
      </ul>

      <form onSubmit={handleSend}>
        <input
          value={text}
          maxLength={MAX_TEXT_LENGTH}
          placeholder="Zpráva…"
          required
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" disabled={busy}>
          Odeslat
        </button>
      </form>
      {error && <p className="note error">{error}</p>}
    </section>
  );
}
