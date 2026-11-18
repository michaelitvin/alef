// The word lists of the nine stages (asset plan Part 1, 1.3–1.17, after the 1.18 swaps), the look-alike sets,
// the ladder chains: transcribed, and checked by content.test.ts. Erasable TypeScript: Node loads it as it is.
//
// Row format of the real and nonsense tables (one word per line):  text | units | uses | flags
//   units  = sound unit ids in reading order, a magic e is one unit ('c a_e k'), a second reading 'oo:2'
//   uses   = the asset plan's codes ('Tl:m' = the plan's "Tl m", 'S-pic' = its "S·pic"), a space between
//   flags  = 'pic' (the word has a picture; its image key is the word) and the stage-5 blend patterns ('st-', '-mp')

export type WordKind = 'real' | 'picture-only' | 'heart' | 'nonsense'

export interface EnWord {
  id: string
  text: string
  kind: WordKind
  stage: number
  /** unit ids in reading order; 'c a_e k' for cake (the magic e is one unit) */
  units: string[]
  /** stage-5 patterns in the word */
  blends?: string[]
  /** image key; left out when the picture was dropped in review */
  picture?: string
  /** the asset plan's codes, written as there: 'Tl:m', 'Tw', 'D', 'P★', 'Pd', 'L1', 'G', 'C6', 'S-pic' */
  uses: string[]
}

const split = (s: string): string[] => s.split(/\s+/).filter(Boolean)

const parse = (kind: 'real' | 'nonsense', stage: number, table: string): EnWord[] =>
  table
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cells = line.split('|').map((c) => c.trim())
      if (cells.length !== 4) throw new Error(`bad word row "${line}"`)
      const [text, units, uses, flags] = cells
      const flag = split(flags)
      const blends = flag.filter((f) => f !== 'pic')
      return {
        id: text,
        text,
        kind,
        stage,
        units: split(units),
        ...(blends.length ? { blends } : {}),
        ...(flag.includes('pic') ? { picture: text } : {}),
        uses: split(uses),
      }
    })

const pictureOnly = (stage: number, table: string): EnWord[] =>
  split(table).map((entry) => {
    const [text, unitId] = entry.split(':')
    return { id: text, text, kind: 'picture-only' as const, stage, units: [], picture: text, uses: [`Tl:${unitId}`] }
  })

const hearts = (stage: number, list: string): EnWord[] =>
  split(list).map((text) => ({ id: text, text, kind: 'heart' as const, stage, units: [], uses: [] }))

const REAL: EnWord[] = [
  ...parse('real', 1, `
am | a m | Dp |
an | a n | |
at | a t | |
in | i n | |
it | i t | |
sat | s a t | L1 |
mat | m a t | Pd |
pat | p a t | |
tap | t a p | L2 L3 L4 |
map | m a p | Tl:m D S-pic P★ L2 | pic
nap | n a p | L3 |
man | m a n | Pd L2 |
pan | p a n | L3 L4 |
fan | f a n | Tl:f D S-pic P★ L1 L2 L4 | pic
tan | t a n | Pd L4 |
pin | p i n | L1 L3 L4 |
tin | t i n | L4 |
fin | f i n | Pd L1 L2 |
sit | s i t | L1 L3 |
pit | p i t | G L1 |
fit | f i t | L1 |
tip | t i p | G L2 L3 L4 |
sip | s i p | L3 |
nip | n i p | G |
`),
  ...parse('real', 2, `
on | o n | G |
up | u p | |
not | n o t | G |
dog | d o g | Tl:d D S-pic P★ L1 | pic
dig | d i g | G Pd |
dot | d o t | Pd L1 |
cup | c u p | Tl:c D S-pic P★ | pic
cap | c a p | Pd C6 L3 L4 |
cat | c a t | Tl:c D S-pic Pd L4 | pic
bug | b u g | D S-pic L2 | pic
bus | b u s | Tl:b D S-pic | pic
bad | b a d | Pd L2 |
bag | b a g | D S-pic L2 | pic
big | b i g | G L3 Dp |
bed | b e d | Tl:b D S-pic P★ L2 | pic
beg | b e g | L2 |
pen | p e n | L3 |
ten | t e n | G Pd L4 |
net | n e t | Tl:n D S-pic G | pic
gum | g u m | G |
mug | m u g | G |
tub | t u b | L4 |
sun | s u n | Tl:s D S-pic | pic
nut | n u t | G |
mop | m o p | L4 |
pot | p o t | D S-pic G L1 L2 | pic
top | t o p | G L2 L4 |
pig | p i g | Tl:p D S-pic G L3 | pic
`),
  ...parse('real', 3, `
kid | k i d | |
kit | k i t | C6 Pd L2 |
hat | h a t | Tl:h D S-pic P★ L2 | pic
hot | h o t | G L2 |
hut | h u t | G |
hop | h o p | C6 L2 L3 |
hip | h i p | G L4 |
red | r e d | Dp |
rug | r u g | |
leg | l e g | |
let | l e t | L3 |
lip | l i p | L1 L4 |
lot | l o t | L3 |
log | l o g | Tl:l D S-pic P★ L3 | pic
lap | l a p | L4 |
web | w e b | L3 |
wet | w e t | L3 Dp |
wig | w i g | |
jam | j a m | |
jet | j e t | |
yes | y e s | |
fox | f o x | Tl:x D S-pic P★ L1 | pic
box | b o x | Tl:x D S-pic Pd | pic
fix | f i x | L1 |
ax | a x | Tl:x D | pic
quiz | qu i z | |
van | v a n | L1 |
zip | z i p | L4 |
zap | z a p | L4 |
`),
  ...parse('real', 4, `
duck | d u ck | Tl:ck D P★ Pd L2 Dp | pic
luck | l u ck | L2 |
lock | l o ck | L2 |
sock | s o ck | Tl:s Tl:ck D L2 Dp | pic
kick | k i ck | L2 |
pick | p i ck | L3 |
chick | ch i ck | Tl:ch Tl:ck D | pic
off | o ff | |
puff | p u ff | |
bell | b e ll | Tl:ll D L4 | pic
well | w e ll | L4 |
will | w i ll | L4 |
fill | f i ll | Pd L4 |
doll | d o ll | Tl:ll D | pic
kiss | k i ss | |
buzz | b u zz | |
ship | sh i p | B Pd L1 |
shop | sh o p | B L1 |
chop | ch o p | L1 |
chip | ch i p | B L1 |
shell | sh e ll | D | pic
fish | f i sh | Tl:f D P★ L3 Dp | pic
wish | w i sh | L3 |
thin | th i n | |
bath | b a th | |
this | th:2 i s | |
that | th:2 a t | |
when | wh e n | |
whip | wh i p | |
ring | r i ng | Tl:r Tl:ng D P★ | pic
sing | s i ng | L3 |
king | k i ng | Tl:k Tl:ng D L3 | pic
sink | s i nk | Tl:nk D L3 | pic
pink | p i nk | L3 |
`),
  ...parse('real', 5, `
stop | s t o p | G | st-
spot | s p o t | G L2 | sp-
spit | s p i t | L2 | sp-
spin | s p i n | L2 | sp-
snap | s n a p | L1 | sn-
snack | s n a ck | L1 | sn-
slip | s l i p | L1 | sl-
slap | s l a p | L1 | sl-
slug | s l u g | | sl-
slid | s l i d | C6 | sl-
smell | s m e ll | | sm-
swim | s w i m | | sw-
swing | s w i ng | Tl:ng D | sw- pic
frog | f r o g | D P★ Dp | fr- pic
flag | f l a g | D | fl- pic
flip | f l i p | L3 | fl-
truck | t r u ck | | tr-
crab | c r a b | D Dp | cr- pic
drum | d r u m | Tl:d D P★ Dp | dr- pic
dress | d r e ss | Tl:ss D | dr- pic
brick | b r i ck | | br-
grass | g r a ss | Tl:ss D | gr- pic
plum | p l u m | | pl-
clap | c l a p | L3 | cl-
clip | c l i p | L3 | cl-
clock | c l o ck | Tl:ck D | cl- pic
black | b l a ck | | bl-
glad | g l a d | | gl-
tent | t e n t | Tl:t D P★ L4 | -nt pic
bent | b e n t | L4 | -nt
best | b e s t | L4 | -st
nest | n e s t | L4 | -st
pond | p o n d | | -nd
jump | j u m p | L1 | -mp
lamp | l a m p | D | -mp pic
stamp | s t a m p | | st- -mp
desk | d e s k | | -sk
left | l e f t | | -ft
milk | m i l k | D | -lk pic
skip | s k i p | | sk-
`),
  ...parse('real', 6, `
cake | c a_e k | D Dp | pic
make | m a_e k | |
name | n a_e m | |
game | g a_e m | |
tape | t a_e p | C6 |
cape | c a_e p | C6 |
pine | p i_e n | L1 |
lime | l i_e m | L1 |
cone | c o_e n | D | pic
bone | b o_e n | D P★ Dp | pic
wave | w a_e v | |
snake | s n a_e k | D P★ Dp | pic
whale | wh a_e l | Tl:wh D | pic
white | wh i_e t | Dp |
bike | b i_e k | D L2 | pic
kite | k i_e t | Tl:k D P★ C6 L2 | pic
time | t i_e m | L1 |
line | l i_e n | L1 |
ride | r i_e d | |
like | l i_e k | L2 |
bite | b i_e t | L2 |
smile | s m i_e l | |
slide | s l i_e d | D C6 | pic
home | h o_e m | L3 |
hole | h o_e l | L3 |
hope | h o_e p | C6 L3 |
rope | r o_e p | D | pic
note | n o_e t | C6 |
globe | g l o_e b | D | pic
cube | c u_e:2 b | |
cute | c u_e:2 t | |
tube | t u_e b | L4 |
tune | t u_e n | L4 |
rule | r u_e l | |
`),
  ...parse('real', 7, `
cats | c a t -s | Tw P★ L4 Dp | pic
hats | h a t -s | L4 |
cups | c u p -s | |
ducks | d u ck -s | Tw P★ | pic
boxes | b o x -es | Tw P★ Dp | pic
foxes | f o x -es | |
dishes | d i sh -es | |
wishes | w i sh -es | L3 |
jumps | j u m p -s | L1 |
jumped | j u m p -ed | L1 |
bumped | b u m p -ed | L1 |
jumping | j u m p -ing | |
kicks | k i ck -s | L2 |
kicked | k i ck -ed | L2 |
licked | l i ck -ed | L2 |
licking | l i ck -ing | L2 |
kicking | k i ck -ing | |
fishing | f i sh -ing | D Dp | pic
wished | w i sh -ed | L3 |
wishing | w i sh -ing | L3 |
helped | h e l p -ed | |
singing | s i ng -ing | |
bells | b e ll -s:2 | Tw | pic
dogs | d o g -s:2 | |
pigs | p i g -s:2 | |
filled | f i ll -ed:2 | |
yelled | y e ll -ed:2 | |
landed | l a n d -ed:3 | |
melted | m e l t -ed:3 | |
rested | r e s t -ed:3 | |
`),
  ...parse('real', 8, `
car | c ar | D P★ L1 Dp | pic
jar | j ar | Tl:j D | pic
star | s t ar | |
park | p ar k | |
barn | b ar n | D L3 Dp | pic
yarn | y ar n | |
farm | f ar m | L1 |
harm | h ar m | L1 |
hard | h ar d | L1 |
card | c ar d | L1 |
arm | ar m | |
shark | sh ar k | Tl:sh D | pic
for | f or | L2 |
fork | f or k | D P★ L2 | pic
fort | f or t | L2 |
corn | c or n | D | pic
born | b or n | L3 |
short | sh or t | L4 |
sort | s or t | L2 L4 |
sport | s p or t | L2 L4 |
her | h er | |
under | u n d er | |
sister | s i s t er | |
winter | w i n t er | |
bird | b ir d | D P★ | pic
girl | g ir l | D | pic
first | f ir s t | |
shirt | sh ir t | Tl:sh D L4 | pic
skirt | s k ir t | D Dp | pic
fur | f ur | |
burn | b ur n | L3 |
turn | t ur n | L3 |
hurt | h ur t | |
`),
  ...parse('real', 9, `
rain | r ai n | |
train | t r ai n | D | pic
snail | s n ai l | D | pic
paint | p ai n t | |
day | d ay | L2 |
pay | p ay | L2 |
say | s ay | L2 |
stay | s t ay | L2 |
play | p l ay | |
bee | b ee | D | pic
tree | t r ee | D Dp | pic
feet | f ee t | D | pic
sheep | sh ee p | Tl:sh D P★ Dp | pic
green | g r ee n | Dp |
queen | qu ee n | Tl:qu D | pic
wheel | wh ee l | Tl:wh D | pic
teeth | t ee th | |
eat | ea t | |
leaf | l ea f | D | pic
seal | s ea l | D | pic
boat | b oa t | D P★ L1 Dp | pic
coat | c oa t | L1 |
goat | g oa t | L1 |
goal | g oa l | L1 |
soap | s oa p | D | pic
snow | s n ow | |
grow | g r ow | |
bowl | b ow l | D | pic
night | n igh t | L3 |
light | l igh t | L3 |
right | r igh t | L3 |
fight | f igh t | L3 |
high | h igh | |
moon | m oo n | D P★ | pic
spoon | s p oo n | D | pic
food | f oo d | |
boot | b oo t | |
cool | c oo l | |
out | ou t | |
cloud | c l ou d | D | pic
mouth | m ou th | |
oil | oi l | |
coin | c oi n | |
point | p oi n t | |
boy | b oy | D L4 | pic
toy | t oy | L4 Dp |
joy | j oy | L4 |
saw | s aw | D G | pic
paw | p aw | D | pic
draw | d r aw | |
claw | c l aw | |
book | b oo:2 k | Tl:b D | pic
look | l oo:2 k | |
foot | f oo:2 t | |
good | g oo:2 d | |
cow | c ow:2 | D | pic
down | d ow:2 n | |
owl | ow:2 l | D | pic
crown | c r ow:2 n | D | pic
bread | b r ea:2 d | D | pic
head | h ea:2 d | |
`),
]

const PICTURE_ONLY: EnWord[] = [
  ...pictureOnly(1, 'apple:a ant:a astronaut:a monkey:m mouse:m strawberry:s tiger:t turtle:t pencil:p pineapple:p fire:f igloo:i nose:n'),
  ...pictureOnly(2, 'ostrich:o door:d camel:c carrot:c cookie:c umbrella:u guitar:g banana:b butterfly:b egg:e elephant:e'),
  ...pictureOnly(3, 'horse:h house:h robot:r rocket:r lion:l lemon:l watermelon:w worm:w jellyfish:j yo-yo:y volcano:v zebra:z zipper:z'),
  ...pictureOnly(4, 'cheese:ch'),
]

const HEART: EnWord[] = [
  ...hearts(1, 'the a is'),
  ...hearts(2, 'to do of no'),
  ...hearts(3, 'was you he we'),
  ...hearts(4, 'I she they what have'),
  ...hearts(5, 'said there where come'),
  ...hearts(6, 'some one put give'),
  ...hearts(7, 'my want does'),
  ...hearts(8, 'were your four'),
  ...hearts(9, 'who could would'),
]

const NONSENSE: EnWord[] = [
  ...parse('nonsense', 1, `
tam | t a m | |
nif | n i f | |
pim | p i m | |
mip | m i p | |
tif | t i f | |
fim | f i m | |
mif | m i f | |
pif | p i f | |
sif | s i f | |
taf | t a f | |
fip | f i p | |
naf | n a f | |
`),
  ...parse('nonsense', 2, `
fod | f o d | |
pob | p o b | |
gub | g u b | |
cug | c u g | |
bem | b e m | |
gom | g o m | |
mub | m u b | |
bup | b u p | |
cuf | c u f | |
suf | s u f | |
pem | p e m | |
gid | g i d | |
`),
  ...parse('nonsense', 3, `
vap | v a p | |
zim | z i m | |
jex | j e x | |
kep | k e p | |
lom | l o m | |
hux | h u x | |
zab | z a b | |
quab | qu a b | |
yeb | y e b | |
rel | r e l | |
vum | v u m | |
lix | l i x | |
`),
  ...parse('nonsense', 4, `
chim | ch i m | |
shap | sh a p | |
thog | th o g | |
fesh | f e sh | |
chob | ch o b | |
shom | sh o m | |
thip | th i p | |
wheck | wh e ck | |
lenk | l e nk | |
jish | j i sh | |
zoss | z o ss | |
rull | r u ll | |
`),
  ...parse('nonsense', 5, `
sluk | s l u k | | sl-
fron | f r o n | | fr-
trob | t r o b | | tr-
clim | c l i m | | cl-
plog | p l o g | | pl-
snet | s n e t | | sn-
smub | s m u b | | sm-
gromp | g r o m p | | gr- -mp
flisk | f l i s k | | fl- -sk
dreb | d r e b | | dr-
nolk | n o l k | | -lk
bresk | b r e s k | | br- -sk
`),
  ...parse('nonsense', 6, `
pove | p o_e v | |
dape | d a_e p | |
fime | f i_e m | |
lote | l o_e t | |
sabe | s a_e b | |
rike | r i_e k | |
grabe | g r a_e b | |
flobe | f l o_e b | |
kume | k u_e m | |
vope | v o_e p | |
bline | b l i_e n | |
jabe | j a_e b | |
`),
  ...parse('nonsense', 7, `
gromps | g r o m p -s | |
gromping | g r o m p -ing | |
gromped | g r o m p -ed | |
jishes | j i sh -es | |
nolking | n o l k -ing | |
nolked | n o l k -ed | |
`),
  ...parse('nonsense', 8, `
zarn | z ar n | |
plorn | p l or n | |
virp | v ir p | |
murt | m ur t | |
ferp | f er p | |
gurd | g ur d | |
torb | t or b | |
charp | ch ar p | |
nirt | n ir t | |
verm | v er m | |
skurn | s k ur n | |
jart | j ar t | |
`),
  ...parse('nonsense', 9, `
voam | v oa m | |
baip | b ai p | |
feeb | f ee b | |
sloy | s l oy | |
zigh | z igh | |
broid | b r oi d | |
glay | g l ay | |
noaf | n oa f | |
zoud | z ou d | |
jawp | j aw p | |
dreeb | d r ee b | |
snigh | s n igh | |
`),
]

export const WORDS: EnWord[] = [...HEART, ...REAL, ...PICTURE_ONLY, ...NONSENSE]

const BY_ID = new Map(WORDS.map((w) => [w.id, w]))

export const word = (id: string): EnWord => {
  const found = BY_ID.get(id)
  if (!found) throw new Error(`no English word "${id}"`)
  return found
}
