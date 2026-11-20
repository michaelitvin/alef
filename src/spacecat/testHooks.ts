/** Test hooks exist only in tests and in the verify build (VITE_SPACECAT_TEST=1). */
export const TEST_HOOKS = import.meta.env.MODE === 'test' || import.meta.env.VITE_SPACECAT_TEST === '1'
