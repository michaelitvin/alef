// The placement rounds of asset plan 1.16: three picture rounds and three name rounds per stage (stage 1: two picture
// rounds and four name rounds, the pan picture was dropped). The target comes first. A wrong choice that is not in the
// word lists (marked ° in the plan) is a PlacementText: it is shown and never voiced, the placement has no hint.
// Erasable TypeScript.

export interface PlacementText {
  text: string
  /** sound unit ids in reading order */
  units: string[]
  noVoice: true
}

const t = (text: string, units: string): PlacementText => ({ text, units: units.split(' '), noVoice: true })

/**
 * `stageUnit`: what the round tests, the unit (or the stage-5 blend skill) of its stage where its words differ; a miss
 * counts against it only (design Part 4, credit per sound unit)
 */
export const PLACEMENT_ROUNDS: { stage: number; kind: 'picture' | 'name'; target: string; stageUnit: string; others: (string | PlacementText)[] }[] = [
  { stage: 1, kind: 'picture', target: 'map', stageUnit: 'p', others: ['mat', 'man'] },
  { stage: 1, kind: 'picture', target: 'fan', stageUnit: 'a', others: ['fin', 'tan'] },
  { stage: 1, kind: 'name', target: 'mip', stageUnit: 'i', others: ['map', 'nip'] },
  { stage: 1, kind: 'name', target: 'tif', stageUnit: 'i', others: ['taf', 'tip'] },
  { stage: 1, kind: 'name', target: 'nif', stageUnit: 'i', others: ['naf', 'mif'] },
  { stage: 1, kind: 'name', target: 'pim', stageUnit: 'i', others: [t('pam', 'p a m'), t('tim', 't i m')] },

  { stage: 2, kind: 'picture', target: 'dog', stageUnit: 'o', others: ['dig', 'dot'] },
  { stage: 2, kind: 'picture', target: 'cup', stageUnit: 'u', others: ['cap', t('cop', 'c o p')] },
  { stage: 2, kind: 'picture', target: 'bed', stageUnit: 'e', others: ['bad', t('bid', 'b i d')] },
  { stage: 2, kind: 'name', target: 'gub', stageUnit: 'u', others: [t('gab', 'g a b'), t('dub', 'd u b')] },
  { stage: 2, kind: 'name', target: 'bem', stageUnit: 'e', others: [t('bim', 'b i m'), t('dem', 'd e m')] },
  { stage: 2, kind: 'name', target: 'pob', stageUnit: 'o', others: [t('pab', 'p a b'), t('pib', 'p i b')] },

  { stage: 3, kind: 'picture', target: 'hat', stageUnit: 'h', others: [t('rat', 'r a t'), t('vat', 'v a t')] },
  { stage: 3, kind: 'picture', target: 'log', stageUnit: 'l', others: [t('hog', 'h o g'), t('jog', 'j o g')] },
  { stage: 3, kind: 'picture', target: 'fox', stageUnit: 'x', others: [t('foz', 'f o z'), t('fov', 'f o v')] },
  { stage: 3, kind: 'name', target: 'vap', stageUnit: 'v', others: ['zap', 'lap'] },
  { stage: 3, kind: 'name', target: 'zim', stageUnit: 'z', others: [t('vim', 'v i m'), t('rim', 'r i m')] },
  { stage: 3, kind: 'name', target: 'jex', stageUnit: 'j', others: [t('yex', 'y e x'), t('hex', 'h e x')] },

  { stage: 4, kind: 'picture', target: 'duck', stageUnit: 'ck', others: [t('dull', 'd u ll'), t('duff', 'd u ff')] },
  { stage: 4, kind: 'picture', target: 'ring', stageUnit: 'ng', others: [t('rink', 'r i nk'), t('rich', 'r i ch')] },
  { stage: 4, kind: 'picture', target: 'fish', stageUnit: 'sh', others: ['fill', t('fizz', 'f i zz')] },
  { stage: 4, kind: 'name', target: 'chim', stageUnit: 'ch', others: [t('shim', 'sh i m'), t('thim', 'th i m')] },
  { stage: 4, kind: 'name', target: 'shap', stageUnit: 'sh', others: [t('chap', 'ch a p'), t('thap', 'th a p')] },
  { stage: 4, kind: 'name', target: 'thog', stageUnit: 'th', others: [t('shog', 'sh o g'), t('chog', 'ch o g')] },

  { stage: 5, kind: 'picture', target: 'frog', stageUnit: 'fr-', others: [t('fog', 'f o g'), t('grog', 'g r o g')] },
  { stage: 5, kind: 'picture', target: 'drum', stageUnit: 'dr-', others: [t('dum', 'd u m'), t('trum', 't r u m')] },
  { stage: 5, kind: 'picture', target: 'tent', stageUnit: '-nt', others: ['ten', t('test', 't e s t')] },
  { stage: 5, kind: 'name', target: 'sluk', stageUnit: 'sl-', others: [t('suk', 's u k'), t('snuk', 's n u k')] },
  { stage: 5, kind: 'name', target: 'clim', stageUnit: 'cl-', others: [t('cim', 'c i m'), t('flim', 'f l i m')] },
  { stage: 5, kind: 'name', target: 'snet', stageUnit: 'sn-', others: [t('set', 's e t'), t('spet', 's p e t')] },

  { stage: 6, kind: 'picture', target: 'snake', stageUnit: 'a_e', others: [t('snak', 's n a k'), t('snoke', 's n o_e k')] },
  { stage: 6, kind: 'picture', target: 'kite', stageUnit: 'i_e', others: ['kit', t('kote', 'k o_e t')] },
  { stage: 6, kind: 'picture', target: 'bone', stageUnit: 'o_e', others: [t('bun', 'b u n'), t('bane', 'b a_e n')] },
  { stage: 6, kind: 'name', target: 'pove', stageUnit: 'o_e', others: [t('pov', 'p o v'), t('pave', 'p a_e v')] },
  { stage: 6, kind: 'name', target: 'dape', stageUnit: 'a_e', others: [t('dap', 'd a p'), t('dipe', 'd i_e p')] },
  { stage: 6, kind: 'name', target: 'fime', stageUnit: 'i_e', others: ['fim', t('fame', 'f a_e m')] },

  { stage: 7, kind: 'picture', target: 'cats', stageUnit: '-s', others: ['cat', t('cating', 'c a t -ing')] },
  { stage: 7, kind: 'picture', target: 'boxes', stageUnit: '-es', others: ['box', t('boxed', 'b o x -ed')] },
  { stage: 7, kind: 'picture', target: 'ducks', stageUnit: '-s', others: ['duck', t('ducked', 'd u ck -ed')] },
  { stage: 7, kind: 'name', target: 'gromping', stageUnit: '-ing', others: ['gromped', 'gromps'] },
  { stage: 7, kind: 'name', target: 'jishes', stageUnit: '-es', others: ['jish', t('jishing', 'j i sh -ing')] },
  { stage: 7, kind: 'name', target: 'nolked', stageUnit: '-ed', others: ['nolking', t('nolks', 'n o l k -s')] },

  { stage: 8, kind: 'picture', target: 'car', stageUnit: 'ar', others: [t('cur', 'c ur'), t('cor', 'c or')] },
  { stage: 8, kind: 'picture', target: 'bird', stageUnit: 'ir', others: [t('bard', 'b ar d'), t('bid', 'b i d')] },
  { stage: 8, kind: 'picture', target: 'fork', stageUnit: 'or', others: [t('fark', 'f ar k'), t('ferk', 'f er k')] },
  { stage: 8, kind: 'name', target: 'zarn', stageUnit: 'ar', others: [t('zan', 'z a n'), t('zorn', 'z or n')] },
  { stage: 8, kind: 'name', target: 'murt', stageUnit: 'ur', others: [t('mut', 'm u t'), t('mart', 'm ar t')] },
  { stage: 8, kind: 'name', target: 'virp', stageUnit: 'ir', others: [t('vip', 'v i p'), t('varp', 'v ar p')] },

  { stage: 9, kind: 'picture', target: 'boat', stageUnit: 'oa', others: [t('bait', 'b ai t'), t('bet', 'b e t')] },
  { stage: 9, kind: 'picture', target: 'sheep', stageUnit: 'ee', others: ['ship', t('shape', 'sh a_e p')] },
  { stage: 9, kind: 'picture', target: 'moon', stageUnit: 'oo', others: ['man', t('moan', 'm oa n')] },
  { stage: 9, kind: 'name', target: 'voam', stageUnit: 'oa', others: [t('vam', 'v a m'), t('veam', 'v ea m')] },
  { stage: 9, kind: 'name', target: 'baip', stageUnit: 'ai', others: [t('bap', 'b a p'), t('beep', 'b ee p')] },
  { stage: 9, kind: 'name', target: 'sloy', stageUnit: 'oy', others: [t('slay', 's l ay'), t('slee', 's l ee')] },
]
