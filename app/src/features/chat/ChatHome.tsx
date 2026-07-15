// Mapa: domovska obrazovka - moje Spaces (collection-group listener)
// + zalozeni duo/Space. Vstup novych clenu je VYHRADNE pozvankou
// (11 §Vstup) - link/QR se vytvari uvnitr Space (InvitePanel).
import { useState } from "react";
import { ephemeralDb, functions } from "../../lib/firebase";
import { callCreateSpace } from "./api";
import { useMySpaces } from "./useChatData";

export function ChatHome(props: {
  uid: string;
  onOpenSpace: (spaceId: string) => void;
}) {
  const spaces = useMySpaces(ephemeralDb, props.uid);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

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
    </section>
  );
}
