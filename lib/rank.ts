// Owner: Rui
import type { RawIssue, ScoredIssue } from "./types";

const DAY_MS = 86_400_000;

// Tuned on live data: search already returns recently updated issues, so freshness barely
// varies and gets little weight; language fit and "nobody's on it yet" matter most.
export const WEIGHTS = {
  language: 0.4,
  freshness: 0.05,
  quietness: 0.25,
  popularity: 0.1,
  hacktober: 0.1,
  hasBody: 0.1,
};

// Each factor is 0 to 1.
export function scoreParts(i: RawIssue, languages: string[], now = Date.now()): Record<keyof typeof WEIGHTS, number> {
  const langIdx = languages.indexOf(i.language);
  const days = (now - new Date(i.updatedAt).getTime()) / DAY_MS;
  return {
    language: langIdx === -1 ? 0 : Math.max(0, 1 - langIdx * 0.25), // top language weighs most
    freshness: Number.isFinite(days) ? Math.max(0, Math.min(1, 1 - days / 60)) : 0, // 0 after ~2 months
    quietness: i.comments === 0 ? 1 : i.comments < 3 ? 0.6 : i.comments < 6 ? 0.25 : 0, // 6+ comments: likely taken
    popularity: Math.min(1, Math.log10(Math.max(0, i.stars) + 1) / 4), // soft preference for real repos
    hacktober: i.hasHacktoberfestTopic ? 1 : 0,
    hasBody: i.body && i.body.length > 80 ? 1 : 0,
  };
}

export function scoreIssue(i: RawIssue, languages: string[], now = Date.now()): number {
  const parts = scoreParts(i, languages, now);
  let score = 0;
  for (const k of Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]) score += WEIGHTS[k] * parts[k];
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
