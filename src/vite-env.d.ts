/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TTS_ENDPOINT?: string
  readonly VITE_DUEL2_TEST?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.yaml' {
  const content: unknown
  export default content
}

declare module '*.yml' {
  const content: unknown
  export default content
}
