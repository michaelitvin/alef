import { Fragment } from 'react'
import { motion } from 'framer-motion'
import { colors, typography } from '../../styles/theme'
import { useSpeech } from './SpeechProvider'

const HIGHLIGHT_SPEAKING = 'rgba(255, 213, 79, 0.65)'
/** Softer shade left on the last-tapped word, inviting the decode tap */
const HIGHLIGHT_INVITE = 'rgba(255, 213, 79, 0.35)'

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
 * Dash running along the word's border while TTS is warming up.
 * Fades in after a beat so fast speech never flashes a loader.
 */
function WordLoader() {
  return (
    <motion.svg
      data-testid="word-loader"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.15, duration: 0.2 }}
      style={{
        position: 'absolute',
        inset: '-2px',
        width: 'calc(100% + 4px)',
        height: 'calc(100% + 4px)',
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      <motion.rect
        x="1.5"
        y="1.5"
        width="calc(100% - 3px)"
        height="calc(100% - 3px)"
        rx="9"
        fill="none"
        stroke={colors.secondary[500]}
        strokeWidth="3"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray="0.25 0.75"
        animate={{ strokeDashoffset: [0, -1] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
      />
    </motion.svg>
  )
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
  const { tapWord, speakingKey, pendingKey, lastTappedKey } = useSpeech()
  const words = text.split(/\s+/).filter(Boolean)

  return (
    <span
      style={{
        direction: 'rtl',
        unicodeBidi: 'isolate',
        fontFamily: typography.fontFamily.hebrew,
        fontSize,
        fontWeight,
        color,
      }}
    >
      {words.map((word, index) => {
        const wordKey = `${blockId}:${index}`
        const isActive = speakingKey === wordKey
        const isPending = pendingKey === wordKey
        const isInvited = lastTappedKey === wordKey
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
                position: 'relative',
                display: 'inline-block',
                borderRadius: '8px',
                padding: '0 3px',
                backgroundColor: isActive
                  ? HIGHLIGHT_SPEAKING
                  : isInvited
                    ? HIGHLIGHT_INVITE
                    : 'transparent',
                transition: 'background-color 0.2s',
              }}
            >
              {word}
              {isPending && <WordLoader />}
            </motion.span>{' '}
          </Fragment>
        )
      })}
    </span>
  )
}

export default TappableText
