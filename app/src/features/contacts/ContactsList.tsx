// Mapa: seznam Znamych (40 §5) - identicon, moje pojmenovani, stav
// overeni; "Napsat" zalozi duo primo s peerUid (40 §2 - bez noveho
// magic linku). Roster se jen cte - vznika az prvnim ulozenim (PeerPanel).
import { useEffect, useState } from "react";
import { functions, metaDb } from "../../lib/firebase";
import { callCreateSpace } from "../chat/api";
import { loadDeviceIdentity } from "../device/key-store";
import { Identicon } from "./Identicon";
import { loadContacts, loadRosterKeyIfExists, type StoredContact } from "./store";

export function ContactsList(props: {
  uid: string;
  onOpenSpace: (spaceId: string) => void;
}) {
  const [contacts, setContacts] = useState<StoredContact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const identity = await loadDeviceIdentity(props.uid);
      if (!identity) return;
      const rosterKey = await loadRosterKeyIfExists(metaDb, props.uid, identity);
      if (!rosterKey) return;
      const loaded = await loadContacts(metaDb, props.uid, rosterKey);
      if (!cancelled) setContacts(loaded);
    })().catch(() => {
      if (!cancelled) setError("Známé se nepodařilo načíst.");
    });
    return () => {
      cancelled = true;
    };
  }, [props.uid]);

  async function handleWrite(contact: StoredContact) {
    setBusy(true);
    setError(null);
    try {
      const spaceId = await callCreateSpace(functions, "duo", contact.record.uid);
      props.onOpenSpace(spaceId);
    } catch {
      setError("Duo se nepodařilo založit (limit Spaces, nebo Známý bez zařízení).");
    } finally {
      setBusy(false);
    }
  }

  if (contacts.length === 0 && !error) {
    return null;
  }
  return (
    <div>
      <h3>Známí</h3>
      <ul className="spaces">
        {contacts.map((contact) => (
          <li key={contact.id} className="contact">
            <Identicon fingerprint={contact.record.ikFingerprint} size={28} />{" "}
            {contact.record.name} {contact.record.verified && "✓"}{" "}
            <button
              type="button"
              className="linklike"
              disabled={busy}
              onClick={() => void handleWrite(contact)}
            >
              Napsat
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="note error">{error}</p>}
    </div>
  );
}
