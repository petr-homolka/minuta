// Mapa: koren aplikace. Dokonci magic link (je-li v URL), sleduje stav
// prihlaseni, zajisti registraci zarizeni (37 §2) a prepina
// ChatHome <-> ChatScreen (rez 4).
import { useEffect, useState } from "react";
import { AuthScreen } from "./features/auth/AuthScreen";
import { completeMagicLinkIfPresent } from "./features/auth/magic-link";
import { signOutUser, useAuth } from "./features/auth/useAuth";
import { callGetConfig } from "./features/chat/api";
import { ChatHome } from "./features/chat/ChatHome";
import { ChatScreen } from "./features/chat/ChatScreen";
import { JoinInvite } from "./features/chat/JoinInvite";
import { ensureDeviceRegistered } from "./features/device/registration";
import { functions, metaDb } from "./lib/firebase";
import { isVersionSupported } from "./lib/version";

/** Precte token pozvanky z fragmentu (#join=...) bez vedlejsiho ucinku. */
function readJoinToken(): string | null {
  const match = /^#join=([A-Za-z0-9_-]{16,128})$/.exec(window.location.hash);
  return match?.[1] ?? null;
}

/** Smaze pozvanku z URL (az kdyz ji uzivatel vyresil - StrictMode-safe). */
function clearJoinToken(): void {
  if (window.location.hash.startsWith("#join=")) {
    window.history.replaceState(null, "", "/");
  }
}

type DeviceState =
  | { status: "pending" }
  | { status: "ready"; deviceId: string }
  | { status: "error" };

export function App() {
  const { user, loading } = useAuth();
  const [device, setDevice] = useState<DeviceState>({ status: "pending" });
  const [openSpaceId, setOpenSpaceId] = useState<string | null>(null);
  const [joinToken, setJoinToken] = useState<string | null>(null);
  const [outdated, setOutdated] = useState(false);

  useEffect(() => {
    // Force update / kill switch (20): explicitne nizsi verze = hard
    // block; sitova chyba = fail-open (offline uzivatele nezamykame).
    callGetConfig(functions)
      .then((config) => setOutdated(!isVersionSupported(config.minSupportedVersion)))
      .catch(() => setOutdated(false));
    setJoinToken(readJoinToken());
    completeMagicLinkIfPresent().catch(() => {
      // Neplatny/prosly odkaz - uzivatel proste zustane na prihlaseni.
    });
    // Zachyt i pozvanku otevrenou pri uz bezici aplikaci (zmena #hash
    // nereloaduje stranku, takze mount effect by ji minul).
    const onHashChange = () => setJoinToken(readJoinToken());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Zmena uctu (vc. odhlaseni) resetuje navigaci - stav jednoho uzivatele
  // nesmi protect k druhemu (stale openSpaceId po prihlaseni jineho uctu).
  const uid = user?.uid ?? null;
  useEffect(() => {
    setOpenSpaceId(null);
  }, [uid]);

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

  if (outdated) {
    return (
      <main className="card">
        <h1>Minuta</h1>
        <p>
          Tahle verze aplikace už není z bezpečnostních důvodů podporovaná.
          Zavři a znovu otevři aplikaci — aktualizace proběhne sama.
        </p>
      </main>
    );
  }
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
        (joinToken ? (
          <JoinInvite
            token={joinToken}
            onJoined={(spaceId) => {
              clearJoinToken();
              setJoinToken(null);
              setOpenSpaceId(spaceId);
            }}
            onDismiss={() => {
              clearJoinToken();
              setJoinToken(null);
            }}
          />
        ) : openSpaceId ? (
          <ChatScreen
            uid={user.uid}
            spaceId={openSpaceId}
            onBack={() => setOpenSpaceId(null)}
          />
        ) : (
          <ChatHome
            uid={user.uid}
            isAnonymous={user.isAnonymous}
            onOpenSpace={setOpenSpaceId}
          />
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
