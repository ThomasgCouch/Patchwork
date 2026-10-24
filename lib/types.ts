export type RawIssue = {
  repo: string; // "owner/name"
  stars: number;
  title: string;
  body: string;
  url: string; // html_url of the issue
  language: string;
  comments: number;
  updatedAt: string; // ISO date
  hasHacktoberfestTopic: boolean;
};

export type ScoredIssue = RawIssue & { score: number };

export type Patch = {
  repo: string;
  stars: number;
  title: string;
  url: string;
  language: string;
  score: number;
  summary: string;
  difficulty: "easy" | "medium" | "hard" | "unknown";
  first_steps: string[];
  files_to_look_at: string[];
};

export type MatchResponse = {
  username: string;
  languages: string[];
  patches: Patch[];
};
