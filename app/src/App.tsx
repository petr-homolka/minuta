// Mapa: koren aplikace. Dokonci magic link (je-li v URL), sleduje stav
// prihlaseni, zajisti registraci zarizeni (37 §2) a prepina
// ChatHome <-> ChatScreen (rez 4).
import { useEffect, useState } from "react";
import { AuthScreen } from "./features/auth/AuthScreen";
import { completeMagicLinkIfPresent } from "./features/auth/magic-link";
import { signOutUser, useAuth } from "./features/auth/useAuth";
import { ChatHome } from "./features/chat/ChatHome";
import { ChatScreen } from "./features/chat/ChatScreen";
import { ensureDeviceRegistered } from "./features/device/registration";
import { metaDb } from "./lib/firebase";

type DeviceState =
  | { status: "pending" }
  | { status: "ready"; deviceId: string }
  | { status: "error" };

export function App() {
  const { user, loading } = useAuth();
  const [device, setDevice] = useState<DeviceState>({ status: "pending" });
  const [openSpaceId, setOpenSpaceId] = useState<string | null>(null);

  useEffect(() => {
    completeMagicLinkIfPresent().catch(() => {
      // Neplatny/prosly odkaz - uzivatel proste zustane na prihlaseni.
    });
  }, []);

  useEffect(() => {
    if (!user) {
      setDevice({ status: "pending" });
      return;
    }
    let cancelled = false;
    ensureDeviceRegistered(metaDb, user.uid)
      .then((deviceId) => {
        if (!cancelled) setDevice({ status: "ready", deviceId });
      })
      .catch(() => {
        if (!cancelled) setDevice({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) {
    return <main className="card">Načítám…</main>;
  }
  if (!user) {
    return <AuthScreen />;
  }

  return (
    <main className="card">
      <h1>Minuta</h1>
      {device.status === "pending" && <p className="note">Připravuji zařízení…</p>}
      {device.status === "error" && (
        <p className="note error">Registrace zařízení selhala — obnov stránku.</p>
      )}
      {device.status === "ready" &&
        (openSpaceId ? (
          <ChatScreen
            uid={user.uid}
            spaceId={openSpaceId}
            onBack={() => setOpenSpaceId(null)}
          />
        ) : (
          <ChatHome uid={user.uid} onOpenSpace={setOpenSpaceId} />
        ))}
      <hr />
      <p className="note">
        Účet: {user.isAnonymous ? "anonymní" : (user.email ?? "e-mail")}{" "}
        <button type="button" className="linklike" onClick={() => void signOutUser()}>
          Odhlásit se
        </button>
      </p>
    </main>
  );
}
