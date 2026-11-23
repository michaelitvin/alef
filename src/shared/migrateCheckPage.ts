// The end page of `?migrate-check` (staging only): shown when the check ends, before the app boots (the gate is still
// shut, so no store reads or writes). Plain DOM, no React, no store: the PASS or FAIL line, one row per key, and three big
// buttons: "Download before" (production's keys as the check copied them), "Download after" (the migrated keys) and
// "Continue" (the page without the query). The two snapshots live in memory only: about 2 MB of data next to a quota of
// about 2.5 MB leaves no room to store them. The files have the `?export-prod` format (with a `label`), so one tool reads
// all three. English text: the page is for the parent.
import type { CheckResult, CheckSnapshots } from './migrateCheck'

export interface SnapshotFile {
  v: 1
  kind: 'alef-prod-storage'
  exportedAt: string
  userAgent: string
  label: 'before' | 'after'
  keys: Record<string, string>
}

export const snapshotFile = (label: 'before' | 'after', keys: Record<string, string>, now: Date, userAgent: string): SnapshotFile =>
  ({ v: 1, kind: 'alef-prod-storage', exportedAt: now.toISOString(), userAgent, label, keys })
export const snapshotName = (label: 'before' | 'after', now: Date) => `alef-migrate-check-${label}-${now.toISOString().slice(0, 10)}.json`

const yn = (v: boolean | null) => (v === null ? '-' : v ? 'yes' : 'NO')

/** Replace the page's body with the end page. `onContinue` runs on "Continue". */
export function showCheckEnd(
  win: Window, result: CheckResult, snap: CheckSnapshots, onContinue: () => void,
  download: (json: string, filename: string) => void, now: () => Date = () => new Date(),
): void {
  const doc = win.document
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, style?: Partial<CSSStyleDeclaration>) => {
    const e = doc.createElement(tag)
    if (text !== undefined) e.textContent = text
    if (style) Object.assign(e.style, style)
    return e
  }
  const root = el('div', undefined, { fontFamily: 'system-ui, sans-serif', padding: '16px', direction: 'ltr', textAlign: 'left', maxWidth: '960px', margin: '0 auto' })
  root.setAttribute('data-migrate-check-end', '')
  const verdict = result.verdict === 'pass' ? 'PASS' : result.verdict === 'fail' ? 'FAIL' : result.verdict
  const head = el('h1', `Migration check: ${verdict}`, { fontSize: '28px', color: result.verdict === 'pass' ? '#1a7f37' : '#b42318' })
  head.setAttribute('data-migrate-check-verdict', result.verdict)
  root.appendChild(head)
  if (result.message) root.appendChild(el('p', result.message))

  if (result.rows.length) {
    const wrap = el('div', undefined, { overflowX: 'auto' })
    const table = el('table', undefined, { borderCollapse: 'collapse', fontSize: '15px' })
    const tr = el('tr')
    for (const h of ['Key', 'moved', 'content equal', 'counts equal', '']) tr.appendChild(el('th', h, { textAlign: 'left', padding: '4px 12px 4px 0' }))
    table.appendChild(tr)
    for (const r of result.rows) {
      const ok = r.moved !== false && r.content && r.counts !== false
      const row = el('tr')
      row.setAttribute('data-migrate-check-row', r.key)
      row.setAttribute('data-ok', String(ok))
      for (const c of [r.key, yn(r.moved), yn(r.content), yn(r.counts), ok ? '' : `FAIL ${r.detail ?? ''}`]) row.appendChild(el('td', c, { padding: '4px 12px 4px 0' }))
      table.appendChild(row)
    }
    wrap.appendChild(table)
    root.appendChild(wrap)
  }

  const buttons = el('div', undefined, { display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '24px' })
  const button = (label: string, id: string, onClick: () => void, enabled = true) => {
    const b = el('button', label, { minWidth: '200px', minHeight: '64px', fontSize: '20px', padding: '12px 20px', borderRadius: '12px' })
    b.setAttribute('data-migrate-check-button', id)
    b.disabled = !enabled
    b.addEventListener('click', onClick)
    buttons.appendChild(b)
  }
  const offer = (label: 'before' | 'after') => () => {
    const t = now()
    download(JSON.stringify(snapshotFile(label, snap[label] ?? {}, t, win.navigator.userAgent)), snapshotName(label, t))
  }
  button('Download before', 'before', offer('before'), !!snap.before)
  button('Download after', 'after', offer('after'), !!snap.after)
  button('Continue', 'continue', onContinue)
  root.appendChild(buttons)

  doc.body.replaceChildren(root)
}
