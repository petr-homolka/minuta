// Mapa: koren aplikace. Dokonci magic link (je-li v URL), sleduje stav
// prihlaseni a po prihlaseni zajisti registraci zarizeni (37 §2).
import { useEffect, useState } from "react";
import { AuthScreen } from "./features/auth/AuthScreen";
import { completeMagicLinkIfPresent } from "./features/auth/magic-link";
import { signOutUser, useAuth } from "./features/auth/useAuth";
import { ensureDeviceRegistered } from "./features/device/registration";
import { metaDb } from "./lib/firebase";

type DeviceState =
  | { status: "pending" }
  | { status: "ready"; deviceId: string }
  | { status: "error" };

export function App() {
  const { user, loading } = useAuth();
  const [device, setDevice] = useState<DeviceState>({ status: "pending" });

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
      <p className="tagline">Přihlášení funguje. Konverzace přijdou v řezu 4.</p>
      <dl>
        <dt>Účet</dt>
        <dd>{user.isAnonymous ? "anonymní" : (user.email ?? "e-mail")}</dd>
        <dt>Zařízení</dt>
        <dd>
          {device.status === "pending" && "registruji…"}
          {device.status === "ready" && `registrováno (${device.deviceId.slice(0, 8)}…)`}
          {device.status === "error" && "registrace selhala — obnov stránku"}
        </dd>
      </dl>
      <button type="button" className="secondary" onClick={() => void signOutUser()}>
        Odhlásit se
      </button>
    </main>
  );
}
