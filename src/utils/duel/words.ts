import type { PictureWord, SoundGroup } from '../../types/duel'

/**
 * Picture words: a Hebrew word that STARTS with the sound, drawn in the game's style (sprites/word-<key>.webp).
 * Several per sound so he learns the sound, not one picture. Retired for ambiguity: ear (= "listen" icon,
 * hints at mute/shva), finger (tap / one / shh), blueberries (dot cluster). See the spec's legibility rules.
 * Retired after his review, because he names them with a different first sound: goat (sheep), car (מכונית),
 * ship (סירה), mom (a woman), hamster (a mouse). A picture word must have one obvious name, and its first vowel
 * must be pronounced as written (no first-letter shva — e.g. תְּמָנוּן is written with shva but said "ta").
 * From the Alef-Bet song (kept after his review): the sound is the vowel of the first syllable (בַּ in בַּיִת).
 */
export const PICTURE_WORDS: PictureWord[] = [
  { key: 'a', group: 'a', he: 'אַרְיֵה' },
  { key: 'pineapple', group: 'a', he: 'אַנָּנָס' },
  { key: 'mouse', group: 'a', he: 'עַכְבָּר' },
  { key: 'watermelon', group: 'a', he: 'אֲבַטִּיחַ' },
  { key: 'house', group: 'a', he: 'בַּיִת' },
  { key: 'camel', group: 'a', he: 'גָּמָל' },
  { key: 'eye', group: 'a', he: 'עַיִן' },
  { key: 'butterfly', group: 'a', he: 'פַּרְפַּר' },
  { key: 'e', group: 'e', he: 'אֶפְרוֹחַ' },
  { key: 'tree', group: 'e', he: 'עֵץ' },
  { key: 'fire', group: 'e', he: 'אֵשׁ' },
  { key: 'door', group: 'e', he: 'דֶּלֶת' },
  { key: 'rose', group: 'e', he: 'וֶרֶד' },
  { key: 'book', group: 'e', he: 'סֵפֶר' },
  { key: 'i', group: 'i', he: 'עִפָּרוֹן' },
  { key: 'igloo', group: 'i', he: 'אִיגְלוּ' },
  { key: 'island', group: 'i', he: 'אִי' },
  { key: 'bicycle', group: 'o', he: 'אוֹפַנַּיִם' },
  { key: 'tent', group: 'o', he: 'אֹהֶל' },
  { key: 'bus', group: 'o', he: 'אוֹטוֹבּוּס' },
  { key: 'monkey', group: 'o', he: 'קוֹף' },
  { key: 'u', group: 'u', he: 'עוּגָה' },
  { key: 'cookie', group: 'u', he: 'עוּגִיָּה' },
  { key: 'silent', group: 'silent', he: '' },
]

export const wordsFor = (g: SoundGroup) => PICTURE_WORDS.filter((w) => w.group === g)
