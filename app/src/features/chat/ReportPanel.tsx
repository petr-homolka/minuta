// Mapa: nahlaseni bezici zpravy (27 §Nahlaseni). Se souhlasem
// nahlasujiciho se desifrovany obsah zapeceti na klic moderace
// (evidence.ts) a odesle pres CF; zprava se u nahlasujiciho hned uhasi.
// Odesilatel se o nahlaseni nedozvi.
import { useState } from "react";
import { sealEvidence, type ReportCategory } from "../../lib/crypto/evidence";
import { functions } from "../../lib/firebase";
import { callReportMessage } from "./api";
import type { MessageMeta } from "./useChatData";

const CATEGORIES: { value: ReportCategory; label: string }[] = [
  { value: "C1", label: "Ohrožení života / zneužívání" },
  { value: "C2", label: "Výhrůžky / vydírání / stalking" },
  { value: "C3", label: "Nenávist a obtěžování" },
  { value: "C4", label: "Podvod / spam" },
  { value: "C5", label: "Jiný nezákonný obsah" },
  { value: "C6", label: "Porušení podmínek" },
];

export function ReportPanel(props: {
  spaceId: string;
  message: MessageMeta;
  plaintext: string;
  onReported: () => void;
  onCancel: () => void;
}) {
  const [category, setCategory] = useState<ReportCategory>("C3");
  const [status, setStatus] = useState<"idle" | "busy" | "error">("idle");

  async function handleReport() {
    setStatus("busy");
    try {
      const evidence = await sealEvidence({
        v: 1,
        spaceId: props.spaceId,
        msgId: props.message.msgId,
        senderUid: props.message.senderUid,
        senderDeviceId: props.message.senderDeviceId,
        category,
        plaintext: props.plaintext,
      });
      await callReportMessage(functions, {
        spaceId: props.spaceId,
        msgId: props.message.msgId,
        reportedUid: props.message.senderUid,
        category,
        evidence,
      });
      props.onReported();
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="banner">
      <p>
        Nahlášením se obsah zprávy (s tvým souhlasem) předá moderaci jako
        zapečetěný důkaz. Odesílatel se o nahlášení nedozví.
      </p>
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as ReportCategory)}
      >
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.value} — {c.label}
          </option>
        ))}
      </select>{" "}
      <button type="button" disabled={status === "busy"} onClick={() => void handleReport()}>
        Nahlásit
      </button>{" "}
      <button type="button" className="secondary" onClick={props.onCancel}>
        Zrušit
      </button>
      {status === "error" && <p className="note error">Nahlášení selhalo.</p>}
    </div>
  );
}
