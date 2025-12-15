/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TTS_ENDPOINT?: string
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
