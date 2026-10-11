import localFont from "next/font/local";

/**
 * Plus Jakarta Sans (SIL Open Font License, see fonts/OFL-LICENSE.txt),
 * served from this app and preloaded. The file lives in the repo rather than
 * node_modules so paths resolve the same on every OS.
 */
export const jakarta = localFont({
  src: [{ path: "./fonts/plus-jakarta-sans-latin-wght-normal.woff2", weight: "200 800", style: "normal" }],
  variable: "--font-jakarta",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});
