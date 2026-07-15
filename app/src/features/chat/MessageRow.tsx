// Mapa: vykresleni jedne zpravy PRESNE dle stavove tabulky 28:
//   odesilatel: ✓✓ doruceno -> "Cte se… ⏱ 0:47" (mini-ring) ->
//               "Precteno HH:MM · Shorelo HH:MM" (+ Odvolat/Spalit hned, N7)
//   prijemce:   zavrena obalka "Nova zprava" -> obsah + TimeRing 60->0
//               (+ Nahlasit, 27) -> "⌛ Zprava shorela"
// Casy tu slouzi JEN vykresleni - vynucuje server (ADR-008).
import { useNow } from "../../lib/use-now";
import { TimeRing } from "./TimeRing";
import type { MessageMeta } from "./useChatData";

const LIFE_MS = 60_000;

const timeFmt = (ms: number) =>
  new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function MessageRow(props: {
  message: MessageMeta;
  me: string;
  openedMsgId: string | null;
  burningText: string | null;
  secondsLeft: number;
  burned: boolean;
  busy: boolean;
  onOpen: () => void;
  onBurnOwn: () => void;
  onReport: () => void;
}) {
  const { message } = props;
  if (message.senderUid === props.me) {
    return <OwnMessageRow {...props} />;
  }
  if (message.msgId === props.openedMsgId && props.burningText !== null) {
    return (
      <span className="bubble open" aria-live="off">
        <TimeRing secondsLeft={props.secondsLeft} size={56} />
        <span className="bubble-text">{props.burningText}</span>
        <button
          type="button"
          className="linklike"
          disabled={props.busy}
          onClick={props.onReport}
          aria-label="Nahlásit zprávu moderaci"
        >
          Nahlásit
        </button>
      </span>
    );
  }
  if (message.msgId === props.openedMsgId && props.burned) {
    return <span className="note burned">⌛ Zpráva shořela</span>;
  }
  if (message.readAt) {
    // Otevrel jiny clen/zarizeni - v okne 90 s lze jeste cist (34 §5).
    const windowOpen = message.readAt.toMillis() + 90_000 > Date.now();
    return windowOpen ? (
      <button type="button" className="envelope" disabled={props.busy} onClick={props.onOpen}>
        ✉️ Nová zpráva <span className="note">(už hoří jinde)</span>
      </button>
    ) : (
      <span className="note burned">⌛ Zpráva shořela</span>
    );
  }
  return (
    <button
      type="button"
      className="envelope"
      disabled={props.busy}
      onClick={props.onOpen}
      aria-label="Nová zpráva - otevřením spustíš minutový odpočet"
    >
      ✉️ Nová zpráva
    </button>
  );
}

function OwnMessageRow(props: {
  message: MessageMeta;
  busy: boolean;
  onBurnOwn: () => void;
}) {
  const { message } = props;
  const now = useNow(1000);

  // Doruceno = obalka zapsana (08 §3); pred otevrenim lze odvolat (N7).
  if (!message.readAt) {
    return (
      <span className="note">
        ✓✓ doručeno{" "}
        <button
          type="button"
          className="linklike"
          disabled={props.busy}
          onClick={props.onBurnOwn}
          aria-label="Odvolat neotevřenou zprávu"
        >
          Odvolat
        </button>
      </span>
    );
  }

  const readAtMs = message.readAt.toMillis();
  const burnAtMs = readAtMs + LIFE_MS;
  if (burnAtMs > now) {
    // Zrcadlovy odpocet odesilatele (28: "Cte se… ⏱ 0:47").
    const left = Math.ceil((burnAtMs - now) / 1000);
    return (
      <span className="note reading">
        Čte se… <TimeRing secondsLeft={left} size={28} />{" "}
        <button
          type="button"
          className="linklike"
          disabled={props.busy}
          onClick={props.onBurnOwn}
          aria-label="Spálit zprávu hned"
        >
          Spálit hned
        </button>
      </span>
    );
  }
  return (
    <span className="note">
      Přečteno {timeFmt(readAtMs)} · Shořelo {timeFmt(burnAtMs)}
    </span>
  );
}
