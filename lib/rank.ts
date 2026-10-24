// Owner: Rui
import type { RawIssue, ScoredIssue } from "./types";

const DAY_MS = 86_400_000;

export function scoreIssue(i: RawIssue, languages: string[], now = Date.now()): number {
  const langIdx = languages.indexOf(i.language);
  const langScore = langIdx === -1 ? 0 : Math.max(0, 1 - langIdx * 0.25); // top language weighs most
  const days = (now - new Date(i.updatedAt).getTime()) / DAY_MS;
  const freshness = Number.isFinite(days) ? Math.max(0, Math.min(1, 1 - days / 60)) : 0; // 0 after ~2 months
  const quietness = i.comments === 0 ? 1 : i.comments < 3 ? 0.6 : 0.2; // no pile-on
  const popularity = Math.min(1, Math.log10(Math.max(0, i.stars) + 1) / 4); // soft preference for real repos
  const hacktober = i.hasHacktoberfestTopic ? 1 : 0;
  const hasBody = i.body && i.body.length > 80 ? 1 : 0;
  const score =
    0.3 * langScore + 0.2 * freshness + 0.15 * quietness +
    0.1 * popularity + 0.15 * hacktober + 0.1 * hasBody;
  return Math.round(score * 100) / 100;
}

// Sorted best first, duplicate URLs dropped, at most `perRepo` issues per repo.
export function rank(issues: RawIssue[], languages: string[], perRepo = 2): ScoredIssue[] {
  const now = Date.now();
  const seen = new Set<string>();
  const unique = issues.filter((i) => !seen.has(i.url) && seen.add(i.url));

  const sorted = unique
    .map((i) => ({ ...i, score: scoreIssue(i, languages, now) }))
    .sort((a, b) => b.score - a.score || b.stars - a.stars);

  const perRepoCount: Record<string, number> = {};
  return sorted.filter((i) => {
    perRepoCount[i.repo] = (perRepoCount[i.repo] ?? 0) + 1;
    return perRepoCount[i.repo] <= perRepo;
  });
}
