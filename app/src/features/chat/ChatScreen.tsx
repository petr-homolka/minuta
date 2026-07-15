// Mapa: obrazovka jednoho Space - listener obalek, odeslani, otevreni
// (zamek 34 §2) a 60s odpocet s wipe (useBurnCountdown). Stavy zprav
// dle 34 §4; plny vizual "Sklo a cas" (43) prijde v rezu 9.
import { useState, type FormEvent } from "react";
import { x25519PublicFromSecret } from "../../lib/crypto/keys";
import { ephemeralDb, functions } from "../../lib/firebase";
import { loadDeviceIdentity, type DeviceIdentity } from "../device/key-store";
import { callGetKeyBundles, callGetSpaceKeyBundles } from "./api";
import { InvitePanel } from "./InvitePanel";
import { PeerPanel } from "./PeerPanel";
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
  const messages = useMessages(ephemeralDb, props.spaceId);
  const { burning, burned, ignite } = useBurnCountdown();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openedMsgId, setOpenedMsgId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showPeer, setShowPeer] = useState(false);
  const [keyChange, setKeyChange] = useState<{
    uid: string;
    deviceId: string;
    newPk: string;
  } | null>(null);

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
      </button>
      <h2>Space {props.spaceId.slice(0, 8)}…</h2>
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

function MessageRow(props: {
  message: MessageMeta;
  me: string;
  openedMsgId: string | null;
  burningText: string | null;
  secondsLeft: number;
  burned: boolean;
  busy: boolean;
  onOpen: () => void;
  onBurnOwn: () => void;
}) {
  const { message } = props;
  if (message.senderUid === props.me) {
    // Kontrola odesilatele (N7 body 1-3): odvolat / spalit hned + stav
    // "Precteno HH:MM · Shori HH:MM" dle readAt.
    if (!message.readAt) {
      return (
        <span className="note">
          odesláno (zavřená obálka){" "}
          <button
            type="button"
            className="linklike"
            disabled={props.busy}
            onClick={props.onBurnOwn}
          >
            Odvolat
          </button>
        </span>
      );
    }
    const readAtMs = message.readAt.toMillis();
    const burnAtMs = readAtMs + 60_000;
    const fmt = (ms: number) =>
      new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return (
      <span className="note">
        {burnAtMs > Date.now()
          ? `přečteno ${fmt(readAtMs)} · dohořívá`
          : `přečteno ${fmt(readAtMs)} · shořelo ${fmt(burnAtMs)}`}{" "}
        {burnAtMs > Date.now() && (
          <button
            type="button"
            className="linklike"
            disabled={props.busy}
            onClick={props.onBurnOwn}
          >
            Spálit hned
          </button>
        )}
      </span>
    );
  }
  if (message.msgId === props.openedMsgId && props.burningText !== null) {
    return (
      <span>
        {props.burningText} <b className="countdown">{props.secondsLeft} s</b>
      </span>
    );
  }
  if (message.msgId === props.openedMsgId && props.burned) {
    return <span className="note">🔥 shořelo</span>;
  }
  if (message.readAt) {
    // Otevrel jiny clen/zarizeni - v okne 90 s lze jeste cist (34 §5);
    // cas tu slouzi jen vykresleni, branou zustavaji Rules.
    const windowOpen = message.readAt.toMillis() + 90_000 > Date.now();
    return windowOpen ? (
      <button type="button" disabled={props.busy} onClick={props.onOpen}>
        ✉️ Otevřít (už hoří jinde)
      </button>
    ) : (
      <span className="note">🔥 shořelo</span>
    );
  }
  return (
    <button type="button" disabled={props.busy} onClick={props.onOpen}>
      ✉️ Otevřít (spustí 60 s)
    </button>
  );
}
