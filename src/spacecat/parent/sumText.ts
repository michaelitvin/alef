// An item id as the parent reads it: a sum `3 + ◌ = 7` (the ring in the missing place), the same number added
// `3 + 3 + 3 = ◌`, a comparison `7 ◌ 5` and a jump row `5, 10, 15, ◌`. No game module: the light parent index uses it too.
const OPS: Record<string, string> = { '+': '+', '-': '−', x: '×', '/': '÷' }

export function sumText(id: string): string {
  const t = /^(\d+)\+(\d+)\+(\d+)=(\d+)\/c$/.exec(id)
  if (t) return `${t[1]} + ${t[2]} + ${t[3]} = ◌`
  const c = /^(\d+)\?(\d+)$/.exec(id)
  if (c) return `${c[1]} ◌ ${c[2]}`
  if (/^(\d+|_)(,(\d+|_)){3}$/.test(id) && id.includes('_')) return id.split(',').map((n) => (n === '_' ? '◌' : n)).join(', ')
  const m = /^(\d+)([-+x/])(\d+)=(\d+)\/([abc])$/.exec(id)
  if (!m) return id
  const [, a, op, b, r, hole] = m
  const at = (h: string, v: string) => (hole === h ? '◌' : v)
  return `${at('a', a)} ${OPS[op]} ${at('b', b)} = ${at('c', r)}`
}
