
/**
 * Import YAML as module (for bundled files)
 * Usage: const data = await importYaml<LettersData>(() => import('../data/letters.yaml'))
 */
export async function importYaml<T>(
  importFn: () => Promise<{ default: unknown }>
): Promise<T> {
  const module = await importFn()
  return module.default as T
}
