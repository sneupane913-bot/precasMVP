/**
 * Provable revision.
 *
 * QA finding LIVE-004: an entire audit round was spent testing what turned out
 * to be a stale deployment, because there was no way to tell which revision was
 * live. Every audit now starts by reading this.
 *
 * Netlify injects COMMIT_REF and BUILD_ID at build time.
 */
export const BUILD_INFO = {
  sha: process.env.COMMIT_REF ?? process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
  shortSha: (process.env.COMMIT_REF ?? 'local').slice(0, 7),
  builtAt: process.env.BUILD_TIME ?? new Date().toISOString(),
  branch: process.env.HEAD ?? 'local',
  context: process.env.CONTEXT ?? 'development',
} as const;

export function buildBanner(): string {
  return `${BUILD_INFO.shortSha} · ${BUILD_INFO.context} · ${BUILD_INFO.builtAt}`;
}
