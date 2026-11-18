// An item id (`3+4=7/b`) as the parent reads it: `3 + ◌ = 7` (the ring in the missing place). No game module: the light
// parent index uses it too.
const OPS: Record<string, string> = { '+': '+', '-': '−', x: '×', '/': '÷' }

export function sumText(id: string): string {
  const m = /^(\d+)([-+x/])(\d+)=(\d+)\/([abc])$/.exec(id)
  if (!m) return id
  const [, a, op, b, c, hole] = m
  const at = (h: string, v: string) => (hole === h ? '◌' : v)
  return `${at('a', a)} ${OPS[op]} ${at('b', b)} = ${at('c', c)}`
}
