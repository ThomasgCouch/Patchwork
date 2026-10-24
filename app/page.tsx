"use client";

import { useEffect, useState, type CSSProperties } from "react";
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

// Shown in turn while /api/match works (GitHub lookups + Gemma take a few seconds).
const LOADING_STEPS = [
  "Reading your public repos…",
  "Working out your top languages…",
  "Searching for good first issues…",
  "Ranking the best fits…",
  "Asking Gemma to explain each one…",
  "Stitching your patches together…",
];

function LoadingStatus({ username }: { username: string }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 1600);
    return () => clearInterval(id);
  }, []);
  return (
    <p className={styles.status} aria-live="polite">
      <strong>@{username}</strong> · {LOADING_STEPS[step]}
    </p>
  );
}

// Keeps ?u=<username> in the address bar so a search can be shared or bookmarked.
function setUserParam(username: string) {
  const params = new URLSearchParams(window.location.search);
  params.set("u", username);
  window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
}

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
  const [filter, setFilter] = useState<string | null>(null);
  const [initialUser, setInitialUser] = useState("");

  async function search(username: string) {
    setFilter(null);
    setUserParam(username);
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

  // Open with ?u=<username> to search straight away (handy for the demo).
  useEffect(() => {
    const u = new URLSearchParams(window.location.search).get("u");
    if (u) {
      setInitialUser(u); // eslint-disable-line react-hooks/set-state-in-effect -- one-off read of the URL on load
      search(u);
    }
  }, []);

  const loading = state.kind === "loading";
  const patches = state.kind === "results" ? state.data.patches : [];
  const visible = filter ? patches.filter((p) => p.language === filter) : patches;

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
        <SearchBox key={initialUser} initial={initialUser} onSearch={search} loading={loading} />
      </header>

      <main className={styles.main}>
        {state.kind === "loading" && (
          <>
            <LoadingStatus username={state.username} />
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
                {visible.length} {visible.length === 1 ? "patch" : "patches"} for @{state.data.username}
                {filter && <span className={styles.filterNote}> in {filter}</span>}
              </h2>
              <div className={styles.langs} role="group" aria-label="Filter by language">
                <span>Your languages:</span>
                {state.data.languages.map((l) => {
                  const c = languageColour(l);
                  const count = patches.filter((p) => p.language === l).length;
                  const active = filter === l;
                  return (
                    <button
                      key={l}
                      type="button"
                      className={`${styles.langChip} ${filter && !active ? styles.langChipDim : ""}`}
                      style={{ "--patch": c, "--patch-text": textOn(c) } as CSSProperties}
                      aria-pressed={active}
                      disabled={count === 0}
                      title={count === 0 ? `No patches in ${l} this time` : `Show only ${l}`}
                      onClick={() => setFilter(active ? null : l)}
                    >
                      {l} <span className={styles.chipCount}>{count}</span>
                    </button>
                  );
                })}
                {filter && (
                  <button type="button" className={styles.clearChip} onClick={() => setFilter(null)}>
                    Show all
                  </button>
                )}
              </div>
            </div>
            <div className={styles.grid}>
              {visible.map((p) => (
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