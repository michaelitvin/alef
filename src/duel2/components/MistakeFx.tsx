// A wrong answer is a dramatic moment (Michael): the screen shakes and flashes red once; the wrong choice bursts.
// A missed target (it flew past in another lane) is not a crash: a soft flash, no shake.
export function MistakeFx({ active, kind = 'hit' }: { active: boolean; kind?: 'hit' | 'miss' }) {
  if (!active) return null
  return <div className={kind === 'miss' ? 'd2-flash-miss' : 'd2-flash-red'} aria-hidden />
}
