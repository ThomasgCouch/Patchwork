// Owner: Joe
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { ScoredIssue, Patch } from './types';

// In-memory cache keyed by issue URL to save quota & prevent duplicate calls.
// Only real AI results go in here; fallbacks are never cached.
const cache = new Map<string, Patch>();

const PRIMARY_MODEL = process.env.GEMMA_MODEL || 'gemma-4-26b-a4b-it';
// Measured ~5s per call; gemini-3.8-flash timed out at 30s and rejects thinkingLevel.
const FALLBACK_MODEL = 'gemini-flash-lite-latest';

// Two sequential attempts must fit inside the route's 30s maxDuration.
const CALL_TIMEOUT_MS = 12_000;

// Created lazily so a missing key or import order can't break module load.
let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

/**
 * Builds the mentorship prompt for Gemma 4 / Gemini
 */
export function buildPrompt(issue: ScoredIssue, languages: string[]): string {
  const bodySnippet = (issue.body || '').slice(0, 1500).trim();
  const langList = languages.length > 0 ? languages.join(', ') : 'General developer';

  return `You are helping a first-time open-source contributor.
Contributor's top languages: ${langList}
Repo: ${issue.repo}
Issue title: ${issue.title}
Issue body: ${bodySnippet || 'No description provided.'}

Return JSON only, no markdown fences:
{
  "summary": "2 sentences, plain English",
  "difficulty": "easy",
  "first_steps": ["Step 1", "Step 2", "Step 3"],
  "files_to_look_at": ["likely/path/file.ts"]
}`;
}

async function callLocal(prompt: string): Promise<string | null> {
  try {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gemma4:e4b-it-qat', prompt, stream: false }),
      signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.response || null;
  } catch (err) {
    console.warn('[Gemma] Local Ollama call failed, falling back to API:', err);
    return null;
  }
}

async function callModel(model: string, prompt: string): Promise<string> {
  const res = await getClient().models.generateContent({
    model,
    contents: prompt,
    config: {
      // Gemma spends 1000+ thinking tokens by default (25-30s per call); this is ~5s.
      // Other models reject thinkingLevel, so only Gemma gets it.
      ...(model.startsWith('gemma') && { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }),
      responseMimeType: 'application/json',
      abortSignal: AbortSignal.timeout(CALL_TIMEOUT_MS),
    },
  });
  return res.text ?? '';
}

// Gemma returns an occasional 500 within a second; one quick retry is cheap.
// Timeouts carry no status, so they are not retried.
function isRetryable(err: unknown): boolean {
  const status = (err as { status?: number } | null)?.status;
  return status === 429 || (status !== undefined && status >= 500);
}

async function callModelWithRetry(model: string, prompt: string): Promise<string> {
  try {
    return await callModel(model, prompt);
  } catch (err: unknown) {
    if (!isRetryable(err)) throw err;
    console.warn(`[Gemma] ${model} returned a retryable error, retrying once`);
    return callModel(model, prompt);
  }
}

/**
 * Calls local Ollama (USE_LOCAL=1) or the Google GenAI API.
 * Tries the primary model (one quick retry on 429/5xx), then the fallback model;
 * each attempt is time-boxed.
 */
export async function callGemma(prompt: string): Promise<string> {
  if (process.env.USE_LOCAL === '1') {
    const local = await callLocal(prompt);
    if (local) return local;
  }

  const models = PRIMARY_MODEL === FALLBACK_MODEL ? [PRIMARY_MODEL] : [PRIMARY_MODEL, FALLBACK_MODEL];
  let lastErr: unknown;
  for (const model of models) {
    try {
      const text = await callModelWithRetry(model, prompt);
      if (text) return text;
      lastErr = new Error(`Empty response from ${model}`);
    } catch (err: unknown) {
      lastErr = err;
      console.warn(`[Gemma] ${model} failed:`, err instanceof Error ? err.message : err);
    }
  }
  throw lastErr;
}

const isStringList = (v: unknown): v is string[] =>
  Array.isArray(v) && v.length > 0 && v.every((s) => typeof s === 'string' && s.trim() !== '');

/**
 * Explains a ScoredIssue and returns a structured Patch conforming to contract.
 * Never throws — falls back cleanly if AI fails.
 */
export async function explain(issue: ScoredIssue, languages: string[]): Promise<Patch> {
  const cached = cache.get(issue.url);
  if (cached) return cached;

  try {
    const rawText = await callGemma(buildPrompt(issue, languages));
    // Clean out markdown code fences if present
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    const patch: Patch = {
      repo: issue.repo,
      stars: issue.stars,
      title: issue.title,
      url: issue.url,
      language: issue.language,
      score: issue.score,
      summary: typeof parsed.summary === 'string' && parsed.summary.trim() ? parsed.summary : issue.title,
      difficulty: ['easy', 'medium', 'hard'].includes(parsed.difficulty) ? parsed.difficulty : 'unknown',
      first_steps: isStringList(parsed.first_steps)
        ? parsed.first_steps
        : ['Fork and clone the repository', 'Find the affected file in the codebase', 'Run tests and submit a PR'],
      files_to_look_at: isStringList(parsed.files_to_look_at) ? parsed.files_to_look_at : [],
    };

    cache.set(issue.url, patch);
    return patch;
  } catch (err) {
    console.warn(`[Gemma] AI explanation failed for ${issue.repo} (${issue.url}), returning safe fallback:`, err);

    // Not cached: a transient failure shouldn't stick to this issue.
    return {
      repo: issue.repo,
      stars: issue.stars,
      title: issue.title,
      url: issue.url,
      language: issue.language,
      score: issue.score,
      summary: issue.title,
      difficulty: 'unknown',
      first_steps: [
        'Fork and clone the repository locally',
        'Search the codebase for the feature or error mentioned in the title',
        'Verify tests pass before opening a pull request',
      ],
      files_to_look_at: [],
    };
  }
}