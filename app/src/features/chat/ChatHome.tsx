// Mapa: domovska obrazovka chatu - moje Spaces + zalozeni dua podle UID
// protistrany. Pozvanky magic linkem/QR prijdou v rezu 5 (12).
import { useState, type FormEvent } from "react";
import { ephemeralDb, functions } from "../../lib/firebase";
import { callCreateSpace } from "./api";
import { useMySpaces } from "./useChatData";

export function ChatHome(props: {
  uid: string;
  onOpenSpace: (spaceId: string) => void;
}) {
  const spaces = useMySpaces(ephemeralDb, props.uid);
  const [peerUid, setPeerUid] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const spaceId = await callCreateSpace(functions, peerUid.trim());
      setPeerUid("");
      props.onOpenSpace(spaceId);
    } catch {
      setError("Duo se nepodařilo založit — zkontroluj UID protistrany.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section>
      <h2>Konverzace</h2>
      {spaces.length === 0 && <p className="note">Zatím žádná.</p>}
      <ul className="spaces">
        {spaces.map((s) => (
          <li key={s.spaceId}>
            <button type="button" onClick={() => props.onOpenSpace(s.spaceId)}>
              Space {s.spaceId.slice(0, 8)}… ({s.role})
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={handleCreate}>
        <label htmlFor="peer">UID protistrany (řez 5 přinese pozvánky)</label>
        <input
          id="peer"
          value={peerUid}
          required
          onChange={(e) => setPeerUid(e.target.value)}
        />
        <button type="submit" disabled={creating}>
          Založit duo
        </button>
      </form>
      {error && <p className="note error">{error}</p>}

      <p className="note">
        Moje UID (sdílej protistraně): <code>{props.uid}</code>
      </p>
    </section>
  );
}
