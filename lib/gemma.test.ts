import { explain, buildPrompt } from './gemma';
import { ScoredIssue } from './types';
import dotenv from 'dotenv';

dotenv.config();

const sampleIssue: ScoredIssue = {
  repo: 'tailwindlabs/tailwindcss',
  stars: 82000,
  title: 'Docs: Fix broken link in quickstart guide',
  body: 'Step 3 of the installation guide links to a 404 URL in the Vite setup section.',
  url: 'https://github.com/tailwindlabs/tailwindcss/issues/1',
  language: 'TypeScript',
  comments: 0,
  updatedAt: new Date().toISOString(),
  hasHacktoberfestTopic: true,
  score: 0.95,
};

async function testGemma() {
  console.log('--- Testing Joe lib/gemma.ts ---');
  console.log('1. Generated Prompt:\n');
  console.log(buildPrompt(sampleIssue, ['TypeScript']));

  console.log('\n2. Calling explain()...');
  const start = Date.now();
  const patch = await explain(sampleIssue, ['TypeScript']);
  const elapsed = Date.now() - start;

  console.log(`\nResponse received in ${elapsed}ms:`);
  console.log(JSON.stringify(patch, null, 2));

  console.log('\n3. Testing in-memory cache...');
  const cacheStart = Date.now();
  const cachedPatch = await explain(sampleIssue, ['TypeScript']);
  const cacheElapsed = Date.now() - cacheStart;
  console.log(`Cache response took ${cacheElapsed}ms (should be < 5ms)`);

  if (patch.summary && patch.first_steps.length > 0 && cacheElapsed < 20) {
    console.log('\nALL GEMMA CHECKS PASSED!');
  } else {
    console.log('\nCHECKS FAILED');
  }
}

testGemma().catch(console.error);
