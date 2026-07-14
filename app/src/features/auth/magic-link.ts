// Mapa: prihlaseni e-mail magic linkem (07). sendMagicLink odesle odkaz,
// completeMagicLinkIfPresent dokonci prihlaseni po navratu z odkazu.
// V emulatoru se e-mail neposila - odkaz je v terminalu a v Emulator UI.
import {
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
} from "firebase/auth";
import { auth } from "../../lib/firebase";

// Jen e-mail pro dokonceni prihlaseni (standardni Firebase tok) -
// zadny obsah zprav v localStorage (14).
const EMAIL_KEY = "minuta:emailForSignIn";

export async function sendMagicLink(email: string): Promise<void> {
  await sendSignInLinkToEmail(auth, email, {
    url: window.location.origin,
    handleCodeInApp: true,
  });
  window.localStorage.setItem(EMAIL_KEY, email);
}

/** Vraci true, pokud aktualni URL byla magic link a prihlaseni probehlo. */
export async function completeMagicLinkIfPresent(): Promise<boolean> {
  if (!isSignInWithEmailLink(auth, window.location.href)) {
    return false;
  }
  const stored = window.localStorage.getItem(EMAIL_KEY);
  const email = stored ?? window.prompt("Potvrď e-mail, na který přišel odkaz:") ?? "";
  await signInWithEmailLink(auth, email, window.location.href);
  window.localStorage.removeItem(EMAIL_KEY);
  // Jednorazovy kod nema co pohledavat v historii prohlizece.
  window.history.replaceState(null, "", "/");
  return true;
}
