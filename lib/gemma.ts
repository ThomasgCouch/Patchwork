// Owner: Rui
import type { Patch, ScoredIssue } from "./types";

export async function explain(issue: ScoredIssue, _languages: string[]): Promise<Patch> {
  return {
    repo: issue.repo,
    stars: issue.stars,
    title: issue.title,
    url: issue.url,
    language: issue.language,
    score: issue.score,
    summary: issue.title,
    difficulty: "unknown",
    first_steps: [],
    files_to_look_at: [],
  };
}
