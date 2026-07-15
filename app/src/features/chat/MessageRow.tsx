// Mapa: vykresleni jedne zpravy dle stavu (34 §4) - vlastni (kontrola
// odesilatele N7: odvolat/spalit hned + stav precteno/shorelo) vs. cizi
// (otevrit/hori/shorelo + moznost nahlaseni behem horeni, 27).
import type { MessageMeta } from "./useChatData";

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
      <span>
        {props.burningText} <b className="countdown">{props.secondsLeft} s</b>{" "}
        <button
          type="button"
          className="linklike"
          disabled={props.busy}
          onClick={props.onReport}
        >
          Nahlásit
        </button>
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

function OwnMessageRow(props: {
  message: MessageMeta;
  busy: boolean;
  onBurnOwn: () => void;
}) {
  const { message } = props;
  // Kontrola odesilatele (N7 body 1-3): odvolat / spalit hned + stav
  // "precteno HH:MM · shorelo HH:MM" dle readAt.
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
