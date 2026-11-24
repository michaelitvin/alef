// The staging tools page (staging-tools/): the special staging routes in one place, for the parent. No page links to
// it, so a parent types its URL. It only links to the home page with a query; the routes themselves are in
// shared/stagingStorage.ts, and each one asks before it does anything. Only the staging build has this page
// (vite.config.ts). Plain DOM and English text: the page is for the parent.
import { isStaging } from '../shared/stagingStorage'

export interface StagingTool { query: string; title: string; text: string; danger?: boolean }

export const STAGING_TOOLS: readonly StagingTool[] = [
  { query: 'copy-prod', title: 'Copy the real game into staging', text: 'Replaces all staging saves with a copy of the child’s real saves. The real game is only read. The logs are not copied.' },
  { query: 'export-prod', title: 'Download the real game’s data', text: 'Downloads one JSON file with all the child’s real saves and logs. Nothing changes.' },
  { query: 'migrate-check', title: 'Check the save migration', text: 'Runs the save migration on a copy of the child’s real saves and logs, and shows PASS or FAIL with two downloads. The real game is only read.' },
  { query: 'copy-to-prod', danger: true, title: 'Copy staging into the real game', text: 'Replaces the child’s real saves with a copy of the staging saves. A copy of the real saves and logs downloads first. The logs on both sides stay as they are. It refuses when the real game has not run the save migrations that staging ran (release first).' },
]

export function renderStagingTools(doc: Document, base: string, staging: boolean = isStaging): void {
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, style?: Partial<CSSStyleDeclaration>) => {
    const e = doc.createElement(tag)
    if (text !== undefined) e.textContent = text
    if (style) Object.assign(e.style, style)
    return e
  }
  const root = el('main', undefined, { fontFamily: 'system-ui, sans-serif', padding: '16px', maxWidth: '720px', margin: '0 auto' })
  root.appendChild(el('h1', 'Staging tools'))
  if (!staging) {
    root.appendChild(el('p', 'These tools work only on staging.'))
  } else {
    for (const t of STAGING_TOOLS) {
      const box = el('section', undefined, { border: `2px solid ${t.danger ? '#b42318' : '#ccc'}`, borderRadius: '12px', padding: '12px 16px', margin: '16px 0' })
      box.appendChild(el('h2', t.title, { fontSize: '20px', margin: '0 0 8px', color: t.danger ? '#b42318' : '' }))
      box.appendChild(el('p', t.text, { margin: '0 0 12px' }))
      const a = el('a', `Open ?${t.query}`, { display: 'inline-block', padding: '10px 16px', borderRadius: '8px', background: t.danger ? '#b42318' : '#1f6feb', color: '#fff', textDecoration: 'none' })
      a.href = `${base}?${t.query}`
      a.setAttribute('data-staging-tool', t.query)
      box.appendChild(a)
      root.appendChild(box)
    }
  }
  doc.body.replaceChildren(root)
}
