// Mapa: React stav prihlaseni (onAuthStateChanged) + akce - anonymni
// ucet pro prijemce pozvanky (07, N4) a odhlaseni.
import {
  onAuthStateChanged,
  signInAnonymously,
  signOut,
  type User,
} from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "../../lib/firebase";

export interface AuthState {
  user: User | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setState({ user, loading: false });
    });
  }, []);

  return state;
}

export async function signInAnonymous(): Promise<void> {
  await signInAnonymously(auth);
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}
