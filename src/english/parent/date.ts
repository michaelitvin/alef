// A date for the parent: his local day, as YYYY-MM-DD. A damaged save can hold any value, so it gives null, never throws.
export function localDate(at: unknown): string | null {
  if (typeof at !== 'number' || !Number.isFinite(at)) return null
  const d = new Date(at)
  if (!Number.isFinite(d.getTime())) return null
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
