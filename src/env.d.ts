/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_SOURCE?: "indexeddb" | "http" | "unicloud";
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_USER_ID?: string;
  readonly VITE_UNI_ID_BASE_URL?: string;
  readonly VITE_DCLOUD_APP_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}
