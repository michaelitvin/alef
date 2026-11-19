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
      from: { path: '^src/(duel2/logic|clock/logic|utils/duel|english/logic)/', pathNot: TEST },
      to: { path: ['^src/(duel2|clock)/(components|screens)/', '^src/components/'] },
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
        'Book 2 reaches the first duel only through its public surface. progressStore: Duel2App, main and the parent part read it; the run reads it only through savePort.ts. ' +
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
      name: 'run-controller-imports-no-view',
      severity: 'error',
      comment:
        'Book 2\'s run (controller.ts) imports no view (components/, screens/) and not the lessons\' store (src/stores): shared types are in viewTypes.ts, ' +
        'layout numbers in layout.ts and broomLayout.ts, and the saves go through savePort.ts.',
      from: { path: '^src/duel2/controller\\.ts$' },
      to: { path: ['^src/duel2/(components|screens)/', '^src/stores/'] },
    },
    {
      name: 'run-engine-is-course-free',
      severity: 'error',
      comment:
        'The run engine (Book 2\'s controller.ts, logic/ and policies/, and the first duel in src/utils/duel) never imports the ' +
        'English course (src/english): a course reaches the run only as the Course it is given (RunOpts.course).',
      from: { path: ['^src/duel2/(controller|logic/|policies/)', '^src/utils/duel/'] },
      to: { path: '^src/english/' },
    },
    {
      name: 'run-policies-are-pure',
      severity: 'error',
      comment:
        'Book 2\'s run policies (src/duel2/policies) are pure: they import only the pure rules (logic/) and each other, never ' +
        'a store, the audio, the clock, the telemetry or a view. The run does what a step returns.',
      from: { path: '^src/duel2/policies/', pathNot: TEST },
      to: { path: '^src/', pathNot: '^src/duel2/(logic|policies)/' },
    },
    {
      name: 'parent-area-reads-games-only-through-their-parent-index',
      severity: 'error',
      comment:
        'The shared parent area (src/parent) reaches a game only through its declared src/<game>/parent/index.ts (the registry); ' +
        'the game screens it shows are lazy imports made by those files.',
      from: { path: '^src/parent/', pathNot: TEST },
      to: { path: '^src/', pathNot: ['^src/parent/', '^src/shared/', '^src/(duel2|clock|lessons|english)/parent/index\\.ts$'] },
    },
    {
      name: 'game-parent-index-is-light',
      severity: 'error',
      comment:
        'A game\'s parent/index.ts loads with the area on every page: no store (creating one writes its save), no audio (it builds ' +
        'a kit), no telemetry (an instance rewrites its log on pagehide). Its screens and its reset are modules of their own, ' +
        'loaded with import() (a dynamic import of the store itself would hide a static one: depcruise merges the two).',
      from: { path: '^src/(duel2|clock|lessons|english)/parent/index\\.ts$' },
      to: {
        // the English kit is src/english/audio.ts
        path: ['/store\\.ts$', '^src/stores/', '/audio/', '/audio\\.ts$', '/telemetry\\.ts$'],
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
    {
      name: 'home-into-english-only-through-its-surface',
      severity: 'error',
      comment:
        'The home reads the English path only through its save format, station (the open stations and their ratings come only ' +
        'from there), available, the doors filter (a light helper over the course\'s own rule) and the green pictures.',
      from: { path: '^src/components/home/', pathNot: TEST },
      to: {
        path: '^src/english/',
        pathNot: [
          '^src/english/saveFormat\\.ts$',
          '^src/english/station\\.ts$',
          '^src/english/available\\.ts$',
          '^src/english/doorsPlayable\\.ts$',
          '^src/english/assets/img/',
        ],
      },
    },
    {
      name: 'review-kit-is-host-and-game-free',
      severity: 'error',
      comment: 'The review kit (tools/review) knows no game: a host-local adapter gives it the items. It never imports src/.',
      from: { path: '^tools/review/' },
      to: { path: '^src/' },
    },
    {
      name: 'games-never-import-the-review-kit',
      severity: 'error',
      comment: 'The games do not ship review code.',
      from: { path: '^src/' },
      to: { path: '^tools/' },
    },
    {
      name: 'review-page-is-browser-only',
      severity: 'error',
      comment:
        'The review page runs in the browser: it imports only its own modules, and types (free) from the kit. The rules stay ' +
        'on the server, which sends derived state.',
      from: { path: '^tools/review/page/', pathNot: TEST },
      to: { path: '^tools/review/', pathNot: '^tools/review/page/' },
    },
  ],
  options: {
    tsConfig: { fileName: 'tsconfig.json' },
    doNotFollow: { path: 'node_modules' },
    exclude: { path: ['\\.(webp|png|jpe?g|svg|mp3|ogg|woff2?|yaml|yml|css)$'] },
    includeOnly: '^(src|tools)/',
  },
}
