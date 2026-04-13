"use client";

import { useState } from "react";

export function useAudio() {
  const [enabled, setEnabled] = useState(true);

  return {
    enabled,
    setEnabled,
  };
}
