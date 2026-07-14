// Mapa: prihlasovaci obrazovka - e-mail magic link + anonymni vstup (07).
import { useState, type FormEvent } from "react";
import { sendMagicLink } from "./magic-link";
import { signInAnonymous } from "./useAuth";

type Status = "idle" | "sending" | "sent" | "error";

export function AuthScreen() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("sending");
    try {
      await sendMagicLink(email);
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="card">
      <h1>Minuta</h1>
      <p className="tagline">Zpráva žije 60 sekund.</p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" disabled={status === "sending"}>
          Poslat přihlašovací odkaz
        </button>
      </form>

      {status === "sent" && (
        <p className="note">
          Odkaz odeslán. Ve vývoji e-maily nechodí — odkaz najdeš v terminálu
          emulátoru nebo v Emulator UI (localhost:4000, záložka Auth).
        </p>
      )}
      {status === "error" && <p className="note error">Odeslání selhalo, zkus to znovu.</p>}

      <hr />
      <button type="button" className="secondary" onClick={() => void signInAnonymous()}>
        Vstoupit anonymně
      </button>
    </main>
  );
}
