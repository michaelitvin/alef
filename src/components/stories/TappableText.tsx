import { Fragment } from 'react'
import { motion } from 'framer-motion'
import { typography } from '../../styles/theme'
import { useSpeech } from './SpeechProvider'

export interface TappableTextProps {
  /** Text to render; split into tappable words on whitespace */
  text: string
  /** Unique per text block on screen; word keys are `${blockId}:${index}` */
  blockId: string
  fontSize?: string
  fontWeight?: number | string
  color?: string
}

/**
 * Renders Hebrew text as individually tappable words.
 * First tap on a word speaks it; second tap speaks its decode
 * (via the screen-wide tap cycle in SpeechProvider).
 */
export function TappableText({
  text,
  blockId,
  fontSize,
  fontWeight,
  color,
}: TappableTextProps) {
  const { tapWord, speakingKey } = useSpeech()
  const words = text.split(/\s+/).filter(Boolean)

  return (
    <span
      style={{
        direction: 'rtl',
        unicodeBidi: 'plaintext',
        fontFamily: typography.fontFamily.hebrew,
        fontSize,
        fontWeight,
        color,
      }}
    >
      {words.map((word, index) => {
        const wordKey = `${blockId}:${index}`
        const isActive = speakingKey === wordKey
        return (
          <Fragment key={wordKey}>
            <motion.span
              onClick={(event) => {
                event.stopPropagation()
                tapWord(wordKey, word)
              }}
              animate={isActive ? { scale: [1, 1.12, 1] } : { scale: 1 }}
              transition={{ duration: 0.35 }}
              style={{
                cursor: 'pointer',
                display: 'inline-block',
                borderRadius: '8px',
                padding: '0 3px',
                backgroundColor: isActive
                  ? 'rgba(255, 213, 79, 0.65)'
                  : 'transparent',
                transition: 'background-color 0.2s',
              }}
            >
              {word}
            </motion.span>{' '}
          </Fragment>
        )
      })}
    </span>
  )
}

export default TappableText
