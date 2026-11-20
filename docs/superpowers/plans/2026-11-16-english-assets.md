# The English path — Asset plan (pictures, sprites, sounds)

**Date:** 2026-11-16
**Status:** Updated 2026-11-17. Pictures and recolours are made and reviewed (Part 2); the voice is chosen (Gemini TTS,
Puck) after three voice tests; no bulk audio until the parent says so (Part 4). Generated files are host-local until a
stage's assets are approved.
**Source of truth:** [the English path design](../specs/2026-11-16-english-path-design.md) (Parts 2, 3, 4, 5, 7, 8,
10). Rules: [docs/minigame-rules.md](../../minigame-rules.md) (Voice, Pronunciation, Visuals, Art generation, Review of
generated assets). Provenance format: [asset-sources/duel2/README.md](../../../asset-sources/duel2/README.md); this
path records into `asset-sources/english/` (`images.json`, `audio.json`) in the same format.
**Model-agnostic:** the image model and the generation strategy are decided elsewhere. This plan counts images and
takes; cost is a function of the price per image (`P_img`) and per 1,000 voice characters (`P_kc`).

In this plan, **"my call"** marks a decision made here that the parent has not confirmed (all are listed in Part 6).

---

## Part 1 — Word lists

### 1.1 How to read the tables

- **Units** are the sound units of design Part 3, separated by `·`. Silent e is one unit written across the word
  (`c·a_e·k` = cake). In stage 5, each consonant of a blend is its own unit; the blend pattern is in brackets
  (`s·t·o·p [st-]`).
- **A word belongs to the stage of its highest unit.** It uses no unit above that stage. A builder script checks this for
  every word, chain, set and round in this file, and that every word on a screen is in a list (so it has audio).
- **Default uses.** Every real word (not a heart word) can appear in: the broom (word rounds), the cauldron, the tower's
  word runes, the spell book (at most 5 boxes), the drawing (whole word, from stage 2, only letters he has written alone),
  and the doors' wrong-key pool if it has a picture. The **Uses** column lists only the specific uses:

  | Code | Use |
  |---|---|
  | `Tl` (unit) | tower letter round: the picture's first sound (or last sound, for `x ck ff ll ss zz ng nk`) is that unit |
  | `Tw` | tower picture round with word runes (stages 6–9) |
  | `D` | door: the word on the door, its key has the picture |
  | `Dp` | door phrase (stage 4 on), see 1.15 |
  | `P★` / `Pd` | placement picture round: the target / a wrong choice (1.16) |
  | `L1`…`L4` | ladder chain (1.14) |
  | `G` | ghosts look-alike word set (1.13) |
  | `C6` | stage-6 cauldron pair (the e is thrown in) |
  | `S·pic` | spell book with its picture (stages 1–3; my call: no picture from stage 4, as the design says "later stages") |

- **Picture:** `R word-x` / `R pw-x` = reuse that existing file (checked in Part 2.1); `T` = a cheaper-model test take
  already exists (the parent: "look perfectly fine"); `N` = new; `—` = no picture.
- **Pictures that are not decodable words.** First-sound pictures need not be decodable: the child never reads them, he
  only picks their first (or last) sound's letter. They are listed per stage under "picture-only words". Each needs a
  word recording (the feedback "fff. fox.") but no slow word.

### 1.2 Totals

Updated 2026-11-17 after the parent's picture review and the word pass for a child in Israel (1.18).

| Stage | Real words | Picture-only words | Heart words | Nonsense words | Pictures used (R / T / N) |
|---|---|---|---|---|---|
| 1 | 24 | 13 | 3 | 12 | 7 / 1 / 7 |
| 2 | 28 | 11 | 4 | 12 | 9 / 4 / 9 |
| 3 | 29 | 13 | 4 | 12 | 6 / 0 / 12 |
| 4 | 34 | 1 | 5 | 12 | 2 / 0 / 9 |
| 5 | 40 | 0 | 4 | 12 | 1 / 1 / 9 |
| 6 | 34 | 0 | 4 | 12 | 2 / 0 / 8 |
| 7 | 30 | 0 | 3 | 6 | 0 / 0 / 5 |
| 8 | 33 | 0 | 3 | 12 | 0 / 0 / 10 |
| 9 | 61 | 0 | 3 | 12 | 2 / 0 / 22 |
| **All** | **313** | **38** | **33** | **102** | **29 / 6 / 91 = 126** |

The design asked for about 250 real words. This list has 313, because 70 tracked items (62 units and 8 second readings, Part 3.1) need 3 or more words
each, and the ladder chains, look-alike sets and placement rounds need their own words. Stage 9 alone has 15 items. The
parent decided to keep them all for now (2026-11-17).

**Coverage after the review** (16 pictures dropped, 2.3): first-sound pictures are now `o` ostrich only, `y` yo-yo
only, `g` guitar only, `nk` sink only, `th` none (with `i` igloo, `u` umbrella, `qu` queen as before). These units are asked
by sound and in word rounds. Stage 1 has two picture keys left (map, fan): its doors also use stage-2 pictures as wrong
keys, and its placement asks two picture rounds and four name rounds. The stage-6 cauldron keeps kit → kite and slid →
slide with pictures; cap → cape is a word-only round.

### 1.3 Heart words (33)

Taught as whole words, in rounds without pictures (broom and ghosts: he hears the word and picks it among heart words or
decodable words), and inside door phrases from stage 4. Never a picture key, never in placement, nonsense, ladder chains
or the spell book; never alone on a door.

| Stage | Heart words | Why at this stage |
|---|---|---|
| 1 | the, a, is | the first words he meets |
| 2 | to, do, of, no | `no` is the pair of `on` in the ghosts (my call: open syllables are not taught, so `no` is a heart word) |
| 3 | was, you, he, we | |
| 4 | I, she, they, what, have | `I` is the first capital: capitals come only after stage 3 (design Part 3), and the phrase `I am fishing` is stage 7; `I` is checked against `l` and `1` on the glyph sheet. The rest use sh, th, wh, which open here |
| 5 | said, there, where, come | |
| 6 | some, one, put, give | `give`, `come`, `some` look like silent-e words but are not: taught here, where the contrast matters |
| 7 | my, want, does | |
| 8 | were, your, four | `four` beside `for`: the same sound, two spellings |
| 9 | who, could, would | |

### 1.4 Stage 1 — `a m s t p f i n`

| Word | Units | Uses | Picture |
|---|---|---|---|
| am | a·m | | — |
| an | a·n | | — |
| at | a·t | | — |
| in | i·n | | — |
| it | i·t | | — |
| sat | s·a·t | L1 | — |
| mat | m·a·t | Pd (map) | — |
| pat | p·a·t | Pd (pan) | — |
| tap | t·a·p | L2, L3 | — |
| map | m·a·p | Tl m, D, S·pic, P★, L2 | N |
| nap | n·a·p | L3 | — |
| man | m·a·n | L2, Pd (map) | — |
| pan | p·a·n | L4 | — (picture dropped after review: "skillet?") |
| fan | f·a·n | Tl f, D, S·pic, P★, L2, L4 | N |
| tan | t·a·n | L4, Pd (fan) | — |
| pin | p·i·n | L1, L4, Pd (pan) | — |
| tin | t·i·n | L4 | — |
| fin | f·i·n | L1, L2, Pd (fan) | — |
| sit | s·i·t | L1, L3 | — |
| pit | p·i·t | G (tip·pit, from stage 2) | — |
| fit | f·i·t | L1 | — |
| tip | t·i·p | L3, G | — |
| sip | s·i·p | L3 | — |
| nip | n·i·p | Pd (mip), G (hip·nip) | — |

**Picture-only words (Tl):** apple (`a`, T), ant (`a`, N), astronaut (`a`, N), monkey (`m`, R word-monkey), mouse (`m`,
R word-mouse), strawberry (`s`, R pw-strawberry), tiger (`t`, N), turtle (`t`, N), pencil (`p`, R word-i), pineapple
(`p`, R word-pineapple), fire (`f`, R word-fire), igloo (`i`, R word-igloo), nose (`n`, N).
**Later-stage words that are stage-1 sound pictures:** sun (`s`, 2), sock (`s`, 4), tent (`t`, 5), pig (`p`, 2), fish
(`f`, 4), fox (`f`, 3), nest (`n`, 5), net (`n`, 2). Generate their pictures with stage 1.
**Coverage:** every unit has 3 or more pictures except `i` (igloo only; see 2.3).

**Nonsense (12):** tam, nif, pim, mip, tif, fim, mif, pif, sif, taf, fip, naf.

### 1.5 Stage 2 — `o d c u g b e`

| Word | Units | Uses | Picture |
|---|---|---|---|
| on | o·n | G (on·no) | — |
| up | u·p | | — |
| not | n·o·t | G (hot·not) | — |
| dog | d·o·g | Tl d, D, S·pic, P★, L1 | R pw-dog |
| dig | d·i·g | G (big·dig·pig), Pd (dog) | — |
| dot | d·o·t | L1, Pd (dog) | — |
| cup | c·u·p | Tl c, D, S·pic, P★ | N |
| cap | c·a·p | L4, Pd (cup), C6 (cap → cape, word only) | — (picture dropped after review: "hat") |
| cat | c·a·t | Tl c, D, S·pic | R pw-cat |
| bug | b·u·g | D, S·pic, L2 | N |
| bus | b·u·s | Tl b, D, S·pic | R word-bus |
| bad | b·a·d | L2, Pd (bed) | — |
| bag | b·a·g | D, S·pic, L2 | N |
| big | b·i·g | G (big·dig·pig), L3 | — |
| bed | b·e·d | Tl b, D, S·pic, P★, L2 | N |
| beg | b·e·g | L2 | — |
| pen | p·e·n | L3 | — |
| ten | t·e·n | G (ten·net) | — |
| net | n·e·t | Tl n, D, S·pic, G | N |
| gum | g·u·m | G (gum·mug) | — (picture dropped after review: "candy") |
| mug | m·u·g | G | — |
| tub | t·u·b | L4 of stage 6 (tub → tube) | — |
| sun | s·u·n | Tl s, D, S·pic | T |
| nut | n·u·t | G (hut·nut) | — |
| mop | m·o·p | L4 | — (picture dropped after review: "broom") |
| pot | p·o·t | D, S·pic, G (top·pot), L1, L2 | N |
| top | t·o·p | G, L4 | — |
| pig | p·i·g | Tl p, D, S·pic, G, L3 | T |

**Picture-only words (Tl):** ostrich (`o`, N), ~~otter~~ (dropped after review: "not intuitive"), door (`d`, R word-door; never on the doors screen),
camel (`c`, R word-camel), carrot (`c`, R pw-carrot), cookie (`c`, R word-cookie), umbrella (`u`, T), guitar (`g`, N),
banana (`b`, R pw-banana), butterfly (`b`, R word-butterfly), egg (`e`, T), elephant (`e`, N).
**Later-stage sound pictures:** duck (`d`, 4), drum (`d`, 5), book (`b`, 9).
**Coverage:** `u` has one picture (umbrella) and `o` two uncertain names (2.3); both also get sound rounds.

**Nonsense (12):** fod, pob, gub, cug, bem, gom, mub, bup, cuf, suf, pem, gid. (`dop`, `tob` (one letter from the heart words `do`, `to`), `dut`, `sut` (from `put`) and `tud` (sounds rude) were replaced. Design example `bod` is replaced: it is
slang for "body".)

### 1.6 Stage 3 — `k h r l w j y x qu v z`

| Word | Units | Uses | Picture |
|---|---|---|---|
| kid | k·i·d | | — |
| kit | k·i·t | C6 (kit → kite), L2 of stage 6 | — |
| hat | h·a·t | Tl h, D, S·pic, P★, L2 | N |
| hot | h·o·t | G (hot·not), L2 | — |
| hut | h·u·t | G (hut·nut) | — |
| hop | h·o·p | L2, C6 (hop → hope) | — |
| hip | h·i·p | G (hip·nip), L4 | — |
| red | r·e·d | Dp | — |
| rug | r·u·g |  | — (picture dropped after review: "not clear") |
| leg | l·e·g | | — |
| let | l·e·t | L3 | — |
| lip | l·i·p | L4 | — |
| lot | l·o·t | L3 | — |
| log | l·o·g | Tl l, D, S·pic, P★, L3 | N |
| lap | l·a·p | L4 | — |
| web | w·e·b | L3 | — (picture dropped after review: "net") |
| wet | w·e·t | L3 | — |
| wig | w·i·g | | — |
| jam | j·a·m | | — |
| jet | j·e·t | | — |
| yes | y·e·s | | — |
| fox | f·o·x | Tl x, D, S·pic, P★, L1 | R pw-fox |
| box | b·o·x | Tl x, D, S·pic | N |
| fix | f·i·x | L1 | — |
| ax | a·x | Tl x, D | N |
| quiz | qu·i·z | | — |
| van | v·a·n | L1 | — (picture dropped after review: "car") |
| zip | z·i·p | L4 | — |
| zap | z·a·p | L4 | — |

**Picture-only words (Tl):** horse (`h`, R pw-horse), house (`h`, R word-house), robot (`r`, N), rocket (`r`, N), lion
(`l`, R word-a), lemon (`l`, R pw-lemon), watermelon (`w`, R word-watermelon), worm (`w`, N), jellyfish (`j`, N), yo-yo
(`y`, N), volcano (`v`, N), zebra (`z`, N), zipper (`z`, N).
**Later-stage sound pictures:** kite (`k`, 6), king (`k`, 4), ring (`r`, 4), jar (`j`, 8), yarn (`y`, 8), queen (`qu`, 9).
**Coverage:** `qu` has one picture (queen); `x` is asked by its last sound (fox, box, ax). The web picture is a door key
only, not a `w` sound picture (he may call it "spider web").

**Nonsense (12):** vap, zim, jex, kep, lom, hux, zab, quab, yeb, rel, vum, lix.

### 1.7 Stage 4 — `ck ff ll ss zz sh ch th wh ng nk` (+ `th₂` = the voiced th, second reading)

| Word | Units | Uses | Picture |
|---|---|---|---|
| duck | d·u·ck | Tl ck, D, P★, L2, Dp | N |
| luck | l·u·ck | L2 | — |
| lock | l·o·ck | L2 | — |
| sock | s·o·ck | Tl s, Tl ck, D, L2, Dp | N |
| kick | k·i·ck | | — |
| pick | p·i·ck | L3 | — |
| chick | ch·i·ck | Tl ch, Tl ck, D | R word-e |
| off | o·ff | | — |
| puff | p·u·ff | | — |
| bell | b·e·ll | Tl ll, D, L4 | N |
| well | w·e·ll | L4 | — |
| will | w·i·ll | L4 | — |
| fill | f·i·ll | L4, Pd (fish) | — |
| doll | d·o·ll | Tl ll, D | N |
| kiss | k·i·ss | | — |
| buzz | b·u·zz | | — |
| ship | sh·i·p | B (ship·chip·shop), L1 | — (he may call a ship "boat") |
| shop | sh·o·p | B, L1 | — |
| chop | ch·o·p | L1 | — |
| chip | ch·i·p | B, L1 | — |
| shell | sh·e·ll | D | N |
| fish | f·i·sh | Tl f, D, P★, Dp | R pw-fish |
| wish | w·i·sh | L3 of stage 7 | — |
| thin | th·i·n | | — |
| bath | b·a·th | | — |
| this | th₂·i·s | | — |
| that | th₂·a·t | | — |
| when | wh·e·n | | — |
| whip | wh·i·p | | — |
| ring | r·i·ng | Tl r, Tl ng, D, P★ | N |
| sing | s·i·ng | L3 | — |
| king | k·i·ng | Tl k, Tl ng, D, L3 | N |
| sink | s·i·nk | Tl nk, D, L3 | N |
| pink | p·i·nk | L3 | — |

**Picture-only words (Tl):** cheese (`ch`, N).
**Later-stage sound pictures:** sheep, shark, shirt (`sh`), teeth (`th`, last sound), whale, wheel (`wh`), swing (`ng`),
skunk (`nk`), dress, grass (`ss`), clock (`ck`).
**Coverage:** `ff`, `zz` and `th₂` have no picture, `th` has one (teeth): they are asked by sound ("the wizard says a
sound") and in word runes. My call: `th` (/θ/, thin) is the main reading, `th₂` (/ð/, this) the second.

**Nonsense (12):** chim, shap, thog, fesh, chob, shom, thip, wheck, lenk, jish, zoss, vill.

### 1.8 Stage 5 — two consonants together

| Word | Units [pattern] | Uses | Picture |
|---|---|---|---|
| stop | s·t·o·p [st-] | G (stop·spot) | — |
| spot | s·p·o·t [sp-] | G, L2 | — |
| spit | s·p·i·t [sp-] | L2 | — |
| spin | s·p·i·n [sp-] | L2 | — |
| snap | s·n·a·p [sn-] | L1 | — |
| snack | s·n·a·ck [sn-] | L1 | — |
| slip | s·l·i·p [sl-] | L1 | — |
| slap | s·l·a·p [sl-] | L1 | — |
| slug | s·l·u·g [sl-] | | — (replaces sled: a sled is not familiar in Israel, the parent 2026-11-17) |
| slid | s·l·i·d [sl-] | C6 (slid → slide) | — |
| smell | s·m·e·ll [sm-] | | — |
| swim | s·w·i·m [sw-] | | — |
| swing | s·w·i·ng [sw-] | Tl ng, D | N |
| frog | f·r·o·g [fr-] | D, P★ | T |
| flag | f·l·a·g [fl-] | D | N |
| flip | f·l·i·p [fl-] | L3 | — |
| truck | t·r·u·ck [tr-] | | — |
| crab | c·r·a·b [cr-] | D, Dp | N |
| drum | d·r·u·m [dr-] | Tl d, D, P★ | N |
| dress | d·r·e·ss [dr-] | Tl ss, D | N |
| brick | b·r·i·ck [br-] | | — |
| grass | g·r·a·ss [gr-] | Tl ss, D | N |
| plum | p·l·u·m [pl-] | | — |
| clap | c·l·a·p [cl-] | L3 | — |
| clip | c·l·i·p [cl-] | L3 | — |
| clock | c·l·o·ck [cl-] | Tl ck, D | N |
| black | b·l·a·ck [bl-] | | — |
| glad | g·l·a·d [gl-] | | — |
| tent | t·e·n·t [-nt] | Tl t, D, P★, L4 | R word-tent |
| bent | b·e·n·t [-nt] | L4 | — |
| best | b·e·s·t [-st] | L4 | — |
| nest | n·e·s·t [-st] | L4 | — (picture dropped after review: "eggs / not clear") |
| pond | p·o·n·d [-nd] | | — |
| jump | j·u·m·p [-mp] | L1 of stage 7 | — |
| lamp | l·a·m·p [-mp] | D | N |
| stamp | s·t·a·m·p [st-, -mp] | | — (**parent decides**: a postage stamp is rare for a child now; "stamp your feet" is known) |
| desk | d·e·s·k [-sk] | | — (he may call it "table") |
| left | l·e·f·t [-ft] | | — |
| milk | m·i·l·k [-lk] | D | N |
| skip | s·k·i·p [sk-] | | — (replaces skunk: a North American animal) |

(40 words; every pattern of design Part 3 has at least one word.)

**Nonsense (12):** sluk, fron, trob, clim, plog, snet, smub, gromp, flisk, dreb, nolk, bresk. (`clom` was dropped: close
to the heart word `come`.)

### 1.9 Stage 6 — silent e `a_e i_e o_e u_e` (+ `u_e₂`)

My call: `u_e` is read /uː/ first (tube, tune, rule) and /juː/ second (cube, cute), as a second-reading item.

| Word | Units | Uses | Picture |
|---|---|---|---|
| cake | c·a_e·k | D, Dp | R word-u |
| make | m·a_e·k | | — |
| name | n·a_e·m | | — |
| game | g·a_e·m | | — |
| tape | t·a_e·p | C6 (tap → tape) | — |
| cape | c·a_e·p | C6 (cap → cape, word only) | — (picture dropped after review: "not intuitive") |
| pine | p·i_e·n | L1 | — (replaces cane: "cane" is a candy cane or a walking stick; pine trees grow in Israel) |
| lime | l·i_e·m | L1 | — |
| cone | c·o_e·n | D, L1 | N |
| bone | b·o_e·n | D, P★, L1, Dp | N |
| wave | w·a_e·v | | — |
| snake | s·n·a_e·k | D, P★, Dp | N |
| whale | wh·a_e·l | Tl wh, D | N |
| white | wh·i_e·t | Dp | — |
| bike | b·i_e·k | D, L2 | R word-bicycle |
| kite | k·i_e·t | Tl k, D, P★, C6 (kit → kite), L2 | N |
| time | t·i_e·m | | — |
| line | l·i_e·n | | — |
| ride | r·i_e·d | | — |
| like | l·i_e·k | L2 | — |
| bite | b·i_e·t | L2 | — |
| smile | s·m·i_e·l | | — |
| slide | s·l·i_e·d | D, C6 (slid → slide) | N |
| home | h·o_e·m | L3 | — |
| hole | h·o_e·l | L3 | — |
| hope | h·o_e·p | C6 (hop → hope), L3 | — |
| rope | r·o_e·p | D | N |
| note | n·o_e·t | C6 (not → note) | — |
| globe | g·l·o_e·b | D | N |
| cube | c·u_e₂·b |  | — (picture dropped after review: "ice or dice") |
| cute | c·u_e₂·t | | — |
| tube | t·u_e·b | L4 | — |
| tune | t·u_e·n | L4 | — |
| rule | r·u_e·l | | — |

**The cauldron's e** (design Part 5): the picture changes only where both words have a picture (cap → cape). Where only
the e-word has one, the picture appears when the e lands (kit → kite, slid → slide). Where neither has one, only the word
changes (tap → tape, hop → hope, not → note). My call: few short-vowel words in these pairs have one obvious picture.

**Nonsense (12):** pove, dape, fime, lote, sabe, rike, grabe, flobe, kume, vope, bline, jabe. (`grane` and `jome` were
dropped: `grane` sounds like "grain", `jome` is close to `come`.)

### 1.10 Stage 7 — endings `-s -es -ed -ing`

Readings (my call, following design Part 3's second-reading rule): `-s` /s/ first (cats), /z/ second (dogs); `-ed` /t/
first (jumped), /d/ second (filled), /ɪd/ third (landed). No word doubles its last consonant (running, hopping): that
rule is not taught.

| Word | Units | Uses | Picture |
|---|---|---|---|
| cats | c·a·t·-s | Tw, P★, L4, Dp | N (three cats) |
| hats | h·a·t·-s | L4 | — |
| cups | c·u·p·-s | | — |
| ducks | d·u·ck·-s | Tw, P★ | N (three ducks) |
| boxes | b·o·x·-es | Tw, P★, Dp | N (three boxes) |
| foxes | f·o·x·-es | | — |
| dishes | d·i·sh·-es | | — |
| wishes | w·i·sh·-es | L3 | — |
| jumps | j·u·m·p·-s | L1 | — |
| jumped | j·u·m·p·-ed | L1 | — |
| bumped | b·u·m·p·-ed | L1 | — |
| jumping | j·u·m·p·-ing | | — |
| kicks | k·i·ck·-s | L2 | — |
| kicked | k·i·ck·-ed | L2 | — |
| licked | l·i·ck·-ed | L2 | — |
| licking | l·i·ck·-ing | L2 | — |
| kicking | k·i·ck·-ing | | — |
| fishing | f·i·sh·-ing | D, Dp | N (a kid fishing) |
| wished | w·i·sh·-ed | L3 | — |
| wishing | w·i·sh·-ing | L3 | — |
| helped | h·e·l·p·-ed | | — |
| singing | s·i·ng·-ing | | — |
| bells | b·e·ll·-s₂ | Tw | N (three bells) |
| dogs | d·o·g·-s₂ | | — |
| pigs | p·i·g·-s₂ | | — |
| filled | f·i·ll·-ed₂ | | — |
| yelled | y·e·ll·-ed₂ | | — |
| landed | l·a·n·d·-ed₃ | | — |
| melted | m·e·l·t·-ed₃ | | — |
| rested | r·e·s·t·-ed₃ | | — |

**Nonsense (6, my call):** gromps, gromping, gromped, jishes, nolking, nolked. The design has no stage-7 nonsense, but
the placement's name rounds need some: the wizard says "gromping", and only reading the ending finds it among
`gromping · gromped · gromps`.

### 1.11 Stage 8 — `ar or er ir ur`

| Word | Units | Uses | Picture |
|---|---|---|---|
| car | c·ar | D, P★, L1, Dp | N (a red car) |
| jar | j·ar | Tl j, D | N |
| star | s·t·ar | | — (the star is the reward symbol) |
| park | p·ar·k | | — |
| barn | b·ar·n | D, L3, Dp | N (approved; **parent decides** whether a child in Israel knows the word) |
| yarn | y·ar·n |  | — (picture dropped after review: "too hard") |
| farm | f·ar·m | L1 | — |
| harm | h·ar·m | L1 | — |
| hard | h·ar·d | L1 | — |
| card | c·ar·d | L1 | — |
| arm | ar·m |  | — (picture dropped after review: "muscle") |
| shark | sh·ar·k | Tl sh, D | N |
| for | f·or | L2 | — |
| fork | f·or·k | D, P★, L2 | N |
| fort | f·or·t | L2 | — (replaces cork: a wine cork is not a child's word) |
| corn | c·or·n | D, L2 | N |
| born | b·or·n | L2, L3 | — |
| short | sh·or·t | L4 | — |
| sort | s·or·t | L4 | — |
| sport | s·p·or·t | L4 | — |
| her | h·er | | — |
| under | u·n·d·er | | — |
| sister | s·i·s·t·er | | — |
| winter | w·i·n·t·er | | — |
| bird | b·ir·d | D, P★ | N |
| girl | g·ir·l | D | N |
| first | f·ir·s·t | | — |
| shirt | sh·ir·t | Tl sh, D, L4 | N |
| skirt | s·k·ir·t | D, Dp | N |
| fur | f·ur | | — |
| burn | b·ur·n | L3 | — |
| turn | t·ur·n | L3 | — |
| hurt | h·ur·t | | — |

`er` has no picture word (no one-syllable er word with an obvious picture): it is asked in word rounds only.

**Nonsense (12):** zarn, plorn, virp, murt, ferp, gurd, torb, charp, nirt, verm, skurn, jart. (`birp` was dropped: it
sounds like "burp".)

### 1.12 Stage 9 — `ai ay ee ea oa ow igh oo ou oi oy aw` (+ `oo₂ ow₂ ea₂`)

Main readings first, as the design says: `oo` as in moon, `ow` as in snow, `ea` as in eat. The second readings (`oo₂`
book, `ow₂` cow, `ea₂` bread) are their own items, later in the stage, in rounds where only one reading is possible.

| Word | Units | Uses | Picture |
|---|---|---|---|
| rain | r·ai·n | | — (rain looks like "cloud") |
| train | t·r·ai·n | D | N |
| snail | s·n·ai·l | D | N |
| paint | p·ai·n·t | | — |
| day | d·ay | L2 | — |
| pay | p·ay | L2 | — |
| say | s·ay | L2 | — |
| stay | s·t·ay | L2 | — |
| play | p·l·ay | | — |
| bee | b·ee | D | N |
| tree | t·r·ee | D, Dp | R word-tree |
| feet | f·ee·t | D | N |
| sheep | sh·ee·p | Tl sh, D, P★, Dp | N |
| green | g·r·ee·n | Dp | — |
| queen | qu·ee·n | Tl qu, D | N |
| wheel | wh·ee·l | Tl wh, D | N |
| teeth | t·ee·th |  | — (picture dropped after review: "smile") |
| eat | ea·t | | — |
| leaf | l·ea·f | D | N |
| seal | s·ea·l | D | N |
| boat | b·oa·t | D, P★, L1, Dp | N |
| coat | c·oa·t | L1 | — (he may call it "jacket") |
| goat | g·oa·t | L1 | — (replaces coal: not a thing a child in Israel sees; no picture: he called a goat "sheep" in the Hebrew duel) |
| goal | g·oa·l | L1 | — |
| soap | s·oa·p | D | N |
| snow | s·n·ow | | — (**parent decides**: snow is rare in Israel, but children know it) |
| grow | g·r·ow | | — |
| bowl | b·ow·l | D | N |
| night | n·igh·t | L3 | — |
| light | l·igh·t | L3 | — |
| right | r·igh·t | L3 | — |
| fight | f·igh·t | L3 | — |
| high | h·igh | | — |
| moon | m·oo·n | D, P★ | N |
| spoon | s·p·oo·n | D | N |
| food | f·oo·d | | — |
| boot | b·oo·t | | — |
| cool | c·oo·l | | — |
| out | ou·t | | — |
| cloud | c·l·ou·d | D | N |
| mouth | m·ou·th | | — |
| oil | oi·l | | — |
| coin | c·oi·n | | — (the coin is the reward) |
| point | p·oi·n·t | | — |
| boy | b·oy | D, L4 | N |
| toy | t·oy | L4, Dp | — |
| joy | j·oy | L4 | — |
| saw | s·aw | D, G (was·saw) | N (a hand saw) |
| paw | p·aw | D | N |
| draw | d·r·aw | | — |
| claw | c·l·aw | | — |
| book | b·oo₂·k | Tl b, D | R word-book |
| look | l·oo₂·k | | — |
| foot | f·oo₂·t | | — |
| good | g·oo₂·d | | — |
| cow | c·ow₂ | D | N |
| down | d·ow₂·n | | — |
| owl | ow₂·l | D | N |
| crown | c·r·ow₂·n | D | N |
| bread | b·r·ea₂·d | D | N |
| head | h·ea₂·d | | — |

**Nonsense (12):** voam, baip, feeb, sloy, zigh, broid, glay, noaf, zoud, jawp, dreeb, snigh. (`foud` was dropped: one letter from the heart word `four`.) My call: no nonsense word
uses a two-reading spelling (`oo ow ea`), so it has only one reading. (`taip` was dropped: it sounds like "tape".)

### 1.13 Look-alike sets (ghosts) and broom sets

**Letters** (one set per visit, he hears the sound and picks; design Part 5): `b d p` (stage 2), `n u` (stage 2), `m w`
and `h n` (stage 3). `q` appears only as `qu`. Never `I` against `l`.

**Words:**

| Stage open | Set |
|---|---|
| 2 | on · no, top · pot, ten · net, gum · mug, big · dig · pig, tip · pit |
| 3 | hot · not, hut · nut, hip · nip |
| 5 | stop · spot |
| 9 | was · saw |

**Broom sets** (he hears a word and catches it among words that differ in one unit): a script makes them from the lists
(same length, one unit different, all units opened). Examples: `bag · big · bug` (2), `pen · pin · pan` (2),
`ship · chip · shop` (4), `sing · sink · sick` (4), `cap · cape · cop` (6), `jumps · jumped · jumping` (7),
`car · card · cart` → listed words only: `barn · born · burn` (8), `boat · bait · beet` (9).

### 1.14 Ladder chains

Each rung changes one unit of the word below (design Part 5). From stage 5, a rung can also add or remove one
consonant (`lip → slip`): my call, because that is how a blend is built. Every chain word is in the lists above.

| Stage | L1 | L2 | L3 | L4 |
|---|---|---|---|---|
| 1 | sat → sit → fit → fin → pin | tap → map → man → fan → fin | nap → tap → tip → sip → sit | pan → pin → tin → tan → fan |
| 2 | dog → dot → pot → pit → pin | bug → bag → bad → bed → beg | pen → pan → pin → pig → big | mop → top → tip → tap → cap |
| 3 | fox → fix → fin → fan → van | hat → hot → hop → top → tip | web → wet → let → lot → log | zip → zap → lap → lip → hip |
| 4 | ship → shop → chop → chip | duck → luck → lock → sock | king → sing → sink → pink → pick | bell → well → will → fill |
| 5 | lip → slip → slap → snap → snack | pot → spot → spit → spin | cap → clap → clip → flip | ten → tent → bent → best → nest |
| 6 | pin → pine → line → lime → time | kit → kite → bite → bike → like | hop → hope → hole → home | tub → tube → tune |
| 7 | jump → jumps → jumped → bumped | kick → kicks → kicked → licked → licking | fish → wish → wishes → wished → wishing | cat → cats → hats |
| 8 | car → card → hard → harm → farm | for → fork → fort → sort → sport | turn → burn → barn → born | shirt → short → sort → sport |
| 9 | boat → coat → goat → goal | day → pay → say → stay | night → light → right → fight | boy → toy → joy |

The run's ladder takes rungs from these chains (a shorter ladder uses the start of a chain). No chain asks the same word
twice (rule).

### 1.15 Door phrases (stage 4 on)

Two or three words, heart words inside, never a heart word alone. The key shows the picture of the phrase's one noun;
each adjective fits that picture, so the prompt fixes the colour (red sock, red crab, red car, white bone, white sheep,
green tree). A phrase's wrong keys are other nouns' pictures, never a picture of another noun in the phrase.

| Stage | Phrases |
|---|---|
| 4 | a big duck · the red sock · what a fish |
| 5 | a red crab · a big drum · a wet frog |
| 6 | a white bone · the big snake · one big cake |
| 7 | my cats · big boxes · I am fishing |
| 8 | a red car · your skirt · a big barn |
| 9 | a green tree · a toy boat · the white sheep |

18 phrases. Limit: a child can find the key by reading only the noun (open question 4).

### 1.16 Placement rounds

Three picture rounds and three name rounds per stage, so the walk does not ask the same round twice. The words of a round
differ only in a unit of that stage, and every word uses only units of that stage or below. A wrong choice that is not
in the lists (marked °) needs no audio: the placement has no hint, and after a miss only the right word plays.

| Stage | Picture rounds (target first) | Name rounds (target first) |
|---|---|---|
| 1 | map · mat · man — fan · fin · tan (only 2: the pan picture was dropped; stage 1 asks 4 name rounds) | mip · map · nip — tif · taf · tip — nif · naf · mif — pim · pam° · tim° |
| 2 | dog · dig · dot — cup · cap · cop° — bed · bad · bid° | gub · gab° · dub° — bem · bim° · dem° — pob · pab° · pib° |
| 3 | hat · rat° · vat° — log · hog° · jog° — fox · foz° · fov° | vap · zap · lap — zim · vim° · rim° — jex · yex° · hex° |
| 4 | duck · dull° · duff° — ring · rink° · rich° — fish · fill · fizz° | chim · shim° · thim° — shap · chap° · thap° — thog · shog° · chog° |
| 5 | frog · fog° · grog° — drum · dum° · trum° — tent · ten · test° | sluk · suk° · snuk° — clim · cim° · flim° — snet · set° · spet° |
| 6 | snake · snak° · snoke° — kite · kit · kote° — bone · bun° · bane° | pove · pov° · pave° — dape · dap° · dipe° — fime · fim · fame° |
| 7 | cats · cat · cating° — boxes · box · boxed° — ducks · duck · ducked° | gromping · gromped · gromps — jishes · jish · jishing° — nolked · nolking · nolks° |
| 8 | car · cur° · cor° — bird · bard° · bid° — fork · fark° · ferk° | zarn · zan° · zorn° — murt · mut° · mart° — virp · vip° · varp° |
| 9 | boat · bait° · bet° — sheep · ship · shape° — moon · man · moan° | voam · vam° · veam° — baip · bap° · beep° — sloy · slay° · slee° |

The design's examples `vap · vip · map` and `cats · cat · cast` are adjusted (two units differ in `cast`, so `cating`) or adjusted to the rule above (`vip`, `map`
differ in units of stages 1, so `zap`, `lap` replace them).

### 1.17 Longest word per screen and stage

Check orbs, runes, plates, door plates and spell-book boxes with these at phone size (rule: check the longest word),
the broom's no-overlap geometry test included.

| Stage | Tower runes / broom orbs / ghosts / ladder plates | Door | Spell book (boxes) | Nonsense (tower, placement) |
|---|---|---|---|---|
| 1–2 | 3 letters (sat, dog) | 3 letters | 3 | 3 (tam, gub) |
| 3 | 4 (quiz) | 3 | 3 | 4 (quab) |
| 4 | 5 (chick, shell) | 5; phrase "the red sock" (12) | 3 (ch·i·ck) | 5 (wheck) |
| 5 | 5 (stamp, snack, smell) | 5; phrase "a big drum" (10) | 5 (s·t·a·m·p) | 5 (gromp, flisk, bresk) |
| 6 | 5 (smile, slide, globe, white) | 5; phrase "one big cake" (12) | 4 (s·m·i_e·l) | 5 (flobe, bline) |
| 7 | 7 (jumping, kicking, licking, fishing, wishing, singing) | 7; phrase "I am fishing" (12) | 5 (j·u·m·p·ing) | **8 (gromping), the longest of the path** |
| 8 | 6 (sister, winter) | 5; phrase "your skirt" (10) | 5 (s·i·s·t·er) | 5 (plorn, charp, skurn) |
| 9 | 5 (spoon, cloud, crown, wheel, teeth, night) | 5; phrase "the white sheep" (15) | 4 (c·l·ou·d) | 5 (dreeb, broid, snigh) |

---

### 1.18 Word pass for a child in Israel (2026-11-17)

The child lives in Israel and speaks English (the parent, on the sled: "we're in israel. there's no strong sense of what
a sled is"). I checked every word and picture for winter or snow-country things, US-only animals, food and school words.

| Was | Now | Why | Same units kept |
|---|---|---|---|
| sled | slug | a sled is not familiar in Israel | `sl-` (with slip, slap, slid) |
| skunk | skip | a North American animal | `sk-`; `-nk` keeps sink, pink |
| cane | pine, lime | "cane" is a candy cane or a walking stick | `i_e`; the stage-6 chain is now pin → pine → line → lime → time |
| cork | fort | a wine cork is not a child's word | `or`; chain for → fork → fort → sort → sport |
| coal | goat, goal | coal is not seen; goal is every child's football word | `oa`; chain boat → coat → goat → goal |
| the black skunk (door) | a wet frog | skunk dropped | a stage-5 picture noun |

**For the parent to decide** (kept in the list until he says): **snow** (rare in Israel, but known), **stamp** (a postage
stamp is rare now; "stamp your feet" is known), **barn** (its picture is approved; is the word known?), **igloo** (the
`i` picture, approved; snow-country). Checked and kept: corn, plum, jam, chip, quiz, desk, seal, owl, cow, sheep,
winter, fur (all known to a child in Israel); the US spelling `ax` (the course is American).

## Part 2 — Pictures and sprites

### 2.1 Reused pictures (29)

Each is checked against "What will the child call this?" in American English, and against the rules (first sound exact,
one meaning per symbol, nothing the scene shows).

| File | English word | Check |
|---|---|---|
| pw-banana | banana | ✓ `b` |
| pw-carrot | carrot | ✓ `c` (/k/) |
| pw-cat | cat | ✓ |
| pw-dog | dog | ✓ |
| pw-fish | fish | ✓ |
| pw-fox | fox | ✓ last sound `x` |
| pw-horse | horse | ✓ `h` (not decodable: picture-only) |
| pw-lemon | lemon | ✓ `l` |
| pw-strawberry | strawberry | ✓ `s` (starts with a blend; the first sound is still /s/) |
| word-a (lion) | lion | ✓ `l` |
| word-bicycle | bike | ✓ an American child says "bike", so the word is `bike` (stage 6) |
| word-book | book | ✓ `b`, `oo₂` |
| word-bus | bus | ✓ (city bus, "clearly a bus") |
| word-butterfly | butterfly | ✓ `b` |
| word-camel | camel | ✓ `c` |
| word-cookie | cookie | ✓ `c` |
| word-door | door | ✓ `d`; tower only, never on the doors screen (rule: the scene must not show the answer) |
| word-e (chick) | chick | ? he may say "chicken" or "baby chick": review item |
| word-fire | fire | ✓ `f` |
| word-house | house | ✓ `h` |
| word-i (pencil) | pencil | ✓ `p` |
| word-igloo | igloo | ✓ `i` (short i) |
| word-monkey | monkey | ✓ `m` (it holds a banana: still "monkey") |
| word-mouse | mouse | ✓ `m` |
| word-pineapple | pineapple | ✓ `p` |
| word-tent | tent | ✓ |
| word-tree | tree | ✓ |
| word-u (birthday cake) | cake | ? he may say "birthday cake": fine for the door (he reads `cake`), not used as a first-sound picture |
| word-watermelon | watermelon | ✓ `w` |

**Not reused:** pw-ball (an American child says "soccer ball"), word-eye (starts with /aɪ/), word-island (`i` says
/aɪ/), word-silent (no English word), word-rose (he may say "flower"; `rose` also has s = /z/), the monster sprites (an
octopus picture would repeat the octopus monster).

### 2.2 Test takes from the cheaper model (6)

apple, egg, frog, pig, sun, umbrella (the test's book duplicates word-book). Each gets one more take so the parent can
pick between two (rule: 2 takes), unless the parent keeps them as they are.

### 2.3 New pictures (107 made, 91 kept)

**Made and reviewed (2026-11-17).** All 107 and the spell book were made with gemini-2.5-flash-image through the Gemini
Batch API, 1 take each (the parent's decision), and cut out host-locally. Flash paints a magenta glow around most
subjects; the cut-out removes it in two steps (strong key colour flooded from outside, then the pale fringe outside the
subject's dark outline) and clears background trapped inside a subject. Redraws ask for "no glow, no halo" and use a
green background (magenta for subjects with green in them). After the parent's review:
- **Dropped, 16** (the name is not one obvious name, or the picture is not clear; the word stays, with no picture): pan,
  otter, gum, mop, rug, web, van, skunk, cape, cube, cap, arm, yarn, teeth, nest, sled. Struck through below.
- **Redrawn and picked, 19** (2 takes each, he picked one): rocket (a toy rocket, not a missile), yo-yo, duck and ducks
  (adult mallards, not chicks), doll (a rag doll, not a princess), crab (orange, round: not a lobster), milk (a carton,
  not a glass), kite, slide, rope, cats (grown-up cats, not kittens), boxes, bee, queen (grown-up, robe, not a princess),
  wheel, boat (a rowboat with oars, not a ship), boy, train.
- Every other picture: approved. The bug stays ("could be a beetle, but both start with b").


Every prompt uses the pw-* template of `asset-sources/duel2/images.json` ("Single game icon drawn in EXACTLY the art
style … of the reference image: <subject>. Exactly ONE subject … on a perfectly flat solid pure magenta background
(#FF00FF) … No text, no letters, no dots, no specks."), with the duel's style sheet as the reference. Pictures are not
recoloured (design Part 2: picture words stay the same in both paths). Add to each subject: no shape that looks like a
Latin letter (no X mark, no O ring).

Names marked **?** are uncertain; they are review items (2.6).

| # | Name | Stage | Subject |
|---|---|---|---|
| 1 | map | 1 | an unfolded cartoon paper map with green land, blue water and a winding red path, no writing, no X mark |
| 2 | ~~pan~~ (dropped) | 1 | a black cartoon frying pan with a handle, top-side view, empty |
| 3 | fan | 1 | a cartoon electric desk fan with round blades in a cage, on a stand |
| 4 | ant | 1 | a cute cartoon red ant, side view, six legs, two antennae |
| 5 | astronaut **?** | 1 | a cute cartoon kid astronaut in a white space suit and round helmet, waving |
| 6 | tiger | 1 | a cute cartoon tiger sitting, orange with black stripes |
| 7 | turtle | 1 | a cute cartoon green turtle, side view, walking |
| 8 | nose | 1 | one big friendly cartoon nose, just the nose |
| 9 | cup | 2 | a simple cartoon cup with a handle, empty, front view |
| 10 | bug | 2 | a cute cartoon beetle (not a ladybug), top view, six legs |
| 11 | bag | 2 | a brown cartoon paper shopping bag with handles |
| 12 | bed | 2 | a cartoon bed with a pillow and blanket, side view |
| 13 | net **?** | 2 | a cartoon butterfly net on a long handle |
| 14 | ~~gum~~ (dropped) | 2 | a pink stick of chewing gum, half unwrapped |
| 15 | ~~mop~~ (dropped) | 2 | a cartoon mop with a wooden handle and a stringy head |
| 16 | pot | 2 | a cartoon cooking pot with two handles and a lid |
| 17 | ostrich **?** | 2 | a cute cartoon ostrich standing, long neck and legs |
| 18 | ~~otter~~ **?** (dropped) | 2 | a cute cartoon otter floating on its back |
| 19 | guitar | 2 | a cartoon acoustic guitar, front view |
| 20 | elephant | 2 | a cute cartoon grey elephant, side view, trunk up |
| 21 | hat | 3 | a cartoon brown hat with a brim and a band (not a wizard hat) |
| 22 | ~~rug~~ (dropped) | 3 | a cartoon oval rug with stripes, on its own, top-side view |
| 23 | log | 3 | a cartoon wooden log, side view, rings on the end |
| 24 | ~~web~~ (dropped) | 3 | a cartoon spider web, round, no spider |
| 25 | box | 3 | a cartoon closed cardboard box with tape |
| 26 | ax | 3 | a cartoon wood ax with a wooden handle |
| 27 | ~~van~~ (dropped) | 3 | a cartoon delivery van, side view, clearly a van, not a bus or a car |
| 28 | robot | 3 | a cute cartoon toy robot, square head, antenna |
| 29 | rocket | 3 | a cartoon space rocket with fins and a flame |
| 30 | worm | 3 | a cute cartoon pink worm, curvy |
| 31 | jellyfish | 3 | a cute cartoon jellyfish with long wavy tentacles |
| 32 | yo-yo | 3 | a cartoon yo-yo on its string |
| 33 | volcano | 3 | a cartoon volcano with red lava on top |
| 34 | zebra | 3 | a cute cartoon zebra standing, side view |
| 35 | zipper | 3 | a big cartoon zipper, half open, on its own |
| 36 | duck | 4 | a cute cartoon yellow duck, side view |
| 37 | sock | 4 | one red cartoon sock (red: the phrase "the red sock") |
| 38 | bell | 4 | a golden cartoon bell with a clapper |
| 39 | doll | 4 | a cartoon toy doll with a dress |
| 40 | shell **?** | 4 | a cartoon sea shell (scallop) |
| 41 | ring | 4 | a gold cartoon ring with one big gem |
| 42 | king | 4 | a cartoon king with a crown, a red cape, smiling |
| 43 | sink | 4 | a cartoon kitchen sink with a tap |
| 44 | cheese | 4 | a cartoon wedge of yellow cheese with holes (big holes, not dots) |
| 45 | ~~sled~~ (dropped) | 5 | a cartoon wooden sled, side view |
| 46 | swing | 5 | a cartoon playground swing hanging from a frame |
| 47 | flag | 5 | a cartoon flag on a pole, plain colours, no symbol |
| 48 | crab | 5 | a cute cartoon red crab (red: "a red crab") |
| 49 | drum | 5 | a cartoon drum with two drumsticks |
| 50 | dress | 5 | a cartoon girl's dress on its own |
| 51 | grass | 5 | a cartoon tuft of green grass |
| 52 | clock | 5 | a cartoon alarm clock with two bells on top |
| 53 | ~~nest~~ (dropped) | 5 | a cartoon bird nest with three eggs |
| 54 | lamp | 5 | a cartoon table lamp with a shade |
| 55 | milk | 5 | a cartoon glass of milk |
| 56 | ~~skunk~~ (dropped) | 5 | a cute cartoon black and white skunk |
| 57 | ~~cape~~ (dropped) | 6 | a cartoon red superhero cape on its own, flowing |
| 58 | ~~cap~~ (dropped) | 6 | a cartoon baseball cap, side view |
| 59 | cone | 6 | an orange cartoon traffic cone (not an ice cream cone: he would say "ice cream") |
| 60 | bone | 6 | a white cartoon dog bone |
| 61 | snake | 6 | a cute cartoon green snake, coiled |
| 62 | whale | 6 | a cute cartoon blue whale with a water spout |
| 63 | kite | 6 | a cartoon diamond kite with a tail |
| 64 | slide | 6 | a cartoon playground slide with a ladder |
| 65 | rope | 6 | a cartoon coil of rope |
| 66 | globe | 6 | a cartoon globe on a stand |
| 67 | ~~cube~~ **?** (dropped) | 6 | a big plain toy cube in one colour, three faces seen, no letters, no dots |
| 68 | cats | 7 | three cute cartoon cats in a row (the same style as pw-cat) |
| 69 | ducks | 7 | three cute cartoon ducks in a row (the same style as duck) |
| 70 | boxes | 7 | three cartoon cardboard boxes in a pile |
| 71 | bells | 7 | three golden cartoon bells |
| 72 | fishing | 7 | a cartoon kid with a fishing rod, a fish on the line |
| 73 | car | 8 | a red cartoon car, side view (red: "a red car") |
| 74 | jar | 8 | a cartoon glass jar with a lid, empty |
| 75 | barn | 8 | a red cartoon barn |
| 76 | ~~yarn~~ (dropped) | 8 | a cartoon ball of yarn with a loose end |
| 77 | ~~arm~~ **?** (dropped) | 8 | a cartoon arm making a muscle |
| 78 | shark | 8 | a cartoon grey shark, side view, friendly |
| 79 | fork | 8 | a cartoon fork |
| 80 | corn | 8 | a cartoon ear of corn with green leaves |
| 81 | bird | 8 | a cute cartoon small bird, side view |
| 82 | girl | 8 | a cartoon girl, about 7 years old, waving (not the girl wizard) |
| 83 | shirt | 8 | a cartoon T-shirt on its own |
| 84 | skirt | 8 | a cartoon skirt on its own |
| 85 | train | 9 | a cartoon toy train engine with one car |
| 86 | snail | 9 | a cute cartoon snail |
| 87 | bee | 9 | a cute cartoon bee |
| 88 | feet | 9 | two cartoon bare feet |
| 89 | sheep | 9 | a white fluffy cartoon sheep (white: "the white sheep") |
| 90 | queen | 9 | a cartoon queen with a crown and a gown |
| 91 | wheel | 9 | a cartoon wheel with a tire and spokes, on its own |
| 92 | ~~teeth~~ (dropped) | 9 | a cartoon smile showing clean white teeth |
| 93 | leaf | 9 | a green cartoon leaf |
| 94 | seal | 9 | a cute cartoon grey seal |
| 95 | boat | 9 | a cartoon toy sailboat ("a toy boat") |
| 96 | soap | 9 | a pink cartoon bar of soap with a few big bubbles |
| 97 | bowl | 9 | a cartoon bowl, side view, empty |
| 98 | moon | 9 | a cartoon crescent moon with a friendly face, no stars |
| 99 | spoon | 9 | a cartoon spoon |
| 100 | cloud | 9 | a fluffy white cartoon cloud, no rain |
| 101 | boy | 9 | a cartoon boy, about 7 years old, waving (not the wizard) |
| 102 | saw | 9 | a cartoon hand saw |
| 103 | paw | 9 | a cartoon dog's paw, pads up |
| 104 | cow | 9 | a cute cartoon cow |
| 105 | owl | 9 | a cute cartoon owl |
| 106 | crown | 9 | a cartoon gold crown with gems (gold, not the colour of the coins) |
| 107 | bread | 9 | a cartoon loaf of bread |

### 2.4 The spell book sprite (1 new image)

An open magic spell book seen from the front, two blank pages (no writing, no marks), a leather cover, gold corners, a
soft glow from the pages; flat pure green background (#00FF00), since the cover is purple (rule: cut out from a colour far
from its own). Generated in the Hebrew style (purple) and then recoloured to green, so that one image serves both paths
if the parent wants the Hebrew spell book (open question 3). The home path's "book" station uses the same sprite. Take
count: 4 (a new sprite, its look matters on two screens).

### 2.5 Recoloured assets (design Part 2; 31 files, no cost)

Made once by the host-local scripts; outputs committed as new files; each recorded in `asset-sources/english/images.json`
with its source file and the script's parameters.

| Mapping | Files |
|---|---|
| **Props:** purple hues 235°–325° move by −105° (gold, white, skin, stars stay) | bg-sky, bg-ground, s-orb, s-plate, s-door, s-door-open, s-key, s-ladder, s-cauldron, s-ghost, s-crystal-1, s-crystal-2, s-crystal-3, s-crystal-4 (14) |
| **Wizard (strict):** hues 195°–335° become one green family around 152°, 30 % of the original spread kept | Book 2: s-wizard-idle, s-wizard-cast, s-wizard-dizzy, s-wizbroom, and the four `-girl` files; the first duel: wizard-idle, wizard-cast, wizard-dizzy and the three `-girl` files (14) |
| **Strict, as the design says** | tower (the first duel's tower sprite); home card and card-girl, also mirrored to face the other way (3) |
| **Not changed** | monsters, bosses, merchant, potion, picture words, coins, hearts, stars |

The builder also checks whether the tower screen has a background file of its own (none was found in the sprite folder);
any that exists goes in the props row. Review: a sheet of all 31 beside their sources, plus one walking frame of each
wizard sprite, the girl's included (rule: look at one walking frame of each sprite).

### 2.6 Picture totals and review

| | Count |
|---|---|
| Reused as they are | 29 |
| Test takes from the cheaper model | 6 |
| New pictures kept (107 made, 16 dropped) | 91 |
| New sprite (spell book) | 1 |
| Recoloured (no cost; all approved) | 31 + the two home cards mirrored |
| **Pictures used in the English path** | **126** + the spell book |

Spent on pictures: about $3.3 (156 Flash images: 148 by batch at about $0.02, 8 interactive at about $0.04). Review lessons, now in `docs/minigame-rules.md` and applied: the word appears only on hover or tap; a note on a
name means "a child may call it something else", so the picture is dropped or redrawn, never argued for.

---

## Part 3 — Sounds and voice lines

### 3.1 Sound units: the 47 sound recordings

The design counts "about 45 sound units". The game has 62 units (stages 1–4: 37, stage 6: 4, stage 7: 4, stage 8: 5,
stage 9: 12) and 8 second readings (`th₂ u_e₂ -s₂ -ed₂ -ed₃ oo₂ ow₂ ea₂`): 70 tracked items. The stage-5 blend
patterns are skills, not units. Items with the same sound share one recording (`c k ck` → /k/), so there are **47 sound
recordings**. Each is short, said once (rule), never the letter's name.

**How (found in the voice tests, 2026-11-17; the parent approved the voice).** Gemini TTS (`gemini-3.8-flash-tts`, voice
**Puck**) with a short spoken direction in brackets that the voice does not read: `[phonics sound only, not the letter
name, said once] mmm`, or with the sample word for vowels: `[phonics sound: the short vowel in "cat"; not the letter name]
aa`. ElevenLabs failed here: doubled letters became letter names (`mm.` → "millimeters", `ss.` → "ess"), and IPA phoneme
tags were ignored. **Route C, cut:** a sound cut out of an approved take, or an approved take cut shorter (rule: cut, do
not re-record); short `a` is being solved this way. Three candidates per sound (2 directions, plus a cut where it helps);
only the ones that pass the screen (3.6) reach the parent, at most 2 per item.

| # | Sound | Items | Text after the direction | Sample word in the direction | Status |
|---|---|---|---|---|---|
| 1 | /æ/ | a | `aa` | cat | said too long; shortened cuts (0.22 / 0.30 s) in review |
| 2 | /ɛ/ | e, ea₂ | `eh` | bed | to make (a cut from a word is the fallback) |
| 3 | /ɪ/ | i | `ih` | sit | approved (take B) |
| 4 | /ɑ/ | o | `ah` | hot | approved |
| 5 | /ʌ/ | u | `uh` | up | to make (a cut from a word is the fallback) |
| 6 | /m/ | m | `mmm` | map | approved |
| 7 | /s/ | s, ss, -s | `sss` | sun | approved |
| 8 | /t/ | t, -ed | `t` | top | approved |
| 9 | /p/ | p | `puh` | pan | to make (a cut from a word is the fallback) |
| 10 | /f/ | f, ff | `fff` | fan | to make (a cut from a word is the fallback) |
| 11 | /n/ | n | `nnn` | net | to make (a cut from a word is the fallback) |
| 12 | /d/ | d, -ed₂ | `duh` | dog | to make (a cut from a word is the fallback) |
| 13 | /k/ | c, k, ck | `kuh` | cat | to make (a cut from a word is the fallback) |
| 14 | /g/ | g | `guh` | gum | to make (a cut from a word is the fallback) |
| 15 | /b/ | b | `b` | bed | approved (a small "uh" after it) |
| 16 | /h/ | h | `hh` | hat | to make (a cut from a word is the fallback) |
| 17 | /r/ | r | `rrr` | red | to make (a cut from a word is the fallback) |
| 18 | /l/ | l, ll | `lll` | log | to make (a cut from a word is the fallback) |
| 19 | /w/ | w, wh | `wuh` | wet | to make (a cut from a word is the fallback) |
| 20 | /dʒ/ | j | `juh` | jam | to make (a cut from a word is the fallback) |
| 21 | /j/ | y | `yuh` | yes | to make (a cut from a word is the fallback) |
| 22 | /ks/ | x | `ks` | fox (at the end) | to make (a cut from a word is the fallback) |
| 23 | /kw/ | qu | `kw` | quiz | to make (a cut from a word is the fallback) |
| 24 | /v/ | v | `vvv` | van | to make (a cut from a word is the fallback) |
| 25 | /z/ | z, zz, -s₂ | `zzz` | zip | to make (a cut from a word is the fallback) |
| 26 | /ʃ/ | sh | `shh` | ship | approved |
| 27 | /tʃ/ | ch | `ch` | chip | to make (a cut from a word is the fallback) |
| 28 | /θ/ | th | `thh` | thin | to make (a cut from a word is the fallback) |
| 29 | /ð/ | th₂ | `dhh` | this | to make (a cut from a word is the fallback) |
| 30 | /ŋ/ | ng | `ng` | ring (at the end) | to make (a cut from a word is the fallback) |
| 31 | /ŋk/ | nk | `nk` | sink (at the end) | to make (a cut from a word is the fallback) |
| 32 | /eɪ/ | a_e, ai, ay | `ay` | cake | to make |
| 33 | /aɪ/ | i_e, igh | `eye` | kite | to make |
| 34 | /oʊ/ | o_e, oa, ow | `oh` | boat | to make |
| 35 | /uː/ | u_e, oo | `oo` | moon | to make |
| 36 | /juː/ | u_e₂ | `you` | cute | to make |
| 37 | /iː/ | ee, ea | `ee` | tree | to make |
| 38 | /ɪz/ | -es | `iz` | boxes (the ending) | to make (a cut from a word is the fallback) |
| 39 | /ɪd/ | -ed₃ | `id` | landed (the ending) | to make (a cut from a word is the fallback) |
| 40 | /ɪŋ/ | -ing | `ing` | singing (the ending) | to make (a cut from a word is the fallback) |
| 41 | /ɑr/ | ar | `ar` | car | to make |
| 42 | /ɔr/ | or | `or` | fork | to make |
| 43 | /ɝ/ | er, ir, ur | `er` | bird | to make |
| 44 | /aʊ/ | ou, ow₂ | `ow` | cow | to make |
| 45 | /ɔɪ/ | oi, oy | `oy` | boy | to make |
| 46 | /ɔ/ | aw | `aw` | saw | to make |
| 47 | /ʊ/ | oo₂ | `uu` | book | to make (a cut from a word is the fallback) |

A stop sound (rows 8, 9, 12–15, 20, 21, 27) cannot be held;
its take is a short burst with the least vowel (design Part 10), measured for length and voiced bursts.

**Letter names (8)**, only for the look-alike explanation (`explain-letter`): b, d, p, n, u, m, w, h. Text: the capital
and a full stop ("B."), where the letter name is wanted.

### 3.2 Words, heart words, phrases

- **Real words (313)** and **picture-only words (38)**: one take each (rule: the review exception for large sets of real
  words), text `[warm, clear] fish`, never in a carrier phrase. The longer direction `[warmly and clearly, said once]` leaked
  into the audio in 2 of 9 tests, so the direction is kept short and the screen checks the transcript.
- **Heart words (33)**: one take each, the same direction. `a` is said as in "a cat" (/ə/), never the letter name: try `a`
  and `uh` and keep the one the listener hears as "uh".
- **Door phrases (18)**: one take each, `[warm, clear] a big duck`, played when the door opens (as Book 2's door words).
- **Two-syllable words** (sister, winter, under, jumping…): check the stress by measurement (rule).
- **The approved word take is also the hint's last word** (3.4): one take serves both.

### 3.3 Nonsense words (102)

Text: `[one made-up word, read as a word that rhymes with map, not spelled out] vap`: the direction names a real word that
rhymes, so the vowel and the ending are clear. The parent approved all 8 of the test (tam, nif, vap, chim, pove, zarn,
voam, sluk). Each of the 102 gets a rhyme word in its request (the builder picks it from the word lists; for a vowel team,
a word with the same team: voam → foam). One take each, a second only if the screen fails it. Text on the screen stays the
lowercase spelling (rule: change the spoken text, not the screen).

### 3.4 The hint's slow word (no recordings of its own)

The parent's method (2026-11-20): **units then word**. The hint plays each unit's own sound clip (`snd-<sound>`) in turn,
lighting that unit, then the normal word take with all units lit. No slowed recording is needed, only the unit sounds
(3.1) and the words. The unit light times come from the real start of each clip, so no forced alignment is needed. The
first plan's 414 stretched recordings, the half-speed words and the host-local stretch script are not used.

### 3.5 Voice lines

Every Hebrew line of the run that the English run uses, as an English-speaking adult says it to a child at that moment
(rule), in natural American English. No "!" (it makes the voice shout); a line that a sound follows ends with ":" (no
"…": the voice moaned). No numbers that the game logic can change. Each line keeps the Hebrew line's variation count.

**Girl forms: none.** English marks gender in this set only with "wizard", and the design's call is that a girl is a
"wizard" too. No line says he/she or his/her. (If the parent wants "witch" or "sorceress", every line with "wizard" gets a
girl form: about 8 lines.)

**Voice: Puck** (Gemini TTS `gemini-3.8-flash-tts`), for every line, word, sound and nonsense word of the English path
(the parent, 2026-11-17: "puck voice is great"; it replaces Will). One voice for every role except the merchant.

**The merchant** keeps a voice of his own (rule: each voice one role): a second Gemini voice, for the parent to pick, each
heard saying m-hello-1 and m-short-1: **Algenib** (gravelly, a market trader), **Gacrux** (mature, warm), **Umbriel**
(easy-going), **Sadachbia** (lively). My pick: Algenib, the most unlike Puck.

**Directions** (the bracket at the start is not read aloud; no "!" in the text):
- dramatic lines (D): `[excited, to a 7-year-old]`, `[amazed, to a 7-year-old]`, `[booming]`;
- instructions and content (I): `[warmly, to a 7-year-old]` or `[playfully, to a 7-year-old]`;
- the merchant (M): `[playful, a friendly market trader]`.
A line with two sentences keeps one direction; a pause of 0.7–0.9 s between sentences is an audio edit if needed.

#### From Book 2's `lines.ts` (74 texts)

| id (English) | Where | Text (one per variation) | Kind |
|---|---|---|---|
| q-cauldron | cauldron, when he waits; then the word | Which sound is missing from: · Put the missing sound in the pot to make: · What's missing to make: | I warmly |
| q-ladder | ladder, when he waits; then the word | Find the letter that makes: · Drag the letter up the ladder to make: · Which letter makes: | I warmly |
| q-ghosts | ghosts (words), when he waits; then the word | Where is: · Which ghost has: · Find: | I playful |
| q-ghosts-sound | ghosts (letters, by sound), when he waits; then the sound | Which ghost has the sound: · Find the sound: · Where's the letter that says: | I playful |
| q-door | door, when he waits; never says the word | What does the door say? Bring the right key. · Read the word, and pick a key. · Which key opens the door? | I warmly |
| target-new | broom: a new target; then it | And now: · Now catch: · Now something new: | I playful |
| almost | a near miss, forgiven (encouraging) | Almost. · So close. Look again. · Really close. | I encouraging |
| streak | a streak | Wow, you're on fire. · You're unstoppable. · You're really flying through these. | D excited |
| ladder-top | the ladder is built to the top | You made it to the top. · You built the whole ladder. · Wow, all the way to the sky. | D excited |
| crystal | the crystal behind the last door | Wow, a magic crystal. · You found a magic crystal. · What a sparkly crystal. | D amazed |
| run-end | out of hearts (no praise, not sad) | Out of hearts. Play again? · That's it for this time. Want to play again? · The round is over. One more? | I warmly |
| defeat | the dizzy wizard falls | Oops, they won this time. · Oh no, the magic ran out this time. | I playful |
| new-best | summary: a new best | A new record. · You beat your record. | D excited |
| explain-lead | after a mistake, before the slow word | Let's read it slowly. | I warmly |
| boss-arrive | a flight boss; then the first target | Here comes a monster. To beat it, catch what I say: · A monster in the sky. Let's beat it. Catch: · Oh, a monster's here. Catch what I say: | D excited |
| boss-win | the boss is beaten | You beat the monster. · Wow, you scared the monster away. · What a spell. You beat it. | D excited |
| boss-new | first win against a kind of boss | You beat a new monster. Now it's on your shelf. | D amazed |
| mult-up | the multiplier rises (take 1 ×2, take 2 ×3) | Now every right answer gives you twice as many coins. · Now every right answer gives you three times as many coins. | D excited |
| info-hearts | a tap on the hearts | These are your hearts. Each mistake takes one away, and you get one back at the end of each round. | I |
| info-stars | a tap on the stars | These are the stars from this game. Every right answer gives you a star. | I |
| info-coins | a tap on the coins | These are your coins. You get them for right answers, and you can buy potions with them. | I |
| info-crystals | a tap on the crystals | These are your magic crystals. You find them behind the last door. | I |
| info-best | a tap on the best | This is your record: the most stars you got in one game. | I |
| info-bosses | a tap on the boss trophies | These are the monsters you beat. The dark ones are waiting for you in the sky. | I |
| info-mult | a tap on ×2 / ×3 | Right answers in a row give more coins. When you lose a heart, the streak ends. | I |
| demo-broom | first broom with words | Move the wizard up and down, and catch the word I say. | I warmly |
| demo-broom-sound | first broom with sounds (was demo-broom-letter) | Move the wizard up and down, and catch the sound I say. | I warmly |
| demo-cauldron | first cauldron | Drag the missing letter into the pot, to make the word I say. | I warmly |
| demo-ladder | first ladder | Drag up the letter that makes the word I say, and the wizard climbs. | I warmly |
| demo-ghosts-sound | first letter ghosts (was demo-ghosts-letter) | Touch the ghost that has the sound I say. | I warmly |
| demo-ghosts-word | first word ghosts (was demo-ghosts-syllable) | Touch the ghost that has the word I say. | I warmly |
| demo-doors | first door | Read what the door says, and drag the key with the right picture to it. | I warmly |
| demo-draw | drawing, first visit, while the hand writes | Watch how to write the first sound. Then you write it. | I warmly |
| q-draw | drawing, when he waits; then the word | Write the first sound of: · How does it start? Write the first letter of: · Let's write the start of: | I warmly |
| draw-again | a wrong stroke; the hand shows it again | Let's write that line again. · Let's try that line one more time. · Watch the hand, and write the line again. | I encouraging |
| draw-dot | the letter is done; now its dot (`i`, `j`) | Now the dot. | I warmly |
| draw-cross | now its cross line (`t`, `f`) | Now the line across. | I warmly |
| line-tall | above the top line (it still counts) | That letter went a little too high. | I warmly |
| line-low | below the base line | A little low. | I warmly |
| line-small | much too small | Next time, write it bigger. | I warmly |
| ask-gender | only if the English path can be the first thing a child plays | Who's playing? A boy or a girl? | I warmly |

Not used in English: `dot-without`, `dot-with`, `dot-right`, `dot-left` (Hebrew dotted letters).
Counted texts: 15 (q-*) + 3+3+3+3+3+3+2+2+1+3+3+1+2 (run) + 7 (info) + 8 (demos) + 3+3+1+1+3 (drawing) + 1 = 74.

#### The merchant, `m-*` (27 texts, his voice, same variation counts)

| id | Text (one per variation) |
|---|---|
| m-hello | Hello, wizard. I have a potion that gives you a heart back. Do you want one? · Hi there, wizard. I brought a potion that gives you a heart. Want one? · Hey, wizard. I've got a potion that brings a heart back. Want to buy it? |
| m-offer | Want a heart potion? |
| m-again | So, do you want one? · Well? How about a potion? |
| m-bye | All right. Goodbye, wizard. · No problem. See you next time. |
| m-price | This is the price. |
| m-give | Give me coins to match the price. |
| m-tap | Then touch the potion. |
| m-decline | Don't need it? Touch here. |
| m-exact | Exactly right. Here's your potion. · Just the right amount. Here you go. · Perfect, that's exactly the price. |
| m-heart | Now you have a heart back. · You got a heart back. · Your heart is back. |
| m-short | That's not enough. · That's less than the price. · I need more coins. |
| m-over | That's too much. · That's more than the price. · There are too many coins here. |
| m-undo | Take a coin back. |
| m-empty | Coins first. · First, give me some coins. |

The first lines of m-hello, m-offer, m-again, m-bye and D1–D4 are the design's table (Part 8).

#### The tower (the first duel's lines, 13 texts)

| id | Where | Text | Kind |
|---|---|---|---|
| line-intro | the tower rises | The monsters are coming. Protect the tower. | I (`[mysterious]` → `[determined]`) |
| line-how-A | picture round, first sound | What's the first sound in the picture? Pick its letter. | I curious → warmly |
| line-how-B | sound round | Listen to the sound, and pick its letter. | I warmly |
| line-how-C | name round (nonsense) | Listen to the monster's name, and find it. | I warmly |
| line-new-monster | a new monster | Look, a new monster. Here it comes. | D amazed → excited |
| line-combo | a streak in the tower | Wow, you're on fire. | D excited |
| line-mega | the mega spell is ready | Mega spell ready. | D excited |
| line-boss | a tower boss | Watch out, a giant monster. It takes lots of spells to beat it. | D booming → excited |
| line-boss-win | the boss is beaten | Great job. You beat the giant monster. | D excited |
| line-over | the end | You fought like a real wizard. Play again? | I warmly |
| line-record | a new record | New record. | D excited |
| line-almost | near miss | Almost. | I encouraging |
| line-wave | more monsters | More monsters are on the way. | I playful |

The builder plays only those that the tower still uses in the run (`line-how-silent` has no English counterpart). Its
`line-combo` and `streak-1` say the same words; my call: one take serves both if the tower and the run share it.

#### New lines for the English path (25 texts)

| id | Where | Text (one per variation) | Kind |
|---|---|---|---|
| line-how-last | picture round, last sound (`x ck ff ll ss zz ng nk`) | What's the last sound in the picture? Pick its letter. | I |
| line-how-word | picture round with word runes (stages 6–9) | Which word goes with the picture? | I |
| q-door-words | phrase door, when he waits | What do the words say? Bring the right key. · Read the words, and pick a key. · Which key goes with the words? | I warmly |
| q-draw-word | drawing a whole word (from stage 2), when he waits; then the word | Write the word: · Can you write: · Now write the whole word: | I warmly |
| q-draw-big | capitals (after stage 3): at the start of a capital round (after the word) and when he waits; then the sound | Now write the big letter for: | I warmly |
| intro-sound | a new unit's introduction; then its sound and a picture word | Here's a new sound: · Listen to this new sound: · A new sound: | I playful |
| intro-team | the first two-letter unit (stage 4); then the unit | These two letters make one sound together: | I warmly |
| intro-blend | stage 5; then a blend | Say each sound, then push them together: | I warmly |
| intro-magic-e | stage 6, the first silent e | This is a magic e. It doesn't make a sound, but it makes the other vowel say its name. | I playful → warmly |
| intro-ending | stage 7; then a word with its ending | An ending changes the word: | I warmly |
| intro-second | a second reading (oo₂, ow₂, ea₂, th₂, -s₂, -ed₂, -ed₃, u_e₂); then the unit's new sound | These letters can make another sound too: | I warmly |
| intro-heart | a new heart word; then the word | This is a heart word. We learn it by heart: | I warmly |
| explain-letter | look-alike explanation; then a letter name and its sound | This is the letter: | I warmly |
| demo-spell | first spell book | Listen to the word, and put a sound in each box. | I warmly |
| demo-spell-write | the first written word (stage 4 on) | Now write the word yourself, one letter in each box. | I warmly |
| q-spell | spell book, when he waits; then the word | Spell the word: · Let's spell: · Make the word: | I warmly |
| spell-near | stage 9 near miss (`ee`/`ea`), forgiven once | That sounds right, but this word uses the other one. | I encouraging |

`spell-near` does not name the letters (the design's "spelled with …" would need letter names after it): the other
spelling's tile glows while the line plays. The "heart word" and "magic e" names are the ones US classrooms use.

**Line totals:** 74 + 27 + 13 + 25 = **139 texts**, 0 girl forms. A native reviewer (a person, or a model told to act
as a US kindergarten teacher) checks each line in its sequence before generation (rule). Sequences to read aloud as a
whole, at least: tower picture round (new monster → how-A → tap → unit sound → word); broom start (demo-broom-sound →
sound); cauldron miss (right tile glows → word → every second miss: explain-lead → slow word → word); door wait (q-door, then
no word); spell book (demo-spell → word → each drop's unit sound → word); merchant first visit (m-hello → D1–D4).

### 3.6 Voice settings, screening and pacing

| Kind | Request text (Gemini TTS, voice Puck) | Candidates | To the parent |
|---|---|---|---|
| Sound unit | `[phonics sound only, not the letter name, said once] mmm` and `[phonics sound: the short vowel in "cat"; not the letter name] aa` | 2 directions + a cut where it helps | the best 1–2 that pass |
| Letter name | `[clearly, the letter name] B` | 2 | 1–2 |
| Word, picture-only word, heart word | `[warm, clear] fish` | 1 (a second only if the screen fails it) | 1 (sample review) |
| Door phrase | `[warm, clear] a big duck` | 1 | 1 |
| Nonsense word | `[one made-up word, read as a word that rhymes with map, not spelled out] vap` | 1 | 1 |
| Slow word (hint) | none: the unit sounds, then the word take (3.4) | — | — |
| Instruction / content line | `[warmly, to a 7-year-old] …` | 2 | the best 1–2 |
| Dramatic line | `[excited, to a 7-year-old] …` | 2 | the best 1–2 |
| Merchant | his voice, `[playful, a friendly market trader] …` | 2 | the best 1–2 |

**Screening** (the parent: "why did you give it to me for review?" about a take my own check had failed; only takes that
pass reach him):
1. **Trim.** Every Gemini TTS clip ends with a full-scale glitch after a short silence; cut it, and the silence at both
   ends (host-local `screen3.py`: a last short segment near the end, after a gap, with a peak above 0.85).
2. **Measure:** length and voiced bursts (a sound: 1 burst; a stop sound about 0.2 s; a vowel or held sound at most about
   0.3 s: the parent found 0.5 s "too prolonged").
3. **Open listener:** a model hears the clip with no expected answer: what is said, how many syllables, any letter name,
   an "uh" after a consonant, smooth or broken.
4. **Vowel check** for vowel sounds: which of `cat, cot, cut, kit, get, kite, coat` has the same vowel.
5. **Leak check:** the transcript must not hold words of the direction (2 of 9 word tests said "warmly and clearly").
The listener is unsure on lone stop sounds (t heard as t, p or "kuh" across runs): those go to the parent with a note.

**Pacing.** The interactive Gemini TTS endpoint answered 429 (quota) after a few parallel calls; about one call in 7 s
works (about 500 an hour). For the bulk, use the Batch API (`batchGenerateContent` is listed for
`gemini-3.8-flash-tts`; the pictures' batch of 108 finished in under an hour), then screen, then retake the failures
interactively. Speech plays at 1.15× in the game (rule), no slow words (the hint plays the unit sounds, then the word).

### 3.7 Sound totals

| Kind | Items | Requests | To review |
|---|---|---|---|
| Sound recordings | 47 (8 done or in review) | about 120 (39 × 3) | 1–2 each |
| Letter names | 8 | 16 | 1–2 each |
| Real words | 313 | 313 | a sample + all flagged |
| Picture-only words | 38 | 38 | a sample + all flagged |
| Heart words | 33 | 33 | all |
| Door phrases | 18 | 18 | all |
| Nonsense words | 102 (8 approved) | 94 | all |
| Slow words | 0 | none (the hint plays unit sounds, then the word) | — |
| Voice lines | 139 (5 approved) | about 270 (2 each) | the best 1–2 each |
| Merchant voice audition | 4 voices | 8 | all |
| **Total** | **about 1,100 items** | **about 910 requests**, plus about 25 % retakes | |

Sound effects and music: the Hebrew run's, unchanged.

---

## Part 4 — Order of generation and review

### 4.1 What is done (2026-11-17)

1. **Recolour**: the 31 files, approved.
2. **Pictures**: 107 + the spell book made and reviewed; 91 kept, 16 dropped, 19 redrawn (2.3).
3. **Voice tests**:
   - Test 1, ElevenLabs Will (v4), 144 clips: doubled-letter spellings read as letter names, nonsense words became real
     words ("vape"), stretched blends broke or moaned. The parent: "the audio is garbage".
   - Test 2, ElevenLabs IPA phoneme tags (flash/turbo v2): tags ignored. Never shown to the parent (it failed the screen).
   - Test 3, Gemini TTS Puck with bracket directions: 28 takes passed the screen. The parent approved the voice ("puck
     voice is great"), all 8 nonsense words, the sounds m, s, sh, o, t, b, i, and the test words and lines. Short a was
     "too prolonged"; the stretched blends "sound weird".
   - Now in review: short a cut to 0.22 / 0.30 s, and six slow words at 0.5× (his method).

### 4.2 Next, in this order

1. The parent decides short a (the slow words are decided: units then word, 2026-11-20).
2. **The merchant's voice**: 4 Gemini voices × 2 lines (3.5); the parent picks.
3. **Stage 1 batch**: the stage-1 sounds still to make (p, f, n); 24 words, 13 picture-only words, 4 heart words, 12
   nonsense words; **all 139 lines** (every screen opens at stage 1 except the ghosts); the stage-1
   placement words. Batch request, screen, then the review page.
4. **Stages 2–9**, one batch per stage, in the order the game needs them (rule), each reviewed before the next is heard
   (generation can run ahead: rule "do not stop work while a review is open"). Stage 2 adds the letter names b d p n u,
   stage 3 m w h; stage 4 `th₂` and the stage-4 phrases; stage 6 `u_e₂`; stage 7 `-s₂ -ed₂ -ed₃`; stage 9 `oo₂ ow₂ ea₂`.
No bulk audio before the parent says so.

### 4.3 The review page

The alef review kit (one server for all games). The builder writes
`manifest.json` (items and takes), `checks.json` (the screen's results by file) and `focus.json` (the "Check:" line of
each item that needs him); the kit's log holds his decisions, and agents answer, retire and withdraw through its CLI,
never by editing a decision file. Sections per stage and kind. Pictures show their word only on hover or tap. Each take's
label names the model and voice ("Gemini 3.8 Flash TTS · Puck · trimmed"). One take: real words, picture-only words,
heart words, phrases, nonsense words. Up to two: sounds, letter names, lines. New takes only for an item he rejects; the
current pick stays the first option (rule).

---

## Part 5 — Totals and cost

### 5.1 Images (spent)

| Item | Images | Route | Cost |
|---|---|---|---|
| 107 pictures + the spell book, 1 take | 108 | Batch API (half price) | about $2.1 |
| Redraws after the first review, 20 × 2 | 40 | Batch API | about $0.8 |
| Retakes for leftover magenta, and cats and sled after the second review | 8 | interactive | about $0.3 |
| **Total** | **156** | | **about $3.3 of the $10 cap** |

### 5.2 Voice (to spend)

Gemini TTS bills audio output tokens (about 25 per second of speech; the tests used about 46 tokens per short clip,
including silence and the end glitch).

| Kind | Requests | Seconds each | Output tokens |
|---|---|---|---|
| Sounds, letter names | about 136 | 0.5–1.5 | about 6,000 |
| Words, heart words, picture-only words, phrases, nonsense | about 500 | 1–2 | about 23,000 |
| Lines and the merchant audition | about 280 | 3–5 | about 28,000 |
| Retakes (about 25 %) | about 230 | | about 14,000 |
| **Total** | **about 1,150** | | **about 71,000** |

Cost = 71,000 / 1,000,000 × P_tok (the price per million audio output tokens), halved on the Batch API. At $10, $20 or $40
per million: about $0.70, $1.40 or $2.80 (half on batch). The listener screen adds about 1,500 short audio-input calls to a
flash model: cents. Spent so far on voice: 314 ElevenLabs credits (tests 1–2) and well under $0.10 of Gemini TTS.

### 5.3 Assumptions

- P_tok for `gemini-3.8-flash-tts` is not known here: check the price page before the stage-1 batch. Even at four times
  the estimate, the voice stays under $12.
- About 25 % of requests fail the screen and are made again (the tests: 2 of 9 words leaked a direction, 4 of 16 sounds
  failed).
- There are no slow words: the hint plays the unit sounds, then the word (2026-11-20).
- The merchant's second Gemini voice costs the same as Puck.

---

## Part 6 — Open questions for the parent, and calls made here

### 6.1 Open questions (each changes what is made)

Answered: the image route and budget (Flash, Batch API, 1 take, $10 cap), the word list size (keep it), phrase doors
(the noun's picture only), the voice (Puck), the hint's slow word (half speed, pitch kept). Still open:
1. **Short a** (in review now; the slow words are decided: units then word, 2026-11-20).
2. **The merchant's voice**: Algenib, Gacrux, Umbriel or Sadachbia (3.5).
3. **Words for a child in Israel** (1.18): keep or replace snow, stamp, barn, igloo?
4. **The Hebrew spell book** (design Part 7): in this build? If yes, the same sprite serves, and the Hebrew lines
   `demo-spell`, `q-spell` (3) and their girl forms are added (about 8 Hebrew texts).

### 6.2 Calls made here (not confirmed by the parent)

- Second readings beyond the design's list: `th` /θ/ first and /ð/ second; `u_e` /uː/ first and /juː/ second; `-s` /s/
  first and /z/ second; `-ed` /t/, then /d/, then /ɪd/. Each second reading is its own item, later in its stage.
- `no` is a heart word (stage 2), so the ghosts can use `on · no`.
- Units with one picture or none (`i`, `u`, `qu`, `o`, `y`, `g`, `nk`; `th`, `ff`, `zz`, `th₂`, `er`) are asked by sound and
  in word rounds; no weak picture is forced on them.
- Pictures rejected: soccer ball, eye, island, the "shh" face, rose (he may say "flower"), and the octopus (the tower has
  an octopus monster).
- The design's nonsense examples `bod` (slang) replaced, and nonsense words that sound like real words (`taip` "tape",
  `grane` "grain", `birp` "burp", `kog` "cog") or are close to a heart word (`clom`, `jome` "come") dropped. No nonsense word
  uses `oo ow ea`.
- Stage 7 has 6 nonsense words with endings, for the placement's name rounds.
- In stage 5 a ladder rung may add or remove one consonant (`lip → slip`).
- Placement choices that differ only in a unit of the stage: the design's `vap · vip · map` became `vap · zap · lap`.
- The spell book shows its picture in stages 1–3 only.
- Nonsense words blend the same way (the hint reads the tower's name runes): unit sounds, then the word.
- No girl forms in English (a girl is a "wizard" too, as the design says).
- `spell-near` does not name letters; the other spelling's tile glows instead.
- The crystals are recoloured (the parent approved all recolours, 2026-11-17).
- The spell book sprite uses the test's brown leather book, so it needs no recolour and serves a Hebrew spell book too.
- Word swaps for a child in Israel (1.18): sled, skunk, cane, cork, coal replaced.

### 6.3 For the builder

- A script checks every word, chain, set, round and phrase in Part 1: units only of the stage or below, every on-screen
  word in a list, no chain asks a word twice, nonsense not in a dictionary and not a homophone of a word in one.
- Gemini TTS gives no character timestamps. The hint no longer needs them: each unit lights from the start of its own
  sound clip (2026-11-20).
- Keep the screen strict: the parent sees only takes that pass it.
- The first duel's tower lines: confirm which ones the run's tower still plays (13 are drafted).
