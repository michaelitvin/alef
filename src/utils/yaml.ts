import yaml from 'js-yaml'

/**
 * Load and parse a YAML file
 * Note: In production, YAML files are bundled as static assets
 * This utility helps parse them at runtime
 */
export async function loadYaml<T>(path: string): Promise<T> {
  try {
    const response = await fetch(path)
    if (!response.ok) {
      throw new Error(`Failed to load YAML: ${path} (${response.status})`)
    }
    const text = await response.text()
    return yaml.load(text) as T
  } catch (error) {
    console.error(`Error loading YAML from ${path}:`, error)
    throw error
  }
}

/**
 * Parse YAML string
 */
export function parseYaml<T>(yamlString: string): T {
  return yaml.load(yamlString) as T
}

/**
 * Stringify object to YAML
 */
export function stringifyYaml(obj: unknown): string {
  return yaml.dump(obj)
}

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

export default loadYaml
