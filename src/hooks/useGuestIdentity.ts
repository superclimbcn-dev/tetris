"use client";

import { useEffect, useState } from "react";

const GUEST_ID_STORAGE_KEY = "tetris-nexus-guest-id";

function createGuestId(): string {
  if ("randomUUID" in crypto) {
    return `guest-${crypto.randomUUID()}`;
  }

  return `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useGuestIdentity() {
  const [guestId, setGuestId] = useState<string>("guest-pending");

  useEffect(() => {
    const existingGuestId = window.localStorage.getItem(GUEST_ID_STORAGE_KEY);

    if (existingGuestId !== null && existingGuestId.length > 0) {
      setGuestId(existingGuestId);
      return;
    }

    const nextGuestId = createGuestId();
    window.localStorage.setItem(GUEST_ID_STORAGE_KEY, nextGuestId);
    setGuestId(nextGuestId);
  }, []);

  return {
    guestId,
  };
}
