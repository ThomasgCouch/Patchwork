// Owner: Joe
import type { RawIssue, ScoredIssue } from "./types";

export function rank(issues: RawIssue[], _languages: string[]): ScoredIssue[] {
  return issues.map((i) => ({ ...i, score: 0 }));
}
