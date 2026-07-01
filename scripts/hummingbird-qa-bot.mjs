#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const DEFAULT_ENDPOINT = process.env.HUMMINGBIRD_QA_ENDPOINT || 'http://localhost:3000/api/generate';
const TEST_FILE = process.env.HUMMINGBIRD_QA_TEST_FILE || 'qa/hummingbird-qa-tests.json';
const REPORT_DIR = 'qa/reports';

const args = process.argv.slice(2);
const shouldRunChecks = args.includes('--checks');
const shouldFailOnWeak = args.includes('--fail-on-weak');
const endpointArg = args.find((arg) => arg.startsWith('--endpoint='));
const limitArg = args.find((arg) => arg.startsWith('--limit='));
const endpoint = endpointArg ? endpointArg.split('=').slice(1).join('=') : DEFAULT_ENDPOINT;
const limit = limitArg ? Number.parseInt(limitArg.split('=')[1] || '', 10) : undefined;

const bannedGlobal = [
  /send me (a couple|some|few)?\s*pics?/i,
  /send me what you drive/i,
  /what would you like cleaned up/i,
  /inside, outside, or both/i,
  /i'?m mobile, so i come to you/i,
  /limited spots?/i,
  /spots? (are )?(available|filling)/i,
  /guarantee(?:d|s)?/i,
  /licensed and insured/i,
  /background checks?/i,
  /no hidden fees?/i,
  /best (service|results?|quality|fit)/i,
  /save (time|money)/i,
  /transform your/i,
  /unlock your/i,
  /take .* to the next level/i,
  /elevate your/i,
  /are you tired of/i,
  /struggling with/i,
  /clear option/i,
  /hassle[- ]?free/i,
  /no fuss/i,
  /peace of mind/i,
  /clear price/i,
  /exactly what .* will cost/i,
  /open with the customer problem/i,
  /keep the post simple, specific/i,
];

const strongCtaPatterns = [
  /\b(comment|reply|message|dm)\s+[A-Z]{3,12}\b/,
  /\b(message|dm|reply|comment)\b/i,
  /\b(quote|book|schedule|estimate|consultation|appointment)\b/i,
];

function printHelp() {
  console.log(`Hummingbird QA Bot\n\nUsage:\n  npm run qa:hummingbird\n  npm run qa:hummingbird -- --checks\n  npm run qa:hummingbird -- --limit=3\n  npm run qa:hummingbird -- --endpoint=http://localhost:3000/api/generate\n\nFlags:\n  --checks        Run npm lint/build before QA tests.\n  --limit=N       Run only the first N QA tests.\n  --fail-on-weak  Exit non-zero when any test scores below 75.\n`);
}

if (args.includes('--help') || args.includes('-h')) {
  printHelp();
  process.exit(0);
}

function runCommand(command, commandArgs) {
  return new Promise((resolve, reject) => {
    console.log(`\n$ ${[command, ...commandArgs].join(' ')}`);
    const child = spawn(command, commandArgs, { stdio: 'inherit', shell: process.platform === 'win32' });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${commandArgs.join(' ')} failed with exit code ${code}`));
    });
  });
}

function loadTests() {
  if (!existsSync(TEST_FILE)) {
    throw new Error(`Missing ${TEST_FILE}. Create the QA test file first.`);
  }

  const raw = readFileSync(TEST_FILE, 'utf8');
  const parsed = JSON.parse(raw);
  const tests = Array.isArray(parsed) ? parsed : parsed.tests;

  if (!Array.isArray(tests) || tests.length === 0) {
    throw new Error(`${TEST_FILE} must contain a non-empty array or { "tests": [...] }.`);
  }

  return Number.isFinite(limit) ? tests.slice(0, limit) : tests;
}

function buildPayload(test) {
  const selectedPlatforms = test.platforms || ['instagram'];
  const prompt = test.prompt;
  const voice = test.voice || 'casual';
  const goal = test.goal || 'sales';

  // Current /api/generate expects content + selectedVoice.
  // Keep extra aliases so this QA bot stays compatible as Hummingbird evolves.
  return {
    content: prompt,
    selectedVoice: voice,
    goal,
    generationMode: 'make_my_post',
    selectedOutputs: selectedPlatforms,

    mode: 'make_my_post',
    prompt,
    userPrompt: prompt,
    idea: prompt,
    businessIdea: prompt,
    contentIdea: prompt,
    businessType: test.businessType,
    businessProfile: {
      businessType: test.businessType,
      services: test.services || '',
      city: test.city || '',
      area: test.city || '',
      tone: voice,
    },
    voice,
    selectedPlatforms,
    platforms: selectedPlatforms,
    uploadedImages: [],
  };
}

async function callGenerate(test) {
  const startedAt = Date.now();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildPayload(test)),
  });

  const raw = await response.text();
  const durationMs = Date.now() - startedAt;

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    body = { raw };
  }

  return {
    ok: response.ok,
    status: response.status,
    durationMs,
    body,
    raw,
  };
}

function extractText(value, seen = new WeakSet(), currentKey = '') {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') {
    if (/previewUrl|base64|data:image|data:video/i.test(currentKey) || value.length > 20000) return '';
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((item) => extractText(item, seen, currentKey)).join('\n');
  if (typeof value === 'object') {
    if (seen.has(value)) return '';
    seen.add(value);

    return Object.entries(value)
      .filter(([key]) => !/preview|image|video|upload|url|id|created|updated/i.test(key))
      .map(([key, nestedValue]) => extractText(nestedValue, seen, key))
      .join('\n');
  }
  return '';
}

function findMatches(text, patterns) {
  return patterns
    .map((pattern) => {
      const match = text.match(pattern);
      return match ? match[0] : null;
    })
    .filter(Boolean);
}

function normalizeExpectedPatterns(expected = []) {
  return expected.map((item) => {
    if (item.startsWith('/') && item.endsWith('/i')) {
      return new RegExp(item.slice(1, -2), 'i');
    }
    if (item.startsWith('/') && item.endsWith('/')) {
      return new RegExp(item.slice(1, -1));
    }
    return new RegExp(item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  });
}

function getNicheLeakagePatterns(test) {
  const context = `${test.id || ''} ${test.prompt || ''} ${test.businessType || ''}`.toLowerCase();

  if (/landscap|lawn|yard/.test(context)) {
    return [
      /home size/i,
      /rooms? need/i,
      /rooms? that need/i,
      /which room or area/i,
      /cleaning request/i,
      /cleaning quote/i,
      /standard, deep, or move-out/i,
    ];
  }

  if (/mobile detail|auto detail|car detail|detailing/.test(context)) {
    return [
      /send me your car type/i,
      /with your car type/i,
      /tell me your car type/i,
      /which parts you want detailed/i,
      /what you want cleaned/i,
      /what kind of detail are you thinking/i,
      /interior, exterior, or both/i,
    ];
  }

  return [];
}

function scoreOutput(test, apiResult) {
  const text = extractText(apiResult.body).replace(/\n{3,}/g, '\n\n').trim();
  const warnings = [];
  let score = 100;

  if (!apiResult.ok) {
    return {
      score: 0,
      verdict: 'fail',
      text,
      warnings: [`API returned ${apiResult.status}.`],
    };
  }

  if (text.length < 120) {
    score -= 40;
    warnings.push('Output text looks too short or could not be extracted from the API response.');
  }

  let maxScore = 100;

  const globalMatches = findMatches(text, bannedGlobal);
  for (const match of globalMatches.slice(0, 8)) {
    score -= 12;
    maxScore = Math.min(maxScore, 89);
    warnings.push(`Risky/generic phrase found: "${match}".`);
  }

  const testAvoidPatterns = normalizeExpectedPatterns(test.avoid || []);
  const avoidMatches = findMatches(text, testAvoidPatterns);
  for (const match of avoidMatches.slice(0, 8)) {
    score -= 15;
    maxScore = Math.min(maxScore, 79);
    warnings.push(`Niche-specific banned phrase found: "${match}".`);
  }

  const leakageMatches = findMatches(text, getNicheLeakagePatterns(test));
  for (const match of leakageMatches.slice(0, 8)) {
    score -= 15;
    maxScore = Math.min(maxScore, 79);
    warnings.push(`Cross-niche template leakage found: "${match}".`);
  }

  const expectedPatterns = normalizeExpectedPatterns(test.expected || []);
  const missingExpected = expectedPatterns.filter((pattern) => !pattern.test(text));
  for (const pattern of missingExpected.slice(0, 5)) {
    score -= 5;
    warnings.push(`Expected niche detail missing: ${pattern}.`);
  }

  if (!strongCtaPatterns.some((pattern) => pattern.test(text))) {
    score -= 15;
    warnings.push('No clear CTA, comment keyword, booking, message, quote, or scheduling path found.');
  }

  if (!/reply|dm|message|comment|follow[- ]?up/i.test(text)) {
    score -= 8;
    warnings.push('No obvious DM reply or follow-up language found.');
  }

  if (/\bI\b|\bwe\b/.test(text) && /as an ai|as a language model/i.test(text)) {
    score -= 50;
    warnings.push('AI self-reference found.');
  }

  score = Math.max(0, Math.min(maxScore, score));

  return {
    score,
    verdict: score >= 90 ? 'pass' : score >= 80 ? 'watch' : 'weak',
    text,
    warnings,
  };
}

function makeMarkdownReport(results) {
  const createdAt = new Date().toISOString();
  const weakCount = results.filter((result) => result.verdict === 'weak').length;
  const watchCount = results.filter((result) => result.verdict === 'watch').length;
  const passCount = results.filter((result) => result.verdict === 'pass').length;
  const averageScore = Math.round(results.reduce((sum, result) => sum + result.score, 0) / Math.max(results.length, 1));

  const lines = [
    '# Hummingbird QA Bot Report',
    '',
    `Created: ${createdAt}`,
    `Endpoint: ${endpoint}`,
    '',
    `Average score: **${averageScore}/100**`,
    `Pass: **${passCount}** · Watch: **${watchCount}** · Weak: **${weakCount}**`,
    '',
    '## Summary',
    '',
    '| Test | Score | Verdict | Runtime | Main warnings |',
    '|---|---:|---|---:|---|',
    ...results.map((result) => {
      const warningText = result.warnings.slice(0, 3).join('<br>') || 'None';
      return `| ${result.id} | ${result.score} | ${result.verdict} | ${result.durationMs}ms | ${warningText.replace(/\|/g, '\\|')} |`;
    }),
    '',
    '## Details',
    '',
  ];

  for (const result of results) {
    lines.push(`### ${result.id}`);
    lines.push('');
    lines.push(`Prompt: ${result.prompt}`);
    lines.push(`Score: ${result.score}/100`);
    lines.push(`Verdict: ${result.verdict}`);
    lines.push('');
    if (result.warnings.length) {
      lines.push('Warnings:');
      for (const warning of result.warnings) lines.push(`- ${warning}`);
      lines.push('');
    }
    lines.push('<details>');
    lines.push('<summary>Extracted output text</summary>');
    lines.push('');
    lines.push('```text');
    lines.push(result.text.slice(0, 8000) || '(No extracted text)');
    lines.push('```');
    lines.push('</details>');
    lines.push('');
  }

  return lines.join('\n');
}

async function main() {
  if (shouldRunChecks) {
    await runCommand('npm', ['run', 'lint']);
    await runCommand('npm', ['run', 'build']);
  }

  const tests = loadTests();
  mkdirSync(REPORT_DIR, { recursive: true });

  console.log(`\nRunning ${tests.length} Hummingbird QA test(s) against ${endpoint}\n`);

  const results = [];
  for (const test of tests) {
    process.stdout.write(`• ${test.id}... `);
    try {
      const apiResult = await callGenerate(test);
      const scored = scoreOutput(test, apiResult);
      results.push({
        id: test.id,
        prompt: test.prompt,
        businessType: test.businessType,
        status: apiResult.status,
        durationMs: apiResult.durationMs,
        ...scored,
      });
      console.log(`${scored.score}/100 ${scored.verdict} (${apiResult.durationMs}ms)`);
    } catch (error) {
      results.push({
        id: test.id,
        prompt: test.prompt,
        businessType: test.businessType,
        status: 0,
        durationMs: 0,
        score: 0,
        verdict: 'fail',
        text: '',
        warnings: [error instanceof Error ? error.message : String(error)],
      });
      console.log('failed');
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(REPORT_DIR, `${timestamp}.json`);
  const mdPath = path.join(REPORT_DIR, `${timestamp}.md`);

  writeFileSync(jsonPath, JSON.stringify({ endpoint, results }, null, 2));
  writeFileSync(mdPath, makeMarkdownReport(results));

  console.log('\nQA complete.');
  console.log(`JSON report: ${jsonPath}`);
  console.log(`Markdown report: ${mdPath}`);

  const weakResults = results.filter((result) => ['weak', 'fail'].includes(result.verdict));
  if (weakResults.length) {
    console.log('\nWeak/failing tests:');
    for (const result of weakResults) {
      console.log(`- ${result.id}: ${result.score}/100 — ${result.warnings[0] || 'Needs review'}`);
    }
  }

  if (shouldFailOnWeak && weakResults.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
