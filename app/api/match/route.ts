import mock from "@/lib/mock.json";
import { getTopLanguages, findIssues, GitHubError } from "@/lib/github";
import { rank } from "@/lib/rank";
import { explain } from "@/lib/gemma";
import type { MatchResponse } from "@/lib/types";

export const maxDuration = 30;

const USERNAME = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const username = String(body?.username ?? "").trim();

  // Offline / no-wifi fallback: USE_MOCK=1 in .env
  if (process.env.USE_MOCK === "1") return Response.json({ ...mock, username });

  if (!USERNAME.test(username)) {
    return Response.json({ error: "That doesn't look like a GitHub username." }, { status: 400 });
  }

  try {
    const languages = await getTopLanguages(username);
    if (languages.length === 0) {
      return Response.json({ username, languages, patches: [] } satisfies MatchResponse);
    }

    // One search per language; a failed language shouldn't sink the others.
    const results = await Promise.allSettled(languages.map((l) => findIssues(l)));
    const ok = results.filter((r) => r.status === "fulfilled");
    if (ok.length === 0) throw (results[0] as PromiseRejectedResult).reason;
    const raw = ok.flatMap((r) => r.value);

    const top = rank(raw, languages).slice(0, 5);
    const patches = await Promise.all(top.map((i) => explain(i, languages)));

    return Response.json({ username, languages, patches } satisfies MatchResponse);
  } catch (e) {
    const status = e instanceof GitHubError ? e.status : 500;
    const message = e instanceof Error ? e.message : String(e);
    return Response.json({ error: message }, { status });
  }
}
