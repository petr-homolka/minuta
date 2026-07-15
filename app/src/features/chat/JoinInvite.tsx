// Mapa: vstup pozvankou (12) - nahled ("Vstupujes do Space - N clenu")
// a EXPLICITNI potvrzeni; nikdy nevstupuje automaticky (12 §bezpecnost).
// Token prisel v URL fragmentu (#join=...), server ho vidi az v joinSpace.
import { useEffect, useState } from "react";
import { functions } from "../../lib/firebase";
import { callJoinSpace, callPreviewInvite, type InvitePreview } from "./api";

type State =
  | { phase: "loading" }
  | { phase: "preview"; preview: InvitePreview }
  | { phase: "joining" }
  | { phase: "error" };

export function JoinInvite(props: {
  token: string;
  onJoined: (spaceId: string) => void;
  onDismiss: () => void;
}) {
  const [state, setState] = useState<State>({ phase: "loading" });
  const [password, setPassword] = useState("");

  useEffect(() => {
    let cancelled = false;
    callPreviewInvite(functions, props.token)
      .then((preview) => {
        if (!cancelled) setState({ phase: "preview", preview });
      })
      .catch(() => {
        if (!cancelled) setState({ phase: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [props.token]);

  async function handleJoin() {
    setState({ phase: "joining" });
    try {
      const spaceId = await callJoinSpace(
        functions,
        props.token,
        password || undefined,
      );
      props.onJoined(spaceId);
    } catch {
      setState({ phase: "error" });
    }
  }

  if (state.phase === "loading") {
    return <p className="note">Ověřuji pozvánku…</p>;
  }
  if (state.phase === "error") {
    return (
      <div>
        <p className="note error">
          Pozvánka není platná — vypršela, byla vyčerpána nebo revokována.
        </p>
        <button type="button" className="secondary" onClick={props.onDismiss}>
          Zavřít
        </button>
      </div>
    );
  }
  if (state.phase === "joining") {
    return <p className="note">Vstupuji…</p>;
  }

  const { preview } = state;
  return (
    <div>
      <h2>Pozvánka</h2>
      <p>
        Vstupuješ do {preview.type === "duo" ? "1:1 konverzace" : "Space"} —{" "}
        {preview.memberCount}{" "}
        {preview.memberCount === 1 ? "člen" : preview.memberCount < 5 ? "členové" : "členů"}
        {preview.spaceExpireAtMillis !== null &&
          `, vyprší ${new Date(preview.spaceExpireAtMillis).toLocaleString()}`}
        .
      </p>
      {preview.requiresPassword && (
        <>
          <label htmlFor="invite-password">Heslo pozvánky</label>
          <input
            id="invite-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </>
      )}
      <button type="button" onClick={() => void handleJoin()}>
        Vstoupit
      </button>{" "}
      <button type="button" className="secondary" onClick={props.onDismiss}>
        Zrušit
      </button>
    </div>
  );
}
