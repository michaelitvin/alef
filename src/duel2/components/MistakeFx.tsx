// A wrong answer is a dramatic moment (Michael): the screen shakes and flashes red once; the wrong choice bursts.
export function MistakeFx({ active }: { active: boolean }) {
  if (!active) return null
  return <div className="d2-flash-red" aria-hidden />
}
