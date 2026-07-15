// Mapa: obrazovka jednoho Space - listener obalek, odeslani, otevreni
// (zamek 34 §2) a 60s odpocet s wipe (useBurnCountdown). Stavy zprav
// dle 34 §4; plny vizual "Sklo a cas" (43) prijde v rezu 9.
import { collection, getDocs } from "firebase/firestore";
import { useState, type FormEvent } from "react";
import { x25519PublicFromSecret } from "../../lib/crypto/keys";
import { ephemeralDb, functions } from "../../lib/firebase";
import { loadDeviceIdentity, type DeviceIdentity } from "../device/key-store";
import { callGetKeyBundles } from "./api";
import { MAX_TEXT_LENGTH, openReceivedMessage, sendTextMessage } from "./messages";
import { useBurnCountdown } from "./useBurnCountdown";
import { useMessages, type MessageMeta } from "./useChatData";

export function ChatScreen(props: { uid: string; spaceId: string; onBack: () => void }) {
  const messages = useMessages(ephemeralDb, props.spaceId);
  const { burning, burned, ignite } = useBurnCountdown();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openedMsgId, setOpenedMsgId] = useState<string | null>(null);

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
      const peerUid = await otherMemberUid(props.uid, props.spaceId);
      const recipients = await callGetKeyBundles(functions, peerUid, props.spaceId);
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
    } catch {
      setError("Zprávu se nepodařilo otevřít (možná už shořela).");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <button type="button" className="secondary" onClick={props.onBack}>
        ← Zpět
      </button>
      <h2>Space {props.spaceId.slice(0, 8)}…</h2>

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
}) {
  const { message } = props;
  if (message.senderUid === props.me) {
    return (
      <span className="note">
        {message.readAt ? "otevřeno — dohořívá" : "odesláno (zavřená obálka)"}
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
    return <span className="note">otevřeno jinde / shořelo</span>;
  }
  return (
    <button type="button" disabled={props.busy} onClick={props.onOpen}>
      ✉️ Otevřít (spustí 60 s)
    </button>
  );
}

async function otherMemberUid(me: string, spaceId: string): Promise<string> {
  const members = await getDocs(collection(ephemeralDb, "spaces", spaceId, "members"));
  const other = members.docs.map((d) => d.id).find((uid) => uid !== me);
  if (!other) {
    throw new Error("Duo nema protistranu.");
  }
  return other;
}
