"use client";

import { useEffect, useState } from "react";

/**
 * False on the server and until React has attached in the browser.
 * Used to keep submit buttons disabled until the form's JavaScript can
 * handle them, so an early tap never falls back to a plain HTML submit.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
