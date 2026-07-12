#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const REPORT_DIR = path.join(ROOT, 'builder-bot', 'reports');
const args = process.argv.slice(2);
const taskArg = args.find((arg) => arg.startsWith('--task='));
const shouldApply = args.includes('--apply');

const blockedPaths = [
  /^\.env/i,
  /^\.git(?:\/|$)/i,
  /^\.github(?:\/|$)/i,
  /^app\/api\/create-checkout-session/i,
  /^app\/api\/meta(?:\/|$)/i,
  /^(middleware|proxy)\.[a-z]+$/i,
];

function printHelp() {
  console.log(`
Hummingbird Builder Bot

Usage:
  npm run builder:bot -- --task=builder-bot/tasks/example.json
  npm run builder:bot -- --task=builder-bot/tasks/example.json --apply

Default behavior:
  Validates and previews the task without changing files.

--apply:
  Requires clean main, creates the approved task branch, applies exact
  replacements, runs lint/build/diff checks, writes a report, and stops.

The bot never commits, pushes, merges, deploys, publishes, or changes billing/auth.
`);
}

function fail(message) {
  throw new Error(message);
}

function run(command, commandArgs, options = {}) {
  return spawnSync(command, commandArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    ...options,
  });
}

function gitOutput(commandArgs) {
  const result = run('git', commandArgs);

  if (result.status !== 0) {
    fail(result.stderr?.trim() || `git ${commandArgs.join(' ')} failed.`);
  }

  return result.stdout.trim();
}

function runVisible(command, commandArgs) {
  console.log(`\n$ ${[command, ...commandArgs].join(' ')}`);

  const result = run(command, commandArgs, {
    stdio: 'inherit',
    encoding: undefined,
  });

  return {
    ok: result.status === 0,
    code: result.status ?? 1,
  };
}

function normalizeFile(file) {
  return file.replaceAll('\\', '/');
}

function validateFilePath(file) {
  if (typeof file !== 'string' || !file.trim()) {
    fail('Every allowed file must be a non-empty string.');
  }

  const normalized = normalizeFile(file.trim());

  if (
    path.isAbsolute(normalized) ||
    normalized === '..' ||
    normalized.startsWith('../') ||
    normalized.includes('/../')
  ) {
    fail(`Unsafe file path: ${file}`);
  }

  if (blockedPaths.some((pattern) => pattern.test(normalized))) {
    fail(`Builder Bot v1 cannot modify protected path: ${normalized}`);
  }

  return normalized;
}

function loadTask(taskFile) {
  if (!existsSync(taskFile)) {
    fail(`Task file not found: ${taskFile}`);
  }

  let task;

  try {
    task = JSON.parse(readFileSync(taskFile, 'utf8'));
  } catch (error) {
    fail(`Task file is not valid JSON: ${error.message}`);
  }

  for (const field of ['id', 'title', 'branch', 'summary']) {
    if (typeof task[field] !== 'string' || !task[field].trim()) {
      fail(`Task field "${field}" must be a non-empty string.`);
    }
  }

  if (
    !/^builder\/[a-z0-9][a-z0-9._/-]*$/.test(task.branch) ||
    task.branch.includes('..')
  ) {
    fail('Task branch must use a safe builder/... branch name.');
  }

  if (!Array.isArray(task.allowedFiles) || task.allowedFiles.length === 0) {
    fail('Task must include at least one allowed file.');
  }

  task.allowedFiles = [...new Set(task.allowedFiles.map(validateFilePath))];

  for (const field of ['requirements', 'acceptanceCriteria', 'operations']) {
    if (!Array.isArray(task[field])) {
      fail(`Task field "${field}" must be an array.`);
    }
  }

  task.operations.forEach((operation, index) => {
    if (operation.type !== 'replace_text') {
      fail(`Operation ${index + 1} must use type "replace_text".`);
    }

    operation.file = validateFilePath(operation.file);

    if (!task.allowedFiles.includes(operation.file)) {
      fail(
        `Operation ${index + 1} targets ${operation.file}, which is not approved in allowedFiles.`
      );
    }

    if (typeof operation.find !== 'string' || operation.find.length === 0) {
      fail(`Operation ${index + 1} must include non-empty find text.`);
    }

    if (typeof operation.replace !== 'string') {
      fail(`Operation ${index + 1} must include replacement text.`);
    }

    const expectedMatches = operation.expectedMatches ?? 1;

    if (!Number.isInteger(expectedMatches) || expectedMatches < 1 || expectedMatches > 20) {
      fail(`Operation ${index + 1} expectedMatches must be between 1 and 20.`);
    }

    operation.expectedMatches = expectedMatches;
  });

  return task;
}

function countOccurrences(text, search) {
  return text.split(search).length - 1;
}

function prepareChanges(task) {
  const plannedWrites = new Map();

  for (const [index, operation] of task.operations.entries()) {
    const absoluteFile = path.join(ROOT, operation.file);

    if (!existsSync(absoluteFile)) {
      fail(`Operation ${index + 1} file does not exist: ${operation.file}`);
    }

    const currentText =
      plannedWrites.get(operation.file) ?? readFileSync(absoluteFile, 'utf8');

    const actualMatches = countOccurrences(currentText, operation.find);

    if (actualMatches !== operation.expectedMatches) {
      fail(
        `Operation ${index + 1} expected ${operation.expectedMatches} match(es) in ` +
          `${operation.file}, but found ${actualMatches}. No files were changed.`
      );
    }

    plannedWrites.set(
      operation.file,
      currentText.split(operation.find).join(operation.replace)
    );
  }

  return plannedWrites;
}

function printPlan(task) {
  console.log('\nHummingbird Builder Bot task validated.');
  console.log(`Task: ${task.title}`);
  console.log(`Branch: ${task.branch}`);
  console.log(`Summary: ${task.summary}`);
  console.log(`Allowed files: ${task.allowedFiles.join(', ')}`);
  console.log(`Operations: ${task.operations.length}`);

  task.operations.forEach((operation, index) => {
    console.log(
      `  ${index + 1}. replace_text in ${operation.file} ` +
        `(${operation.expectedMatches} expected match(es))`
    );
  });

  console.log('\nNo files changed. Add --apply only after reviewing the task.');
}

function writeReport(task, status, changedFiles, checks) {
  mkdirSync(REPORT_DIR, { recursive: true });

  const createdAt = new Date().toISOString();
  const timestamp = createdAt.replace(/[:.]/g, '-');
  const markdownPath = path.join(REPORT_DIR, `${timestamp}-${task.id}.md`);
  const jsonPath = path.join(REPORT_DIR, `${timestamp}-${task.id}.json`);
  const diffStat = gitOutput(['diff', '--stat']);

  const report = {
    createdAt,
    task: {
      id: task.id,
      title: task.title,
      branch: task.branch,
      summary: task.summary,
    },
    status,
    changedFiles,
    checks,
    diffStat,
    safety: {
      committed: false,
      pushed: false,
      merged: false,
      deployed: false,
      approvalRequired: true,
    },
  };

  const lines = [
    '# Hummingbird Builder Bot Report',
    '',
    `Created: ${createdAt}`,
    `Task: **${task.title}**`,
    `Branch: \`${task.branch}\``,
    `Status: **${status}**`,
    '',
    '## Summary',
    '',
    task.summary,
    '',
    '## Changed files',
    '',
    ...(changedFiles.length
      ? changedFiles.map((file) => `- \`${file}\``)
      : ['- None']),
    '',
    '## Checks',
    '',
    `- Lint: ${checks.lint ? 'passed' : 'failed'}`,
    `- Build: ${checks.build ? 'passed' : 'failed'}`,
    `- Diff check: ${checks.diffCheck ? 'passed' : 'failed'}`,
    '',
    '## Acceptance criteria',
    '',
    ...task.acceptanceCriteria.map((criterion) => `- ${criterion}`),
    '',
    '## Diff summary',
    '',
    '```text',
    diffStat || '(No diff)',
    '```',
    '',
    '## Approval gate',
    '',
    'Builder Bot did not commit, push, merge, deploy, publish, or change billing/auth.',
    'A human must review the diff and explicitly approve the next action.',
    '',
  ];

  writeFileSync(markdownPath, lines.join('\n'));
  writeFileSync(jsonPath, JSON.stringify(report, null, 2) + '\n');

  return {
    markdownPath: path.relative(ROOT, markdownPath),
    jsonPath: path.relative(ROOT, jsonPath),
  };
}

function assertApplySafety(task) {
  const repositoryRoot = gitOutput(['rev-parse', '--show-toplevel']);

  if (path.resolve(repositoryRoot) !== path.resolve(ROOT)) {
    fail('Run Builder Bot from the repository root.');
  }

  const currentBranch = gitOutput(['branch', '--show-current']);

  if (currentBranch !== 'main') {
    fail(`Builder Bot --apply must start from clean main. Current branch: ${currentBranch}`);
  }

  const status = gitOutput(['status', '--porcelain']);

  if (status) {
    fail('Builder Bot --apply requires a clean working tree.');
  }

  for (const ref of [
    `refs/heads/${task.branch}`,
    `refs/remotes/origin/${task.branch}`,
  ]) {
    const result = run('git', ['show-ref', '--verify', '--quiet', ref]);

    if (result.status === 0) {
      fail(`Branch already exists: ${task.branch}`);
    }
  }
}

function main() {
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  if (!taskArg) {
    printHelp();
    fail('Missing required --task=path/to/task.json argument.');
  }

  const taskFile = path.resolve(ROOT, taskArg.split('=').slice(1).join('='));
  const task = loadTask(taskFile);

  if (!shouldApply) {
    printPlan(task);
    return;
  }

  if (task.operations.length === 0) {
    fail('Task has no operations to apply.');
  }

  assertApplySafety(task);
  const plannedWrites = prepareChanges(task);

  const checkout = runVisible('git', ['checkout', '-b', task.branch]);

  if (!checkout.ok) {
    fail(`Could not create task branch ${task.branch}.`);
  }

  for (const [file, content] of plannedWrites.entries()) {
    writeFileSync(path.join(ROOT, file), content);
  }

  const changedFiles = gitOutput(['diff', '--name-only'])
    .split('\n')
    .filter(Boolean);

  if (changedFiles.length === 0) {
    fail('Task produced no file changes.');
  }

  const unexpectedFiles = changedFiles.filter(
    (file) => !task.allowedFiles.includes(normalizeFile(file))
  );

  if (unexpectedFiles.length) {
    fail(`Unexpected changed files detected: ${unexpectedFiles.join(', ')}`);
  }

  const lint = runVisible('npm', ['run', 'lint']);
  const build = runVisible('npm', ['run', 'build']);
  const diffCheck = runVisible('git', ['diff', '--check']);

  const checks = {
    lint: lint.ok,
    build: build.ok,
    diffCheck: diffCheck.ok,
  };

  const status =
    checks.lint && checks.build && checks.diffCheck
      ? 'ready_for_human_review'
      : 'checks_failed';

  const reportPaths = writeReport(task, status, changedFiles, checks);

  console.log('\nBuilder Bot stopped at the approval gate.');
  console.log(`Markdown report: ${reportPaths.markdownPath}`);
  console.log(`JSON report: ${reportPaths.jsonPath}`);
  console.log('No commit, push, merge, or deploy was performed.');

  if (status !== 'ready_for_human_review') {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(`\nBuilder Bot stopped safely: ${error.message}`);
  process.exit(1);
}
