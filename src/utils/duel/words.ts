import type { PictureWord, SoundGroup } from '../../types/duel'

/**
 * Picture words: a Hebrew word that STARTS with the sound, drawn in the game's style (sprites/word-<key>.webp).
 * Several per sound so he learns the sound, not one picture. Retired for ambiguity: ear (= "listen" icon,
 * hints at mute/shva), finger (tap / one / shh), blueberries (dot cluster). See the spec's legibility rules.
 */
export const PICTURE_WORDS: PictureWord[] = [
  { key: 'a', group: 'a', he: 'אַרְיֵה' },
  { key: 'pineapple', group: 'a', he: 'אַנָּנָס' },
  { key: 'mouse', group: 'a', he: 'עַכְבָּר' },
  { key: 'watermelon', group: 'a', he: 'אַבַּטִּיחַ' },
  { key: 'e', group: 'e', he: 'אֶפְרוֹחַ' },
  { key: 'tree', group: 'e', he: 'עֵץ' },
  { key: 'goat', group: 'e', he: 'עֵז' },
  { key: 'i', group: 'i', he: 'עִפָּרוֹן' },
  { key: 'igloo', group: 'i', he: 'אִיגְלוּ' },
  { key: 'island', group: 'i', he: 'אִי' },
  { key: 'mom', group: 'i', he: 'אִמָּא' },
  { key: 'o', group: 'o', he: 'אוֹטוֹ' },
  { key: 'bicycle', group: 'o', he: 'אוֹפַנַּיִם' },
  { key: 'ship', group: 'o', he: 'אוֹנִיָּה' },
  { key: 'hamster', group: 'o', he: 'אוֹגֵר' },
  { key: 'u', group: 'u', he: 'עוּגָה' },
  { key: 'cookie', group: 'u', he: 'עוּגִיָּה' },
  { key: 'silent', group: 'silent', he: '' },
]

export const wordsFor = (g: SoundGroup) => PICTURE_WORDS.filter((w) => w.group === g)
