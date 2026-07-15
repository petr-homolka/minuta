// Mapa: realtime hooky chatu (08 §1) - listener zprav JEN v otevrenem
// Space; seznam Spaces pres collection-group "moje clenstvi" (35 §5).
import {
  collection,
  collectionGroup,
  onSnapshot,
  orderBy,
  query,
  where,
  Timestamp,
  type Firestore,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import type { EnvelopeV1 } from "../../lib/crypto/envelope";

export interface SpaceRef {
  spaceId: string;
  role: string;
}

export function useMySpaces(db: Firestore, uid: string): SpaceRef[] {
  const [spaces, setSpaces] = useState<SpaceRef[]>([]);
  useEffect(() => {
    const q = query(collectionGroup(db, "members"), where("uid", "==", uid));
    return onSnapshot(q, (snapshot) => {
      setSpaces(
        snapshot.docs.map((d) => ({
          spaceId: d.ref.parent.parent?.id ?? "",
          role: (d.get("role") as string) ?? "member",
        })),
      );
    });
  }, [db, uid]);
  return spaces;
}

export interface MessageMeta {
  msgId: string;
  senderUid: string;
  senderDeviceId: string;
  envelope: EnvelopeV1;
  createdAt: Timestamp | null;
  readAt: Timestamp | null;
}

export function useMessages(db: Firestore, spaceId: string): MessageMeta[] {
  const [messages, setMessages] = useState<MessageMeta[]>([]);
  useEffect(() => {
    const q = query(
      collection(db, "spaces", spaceId, "messages"),
      orderBy("createdAt", "asc"),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(
        snapshot.docs.map((d) => ({
          msgId: d.id,
          senderUid: d.get("senderUid") as string,
          senderDeviceId: d.get("senderDeviceId") as string,
          envelope: d.get("envelope") as EnvelopeV1,
          createdAt: d.get("createdAt") as Timestamp | null,
          readAt: d.get("readAt") as Timestamp | null,
        })),
      );
    });
    return () => {
      unsubscribe();
      setMessages([]); // odchod z obrazovky = odpojeni + uklid (08 §1)
    };
  }, [db, spaceId]);
  return messages;
}
