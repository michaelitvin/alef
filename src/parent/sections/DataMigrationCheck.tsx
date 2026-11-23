// The Data section's migration check: the result of `?migrate-check` on staging (PASS or FAIL, one row per key, the date)
// and the state of the key migration on this page (a step that waits for space or has a conflict). Nothing shows on
// production, where there is no result and the migration is done. The parent area is behind the gate already.
import { readCheckResult, staleCheckResult, type CheckRow } from '../../shared/migrateCheck'
import { lastMigrationReport } from '../../shared/stagingStorage'

const yn = (v: boolean | null) => (v === null ? '-' : v ? 'yes' : 'NO')

/** what a step of the key migration that is not done means for the parent */
function waiting(): string[] {
  const out: string[] = []
  for (const s of lastMigrationReport()?.steps ?? []) {
    if (s.status === 'done') continue
    const what = s.id === 'tower-history' ? 'the tower’s old history' : 'Spell Quest’s old saves and history'
    const both = s.keys.filter((k) => k.status === 'conflict').map((k) => `${k.from} and ${k.to}`).join('; ')
    out.push(s.status === 'waiting-space' ? `${what} waits for space` : `${what}: an old and a new key differ, so both stay (${both})`)
  }
  return out
}

export function MigrationCheck() {
  const result = readCheckResult(window.localStorage)
  const notes = waiting()
  const older = !result && staleCheckResult(window.localStorage)
  if (!result && !older && notes.length === 0) return null
  const date = result ? new Date(result.at).toISOString().replace('T', ' ').slice(0, 16) : ''
  const verdict = result?.verdict === 'pass' ? 'PASS' : result?.verdict === 'fail' ? 'FAIL' : null
  return (
    <div data-migration-check>
      {result && (
        <p>
          <strong data-migration-verdict={result.verdict}>
            {verdict ? `Migration check: ${verdict}` : `Migration check: ${result.message ?? result.verdict}`}
          </strong>
          {verdict && result.message ? ` (${result.message})` : ''} <span data-migration-date>{date} UTC</span>
        </p>
      )}
      {result && result.rows.length > 0 && (
        <div className="pa-wide"><table data-migration-rows style={{ borderCollapse: 'collapse' }}>
          <thead><tr><th align="left">Key</th><th>moved</th><th>content equal</th><th>counts equal</th><th /></tr></thead>
          <tbody>
            {result.rows.map((r: CheckRow) => {
              const ok = r.moved !== false && r.content && r.counts !== false
              return (
                <tr key={r.key} data-migration-row={r.key} data-ok={ok}>
                  <td style={{ paddingRight: 16 }}>{r.key}</td>
                  <td style={{ paddingRight: 16 }}>{yn(r.moved)}</td>
                  <td style={{ paddingRight: 16 }}>{yn(r.content)}</td>
                  <td style={{ paddingRight: 16 }}>{yn(r.counts)}</td>
                  <td>{ok ? '' : `FAIL ${r.detail ?? ''}`}</td>
                </tr>
              )
            })}
          </tbody>
        </table></div>
      )}
      {older && <p data-migration-none>No migration check yet for this version. To run one, open staging with ?migrate-check.</p>}
      {notes.map((n) => <p key={n} data-migration-waiting>{n}</p>)}
    </div>
  )
}
