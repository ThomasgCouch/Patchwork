// Owner: Sanjith
import type { RawIssue } from "./types";

const GH = "https://api.github.com";

export class GitHubError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
  }
}

function headers(): HeadersInit {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  // Only send the token when it's set, otherwise GitHub rejects "Bearer undefined".
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function gh<T>(path: string, what: string): Promise<T> {
  const res = await fetch(GH + path, { headers: headers(), cache: "no-store" });
  if (res.ok) return res.json() as Promise<T>;
  const limited =
    res.status === 429 || (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0");
  if (limited) throw new GitHubError("GitHub rate limit reached (429)", 429);
  if (res.status === 404) throw new GitHubError(`${what} not found (404)`, 404);
  throw new GitHubError(`GitHub ${what} request failed (${res.status})`, 502);
}

type GhRepo = {
  fork: boolean;
  archived: boolean;
  language: string | null;
  pushed_at: string;
  stargazers_count: number;
  topics?: string[];
};

type GhIssue = {
  title: string;
  body: string | null;
  html_url: string;
  repository_url: string;
  comments: number;
  updated_at: string;
};

/** Top `n` languages across the user's own (non-fork, non-archived) public repos. */
export async function getTopLanguages(username: string, n = 3): Promise<string[]> {
  const repos = await gh<GhRepo[]>(
    `/users/${encodeURIComponent(username)}/repos?per_page=100&sort=pushed&type=owner`,
    "GitHub user",
  );
  const counts: Record<string, { count: number; latest: number }> = {};
  for (const r of repos) {
    if (r.fork || r.archived || !r.language) continue;
    const c = (counts[r.language] ??= { count: 0, latest: 0 });
    c.count++;
    c.latest = Math.max(c.latest, new Date(r.pushed_at).getTime());
  }
  return Object.entries(counts)
    .sort((a, b) => b[1].count - a[1].count || b[1].latest - a[1].latest) // ties: most recently used
    .slice(0, n)
    .map(([lang]) => lang);
}

// Repo details (stars, topics) cached across requests while the server instance is warm.
const repoCache = new Map<string, Promise<{ stars: number; topics: string[] }>>();

function repoInfo(fullName: string) {
  let p = repoCache.get(fullName);
  if (!p) {
    p = gh<GhRepo>(`/repos/${fullName}`, "repo")
      .then((r) => ({ stars: r.stargazers_count, topics: r.topics ?? [] }))
      .catch(() => ({ stars: 0, topics: [] })); // one bad repo shouldn't sink the request
    repoCache.set(fullName, p);
  }
  return p;
}

// Skip toy repos: a 1-star repo's "good first issue" makes a poor demo and a poor first PR.
const MIN_STARS = 50;

/** Open, unassigned `good first issue` issues in repos written in `language`, from repos with real users. */
export async function findIssues(language: string, perPage = 25): Promise<RawIssue[]> {
  const q = encodeURIComponent(
    `label:"good first issue" language:"${language}" state:open is:issue is:public no:assignee archived:false`,
  );
  const data = await gh<{ items: GhIssue[] }>(
    `/search/issues?q=${q}&sort=updated&order=desc&per_page=${perPage}`,
    "issue search",
  );

  const issues = await Promise.all(
    data.items.map(async (i): Promise<RawIssue> => {
      const repo = i.repository_url.replace(`${GH}/repos/`, "");
      const info = await repoInfo(repo);
      return {
        repo,
        stars: info.stars,
        title: i.title,
        body: i.body ?? "",
        url: i.html_url,
        language,
        comments: i.comments,
        updatedAt: i.updated_at,
        hasHacktoberfestTopic: info.topics.includes("hacktoberfest"),
      };
    }),
  );
  return issues.filter((i) => i.stars >= MIN_STARS);
}
