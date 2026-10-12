"use client";
import { useRef, useState } from "react";

/** Lock synchronously, before React renders disabled controls. */
export function usePendingAction() {
  const locked = useRef(false);
  const [active, setActive] = useState<string | null>(null);
  function begin(action = "submit") {
    if (locked.current) return false;
    locked.current = true;
    setActive(action);
    return true;
  }
  function finish() {
    locked.current = false;
    setActive(null);
  }
  return { pending: active !== null, active, begin, finish };
}
