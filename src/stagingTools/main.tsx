import '../shared/stagingStorage' // first: like every entry point (entryPoints.test.ts)
import { renderStagingTools } from './page'

renderStagingTools(document, import.meta.env.BASE_URL)
