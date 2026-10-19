/** Test hooks (data-correct, the glyph sheet) exist only in tests and in the verify build (VITE_DUEL2_TEST=1). */
export const TEST_HOOKS = import.meta.env.MODE === 'test' || import.meta.env.VITE_DUEL2_TEST === '1'
