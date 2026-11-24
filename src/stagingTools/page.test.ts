// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { STAGING_TOOLS, renderStagingTools } from './page'

describe('staging tools page', () => {
  it('links every staging route to the home page with its query', () => {
    renderStagingTools(document, '/alef/staging/', true)
    const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-staging-tool]')]
    expect(links.map((a) => a.getAttribute('href'))).toEqual(STAGING_TOOLS.map((t) => `/alef/staging/?${t.query}`))
    expect(STAGING_TOOLS.map((t) => t.query)).toEqual(['copy-prod', 'export-prod', 'migrate-check', 'copy-to-prod'])
  })

  it('shows no route outside staging', () => {
    renderStagingTools(document, '/alef/', false)
    expect(document.querySelectorAll('[data-staging-tool]')).toHaveLength(0)
    expect(document.body.textContent).toContain('only on staging')
  })
})
