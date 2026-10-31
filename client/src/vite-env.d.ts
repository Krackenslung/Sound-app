/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" shows the login page to logged-out visitors; otherwise they get demo mode. */
  readonly VITE_SHOW_LOGIN?: string;
}
