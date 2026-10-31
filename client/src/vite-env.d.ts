/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** What logged-out visitors get: "spotify" (default, auto-login), "demo" or "login". */
  readonly VITE_LOGGED_OUT?: string;
}
