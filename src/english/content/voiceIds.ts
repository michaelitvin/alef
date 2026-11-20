// The ids of the English voice files. The asset track names its files by these ids.
import type { Unit } from './units.ts'

export const soundVoice = (u: Unit): string => 'snd-' + u.sound
export const letterName = (l: string): string => 'ln-' + l
export const wordVoice = (w: string): string => 'w-' + w
export const heartVoice = (w: string): string => 'hw-' + w
export const nonsenseVoice = (w: string): string => 'nw-' + w
export const phraseVoice = (id: string): string => 'ph-' + id
