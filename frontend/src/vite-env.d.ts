/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the CareRoute API, including the /api/v1 path. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
