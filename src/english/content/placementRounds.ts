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

export const PLACEMENT_ROUNDS: { stage: number; kind: 'picture' | 'name'; target: string; others: (string | PlacementText)[] }[] = [
  { stage: 1, kind: 'picture', target: 'map', others: ['mat', 'man'] },
  { stage: 1, kind: 'picture', target: 'fan', others: ['fin', 'tan'] },
  { stage: 1, kind: 'name', target: 'mip', others: ['map', 'nip'] },
  { stage: 1, kind: 'name', target: 'tif', others: ['taf', 'tip'] },
  { stage: 1, kind: 'name', target: 'nif', others: ['naf', 'mif'] },
  { stage: 1, kind: 'name', target: 'pim', others: [t('pam', 'p a m'), t('tim', 't i m')] },

  { stage: 2, kind: 'picture', target: 'dog', others: ['dig', 'dot'] },
  { stage: 2, kind: 'picture', target: 'cup', others: ['cap', t('cop', 'c o p')] },
  { stage: 2, kind: 'picture', target: 'bed', others: ['bad', t('bid', 'b i d')] },
  { stage: 2, kind: 'name', target: 'gub', others: [t('gab', 'g a b'), t('dub', 'd u b')] },
  { stage: 2, kind: 'name', target: 'bem', others: [t('bim', 'b i m'), t('dem', 'd e m')] },
  { stage: 2, kind: 'name', target: 'dop', others: [t('dap', 'd a p'), t('bop', 'b o p')] },

  { stage: 3, kind: 'picture', target: 'hat', others: [t('rat', 'r a t'), t('vat', 'v a t')] },
  { stage: 3, kind: 'picture', target: 'log', others: [t('hog', 'h o g'), t('jog', 'j o g')] },
  { stage: 3, kind: 'picture', target: 'fox', others: [t('foz', 'f o z'), t('fov', 'f o v')] },
  { stage: 3, kind: 'name', target: 'vap', others: ['zap', 'lap'] },
  { stage: 3, kind: 'name', target: 'zim', others: [t('vim', 'v i m'), t('rim', 'r i m')] },
  { stage: 3, kind: 'name', target: 'jex', others: [t('yex', 'y e x'), t('hex', 'h e x')] },

  { stage: 4, kind: 'picture', target: 'duck', others: [t('dull', 'd u ll'), t('duff', 'd u ff')] },
  { stage: 4, kind: 'picture', target: 'ring', others: [t('rink', 'r i nk'), t('rich', 'r i ch')] },
  { stage: 4, kind: 'picture', target: 'fish', others: ['fill', t('fizz', 'f i zz')] },
  { stage: 4, kind: 'name', target: 'chim', others: [t('shim', 'sh i m'), t('thim', 'th i m')] },
  { stage: 4, kind: 'name', target: 'shap', others: [t('chap', 'ch a p'), t('thap', 'th a p')] },
  { stage: 4, kind: 'name', target: 'thog', others: [t('shog', 'sh o g'), t('chog', 'ch o g')] },

  { stage: 5, kind: 'picture', target: 'frog', others: [t('fog', 'f o g'), t('grog', 'g r o g')] },
  { stage: 5, kind: 'picture', target: 'drum', others: [t('dum', 'd u m'), t('trum', 't r u m')] },
  { stage: 5, kind: 'picture', target: 'tent', others: ['ten', t('test', 't e s t')] },
  { stage: 5, kind: 'name', target: 'sluk', others: [t('suk', 's u k'), t('snuk', 's n u k')] },
  { stage: 5, kind: 'name', target: 'clim', others: [t('cim', 'c i m'), t('flim', 'f l i m')] },
  { stage: 5, kind: 'name', target: 'snet', others: [t('set', 's e t'), t('spet', 's p e t')] },

  { stage: 6, kind: 'picture', target: 'snake', others: [t('snak', 's n a k'), t('snoke', 's n o_e k')] },
  { stage: 6, kind: 'picture', target: 'kite', others: ['kit', t('kote', 'k o_e t')] },
  { stage: 6, kind: 'picture', target: 'bone', others: [t('bun', 'b u n'), t('bane', 'b a_e n')] },
  { stage: 6, kind: 'name', target: 'pove', others: [t('pov', 'p o v'), t('pave', 'p a_e v')] },
  { stage: 6, kind: 'name', target: 'dape', others: [t('dap', 'd a p'), t('dipe', 'd i_e p')] },
  { stage: 6, kind: 'name', target: 'fime', others: ['fim', t('fame', 'f a_e m')] },

  { stage: 7, kind: 'picture', target: 'cats', others: ['cat', t('cates', 'c a t -es')] },
  { stage: 7, kind: 'picture', target: 'boxes', others: ['box', t('boxed', 'b o x -ed')] },
  { stage: 7, kind: 'picture', target: 'ducks', others: ['duck', t('ducked', 'd u ck -ed')] },
  { stage: 7, kind: 'name', target: 'gromping', others: ['gromped', 'gromps'] },
  { stage: 7, kind: 'name', target: 'jishes', others: ['jish', t('jishing', 'j i sh -ing')] },
  { stage: 7, kind: 'name', target: 'nolked', others: ['nolking', t('nolks', 'n o l k -s')] },

  { stage: 8, kind: 'picture', target: 'car', others: [t('cur', 'c ur'), t('cor', 'c or')] },
  { stage: 8, kind: 'picture', target: 'bird', others: [t('bard', 'b ar d'), t('bid', 'b i d')] },
  { stage: 8, kind: 'picture', target: 'fork', others: [t('fark', 'f ar k'), t('ferk', 'f er k')] },
  { stage: 8, kind: 'name', target: 'zarn', others: [t('zan', 'z a n'), t('zorn', 'z or n')] },
  { stage: 8, kind: 'name', target: 'murt', others: [t('mut', 'm u t'), t('mart', 'm ar t')] },
  { stage: 8, kind: 'name', target: 'virp', others: [t('vip', 'v i p'), t('varp', 'v ar p')] },

  { stage: 9, kind: 'picture', target: 'boat', others: [t('bait', 'b ai t'), t('bet', 'b e t')] },
  { stage: 9, kind: 'picture', target: 'sheep', others: ['ship', t('shape', 'sh a_e p')] },
  { stage: 9, kind: 'picture', target: 'moon', others: ['man', t('moan', 'm oa n')] },
  { stage: 9, kind: 'name', target: 'voam', others: [t('vam', 'v a m'), t('veam', 'v ea m')] },
  { stage: 9, kind: 'name', target: 'baip', others: [t('bap', 'b a p'), t('beep', 'b ee p')] },
  { stage: 9, kind: 'name', target: 'sloy', others: [t('slay', 's l ay'), t('slee', 's l ee')] },
]
