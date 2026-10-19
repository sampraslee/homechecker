/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Gemini API key, injected at build time and never committed (ADR 0005). */
  readonly VITE_GEMINI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
