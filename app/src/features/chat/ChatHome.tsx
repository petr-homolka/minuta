// Mapa: domovska obrazovka - moje Spaces (collection-group listener),
// zalozeni duo/Space a panicke "Spalit vse" (N7 bod 4, dvoukrokove
// potvrzeni). Vstup novych clenu je VYHRADNE pozvankou (11 §Vstup) -
// link/QR se vytvari uvnitr Space (InvitePanel).
import { useState } from "react";
import { ephemeralDb, functions } from "../../lib/firebase";
import { ContactsList } from "../contacts/ContactsList";
import { callBurnAll, callCreateSpace } from "./api";
import { useMySpaces } from "./useChatData";

export function ChatHome(props: {
  uid: string;
  onOpenSpace: (spaceId: string) => void;
}) {
  const spaces = useMySpaces(ephemeralDb, props.uid);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [burnState, setBurnState] = useState<"idle" | "confirm" | "busy" | "done">(
    "idle",
  );

  async function handleCreate(type: "duo" | "space") {
    setCreating(true);
    setError(null);
    try {
      const spaceId = await callCreateSpace(functions, type);
      props.onOpenSpace(spaceId);
    } catch {
      setError("Založení selhalo — možná máš vyčerpaný limit 3 aktivních Spaces.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section>
      <ContactsList uid={props.uid} onOpenSpace={props.onOpenSpace} />
      <h2>Konverzace</h2>
      {spaces.length === 0 && (
        <p className="note">Zatím žádná. Založ novou, nebo vstup pozvánkou.</p>
      )}
      <ul className="spaces">
        {spaces.map((s) => (
          <li key={s.spaceId}>
            <button type="button" onClick={() => props.onOpenSpace(s.spaceId)}>
              Space {s.spaceId.slice(0, 8)}… ({s.role})
            </button>
          </li>
        ))}
      </ul>

      <button type="button" disabled={creating} onClick={() => void handleCreate("duo")}>
        Nová 1:1 konverzace
      </button>{" "}
      <button
        type="button"
        disabled={creating}
        onClick={() => void handleCreate("space")}
      >
        Nový Space
      </button>
      {error && <p className="note error">{error}</p>}

      <hr />
      {burnState === "idle" && (
        <button type="button" className="secondary" onClick={() => setBurnState("confirm")}>
          🔥 Spálit vše
        </button>
      )}
      {burnState === "confirm" && (
        <p className="note">
          Opravdu spálit všechny tvé živé zprávy ve všech konverzacích?{" "}
          <button
            type="button"
            className="linklike"
            onClick={() => {
              setBurnState("busy");
              callBurnAll(functions)
                .then(() => setBurnState("done"))
                .catch(() => {
                  setBurnState("idle");
                  setError("Spálení selhalo.");
                });
            }}
          >
            Ano, spálit
          </button>{" "}
          <button type="button" className="linklike" onClick={() => setBurnState("idle")}>
            Zrušit
          </button>
        </p>
      )}
      {burnState === "busy" && <p className="note">Pálím…</p>}
      {burnState === "done" && <p className="note">🔥 Spáleno.</p>}
    </section>
  );
}
