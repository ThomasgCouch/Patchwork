// Owner: Joe
import { GoogleGenAI } from '@google/genai';
import { ScoredIssue, Patch } from './types';

// In-memory cache keyed by issue URL to save quota & prevent duplicate calls
const cache = new Map<string, Patch>();

// Initialize GoogleGenAI client with required header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Primary model from environment or fallback to gemini-3.8-flash / gemma-4
const PRIMARY_MODEL = process.env.GEMMA_MODEL || 'gemma-4-26b-a4b-it';
const FALLBACK_MODEL = 'gemini-3.8-flash';

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

/**
 * Calls local Ollama or server-side Google GenAI with retry on 429/5xx
 */
export async function callGemma(prompt: string, attempt = 1): Promise<string> {
  // 1. Local Ollama fallback if USE_LOCAL=1
  if (process.env.USE_LOCAL === '1') {
    try {
      const res = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemma4:e4b-it-qat',
          prompt,
          stream: false,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.response || '';
      }
    } catch (err) {
      console.warn('[Gemma] Local Ollama call failed, falling back to API:', err);
    }
  }

  // 2. Google GenAI API call with retry
  try {
    let text = '';
    try {
      const res = await ai.models.generateContent({
        model: PRIMARY_MODEL,
        contents: prompt,
      });
      text = res.text ?? '';
    } catch (primaryErr: any) {
      // If PRIMARY_MODEL fails (e.g. unknown model name), fall back to standard Gemini model
      if (PRIMARY_MODEL !== FALLBACK_MODEL) {
        const res = await ai.models.generateContent({
          model: FALLBACK_MODEL,
          contents: prompt,
        });
        text = res.text ?? '';
      } else {
        throw primaryErr;
      }
    }

    return text;
  } catch (err: any) {
    const isRateLimitOrServerErr =
      err?.status === 429 ||
      err?.status >= 500 ||
      (err?.message && (err.message.includes('429') || err.message.includes('ResourceExhausted')));

    if (attempt < 2 && isRateLimitOrServerErr) {
      console.warn(`[Gemma] Rate limit or server error encountered. Retrying in 1s (attempt ${attempt + 1})...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return callGemma(prompt, attempt + 1);
    }

    throw err;
  }
}

/**
 * Explains a ScoredIssue and returns a structured Patch conforming to contract.
 * Never throws — falls back cleanly if AI fails.
 */
export async function explain(issue: ScoredIssue, languages: string[]): Promise<Patch> {
  // Check in-memory cache first
  if (cache.has(issue.url)) {
    return cache.get(issue.url)!;
  }

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
      summary: parsed.summary || issue.title,
      difficulty: ['easy', 'medium', 'hard'].includes(parsed.difficulty)
        ? parsed.difficulty
        : 'unknown',
      first_steps: Array.isArray(parsed.first_steps) && parsed.first_steps.length > 0
        ? parsed.first_steps
        : ['Fork and clone the repository', 'Find the affected file in the codebase', 'Run tests and submit a PR'],
      files_to_look_at: Array.isArray(parsed.files_to_look_at) && parsed.files_to_look_at.length > 0
        ? parsed.files_to_look_at
        : ['unknown'],
    };

    cache.set(issue.url, patch);
    return patch;
  } catch (err) {
    console.warn(`[Gemma] AI explanation failed for ${issue.repo}#${issue.url}, returning safe fallback:`, err);

    // Safe fallback matching contract shape
    const fallbackPatch: Patch = {
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
      files_to_look_at: ['src/', 'tests/'],
    };

    cache.set(issue.url, fallbackPatch);
    return fallbackPatch;
  }
}
