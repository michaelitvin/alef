// Boundary rules. Run with `npm run depcruise`. A known exception is an explicit allowed path with a comment, never a
// blanket exclude. Type-only imports are not followed (tsPreCompilationDeps is off), so `import type` is free.
const TEST = '\\.test\\.tsx?$'

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'No import cycles.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'logic-never-imports-ui',
      severity: 'error',
      comment: 'Pure logic must not import components or screens.',
      from: { path: '^src/(duel2/logic|clock/logic|utils/duel)/', pathNot: TEST },
      to: {
        path: ['^src/(duel2|clock)/(components|screens)/', '^src/components/'],
        // the one known exception has its own rule below
        pathNot: '^src/components/duel/Explosion\\.tsx$',
      },
    },
    {
      name: 'logic-known-exception-explosion',
      severity: 'error',
      comment: 'known: only utils/duel/flow.ts may import components/duel/Explosion, until Task 23 empties this.',
      from: { path: '^src/(duel2/logic|clock/logic|utils/duel)/', pathNot: ['^src/utils/duel/flow\\.ts$', TEST] },
      to: { path: '^src/components/duel/Explosion\\.tsx$' },
    },
    {
      name: 'shared-is-self-contained',
      severity: 'error',
      comment: 'src/shared must not import outside src/shared (tests excluded: rehydrateOnRestore.test.ts uses the progress store).',
      from: { path: '^src/shared/', pathNot: TEST },
      to: { path: '^src/', pathNot: '^src/shared/' },
    },
    {
      name: 'clock-not-into-duel2',
      severity: 'error',
      comment: 'The clock does not import Book 2, except the wizard pictures (known exception: src/duel2/assets/img/).',
      from: { path: '^src/clock/', pathNot: TEST },
      to: { path: '^src/duel2/', pathNot: '^src/duel2/assets/img/' },
    },
    {
      name: 'duel2-into-first-duel-only-through-its-surface',
      severity: 'error',
      comment:
        'Book 2 reaches the first duel only through its public surface. progressStore stays until Task 18 takes it out of the controller. ' +
        'components/home/StationPath is a known exception (Book 2 shows the home path wizard).',
      from: { path: '^src/duel2/', pathNot: TEST },
      to: {
        path: '^src/(hooks|utils/duel|components|assets/duel|types|stores|pages)/',
        pathNot: [
          '^src/hooks/useDuelGame\\.ts$',
          '^src/utils/duel/',
          '^src/components/duel/',
          '^src/assets/duel/',
          '^src/types/duel\\.ts$',
          '^src/types/progress\\.ts$',
          '^src/stores/progressStore\\.ts$',
          '^src/components/home/StationPic\\.tsx$',
          '^src/components/home/StationPath\\.tsx$', // known exception: used by Book 2's home-path screen
        ],
      },
    },
    {
      name: 'home-into-duel2-only-through-its-surface',
      severity: 'error',
      comment: 'The home reads Book 2 only through its save format, station, mastery/predict logic and pictures.',
      from: { path: '^src/components/home/', pathNot: TEST },
      to: {
        path: '^src/duel2/',
        pathNot: [
          '^src/duel2/saveFormat\\.ts$',
          '^src/duel2/station\\.ts$',
          '^src/duel2/logic/(mastery|predict)\\.ts$',
          '^src/duel2/assets/img/',
        ],
      },
    },
  ],
  options: {
    tsConfig: { fileName: 'tsconfig.json' },
    doNotFollow: { path: 'node_modules' },
    exclude: { path: ['\\.(webp|png|jpe?g|svg|mp3|ogg|woff2?|yaml|yml|css)$'] },
    includeOnly: '^src/',
  },
}
