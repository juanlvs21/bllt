interface ImportMetaEnv {
  /** BUSINESS_NAME set at build time (see vite.config.ts); empty when unset. */
  readonly VITE_BUSINESS_NAME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
