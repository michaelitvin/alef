// Whether the English doors can be played at a stage with the pictures that exist now (the course's filter,
// `enDoorsPlayable` over `wordPicture`). The home passes it to `englishOpenStations`, so that it never shows a doors
// station that a run does not play (stage 1's pictures, map and fan, have no file yet).
import { enDoorsPlayable } from './logic/rounds/doors'
import { wordPicture } from './assets/images'

export const englishDoorsPlayable = (stage: number): boolean => enDoorsPlayable(stage, { picture: wordPicture })
