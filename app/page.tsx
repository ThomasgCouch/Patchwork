"use client";

import { useState, type CSSProperties } from "react";
import type { MatchResponse, Patch } from "@/lib/types";
import mockJson from "@/lib/mock.json";
import SearchBox from "@/components/SearchBox";
import PatchCard from "@/components/PatchCard";
import { languageColour, textOn } from "@/components/languages";
import styles from "./page.module.css";

// /api/match already serves lib/mock.json until the real pipeline lands, so this
// stays false. Set true only to work offline without the API route.
const USE_MOCK = false;

const REPO_URL = "https://github.com/ThomasgCouch/Patchwork";

type State =
  | { kind: "idle" }
  | { kind: "loading"; username: string }
  | { kind: "error"; username: string; message: string }
  | { kind: "results"; data: MatchResponse };

// mock.json may be a full MatchResponse or just an array of patches
function fromMock(username: string): MatchResponse {
  const m = mockJson as unknown;
  if (Array.isArray(m)) {
    const patches = m as Patch[];
    return { username, languages: [...new Set(patches.map((p) => p.language))], patches };
  }
  return { ...(m as MatchResponse), username };
}

function isMatchResponse(x: unknown): x is MatchResponse {
  return !!x && typeof x === "object" && Array.isArray((x as MatchResponse).patches);
}

async function loadDemo(): Promise<MatchResponse> {
  const res = await fetch("/demo/demo-result.json");
  const body = await res.json().catch(() => null);
  if (!res.ok || !isMatchResponse(body)) throw new Error("The demo result isn't ready yet.");
  return { ...body, languages: body.languages ?? [] };
}

async function fetchMatches(username: string): Promise<MatchResponse> {
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("demo")) {
    return loadDemo();
  }
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 900)); // so the loading state is visible
    return fromMock(username);
  }
  const res = await fetch("/api/match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !isMatchResponse(body)) {
    const raw = String(body?.error ?? `Request failed (${res.status})`);
    throw new Error(friendlyError(raw));
  }
  return body;
}

function friendlyError(raw: string): string {
  if (/look like a GitHub username/i.test(raw)) return raw;
  if (/404|not found/i.test(raw)) return "We couldn't find that GitHub user. Check the spelling?";
  if (/403|429|rate limit/i.test(raw)) return "GitHub or Gemma is rate-limiting us. Give it a minute and retry.";
  return "Something went wrong while stitching your patches.";
}

export default function Home() {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function search(username: string) {
    setState({ kind: "loading", username });
    try {
      const data = await fetchMatches(username);
      setState({ kind: "results", data });
    } catch (e) {
      setState({ kind: "error", username, message: e instanceof Error ? e.message : String(e) });
    }
  }

  async function showDemo() {
    setState({ kind: "loading", username: "demo" });
    try {
      setState({ kind: "results", data: await loadDemo() });
    } catch (e) {
      setState({ kind: "error", username: "demo", message: e instanceof Error ? e.message : String(e) });
    }
  }

  const loading = state.kind === "loading";

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <h1 className={styles.logo}>
          <span className={styles.logoMark} aria-hidden>
            <i /><i /><i /><i />
          </span>
          Patchwork
        </h1>
        <p className={styles.tagline}>Stitch your first patch.</p>
        <p className={styles.lede}>
          We read your public GitHub repos, find open <strong>good first issues</strong> that fit
          your skills, and Gemma 4 explains each one and where to start.
        </p>
        <SearchBox onSearch={search} loading={loading} />
      </header>

      <main className={styles.main}>
        {state.kind === "loading" && (
          <>
            <p className={styles.status}>Stitching patches for @{state.username}…</p>
            <div className={styles.grid}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={styles.skeleton} />
              ))}
            </div>
          </>
        )}

        {state.kind === "error" && (
          <div className={styles.message}>
            <p className={styles.messageTitle}>{state.message}</p>
            <div className={styles.messageActions}>
              <button className={styles.button} onClick={() => search(state.username)}>
                Try again
              </button>
              <button className={styles.ghostButton} onClick={showDemo}>
                Show demo result
              </button>
            </div>
          </div>
        )}

        {state.kind === "results" && state.data.patches.length === 0 && (
          <div className={styles.message}>
            <p className={styles.messageTitle}>No patches found for @{state.data.username} yet.</p>
            <p>
              We couldn&apos;t find open good first issues in{" "}
              {state.data.languages.length ? state.data.languages.join(", ") : "their languages"}.
              Try another username.
            </p>
          </div>
        )}

        {state.kind === "results" && state.data.patches.length > 0 && (
          <>
            <div className={styles.resultsHead}>
              <h2>
                {state.data.patches.length} patches for @{state.data.username}
              </h2>
              <div className={styles.langs}>
                <span>Your languages:</span>
                {state.data.languages.map((l) => {
                  const c = languageColour(l);
                  return (
                    <span
                      key={l}
                      className={styles.langChip}
                      style={{ "--patch": c, "--patch-text": textOn(c) } as CSSProperties}
                    >
                      {l}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className={styles.grid}>
              {state.data.patches.map((p) => (
                <PatchCard key={p.url} patch={p} />
              ))}
            </div>
          </>
        )}
      </main>

      <footer className={styles.footer}>
        <span className={styles.gemma}>✦ Powered by Gemma 4</span>
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
          View on GitHub
        </a>
        <span>Hacktoberfest 2026 · University of Surrey</span>
      </footer>
    </div>
  );
}
