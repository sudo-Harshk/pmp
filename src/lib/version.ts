/** Raw build stamp baked at build time (commit hash). Falls back to 'dev' locally. */
export const APP_BUILD: string =
  (import.meta.env.VITE_APP_VERSION as string | undefined)?.trim() || 'dev'

/**
 * Short human label for the footer marker.
 * Full 40-char hashes truncate to 7; short/custom values pass through.
 */
export function getBuildLabel(raw: string | undefined | null): string {
  const cleaned = (raw ?? '').trim()
  if (cleaned.length === 0) return 'dev'
  if (/^[0-9a-f]{40}$/i.test(cleaned)) return cleaned.slice(0, 7)
  return cleaned.slice(0, 32)
}
