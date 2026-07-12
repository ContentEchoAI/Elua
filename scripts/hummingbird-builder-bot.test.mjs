import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

const builderScript = path.resolve('scripts/hummingbird-builder-bot.mjs');

function run(command, args, cwd) {
  return spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
  });
}

function git(repo, args) {
  const result = run('git', args, repo);

  assert.equal(
    result.status,
    0,
    result.stderr || `git ${args.join(' ')} failed`
  );

  return result.stdout.trim();
}

function createRepo(task) {
  const repo = mkdtempSync(path.join(tmpdir(), 'hummingbird-builder-bot-'));

  git(repo, ['init', '-q', '-b', 'main']);
  git(repo, ['config', 'user.email', 'builder-test@hummingbird.local']);
  git(repo, ['config', 'user.name', 'Builder Bot Test']);

  writeFileSync(
    path.join(repo, 'package.json'),
    JSON.stringify(
      {
        scripts: {
          lint: 'node -e ""',
          build: 'node -e ""',
        },
      },
      null,
      2
    ) + '\n'
  );

  writeFileSync(path.join(repo, 'sample.txt'), 'before\n');
  writeFileSync(
    path.join(repo, 'task.json'),
    JSON.stringify(task, null, 2) + '\n'
  );

  git(repo, ['add', '.']);
  git(repo, ['commit', '-qm', 'Baseline']);

  return repo;
}

function makeTask(operations = []) {
  return {
    id: 'smoke-test',
    title: 'Builder Bot smoke test',
    branch: 'builder/smoke-test',
    summary: 'Verify Builder Bot safety behavior.',
    allowedFiles: ['sample.txt'],
    requirements: ['Change only sample.txt.'],
    acceptanceCriteria: ['Stop before commit, push, merge, or deploy.'],
    operations,
  };
}

test('preview validates without changing files', () => {
  const repo = createRepo(makeTask());

  try {
    const result = run(
      process.execPath,
      [builderScript, '--task=task.json'],
      repo
    );

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /No files changed/);
    assert.equal(git(repo, ['branch', '--show-current']), 'main');
    assert.equal(readFileSync(path.join(repo, 'sample.txt'), 'utf8'), 'before\n');
    assert.equal(git(repo, ['rev-list', '--count', 'HEAD']), '1');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('apply changes only the approved file and stops before commit', () => {
  const repo = createRepo(
    makeTask([
      {
        type: 'replace_text',
        file: 'sample.txt',
        find: 'before',
        replace: 'after',
        expectedMatches: 1,
      },
    ])
  );

  try {
    const result = run(
      process.execPath,
      [builderScript, '--task=task.json', '--apply'],
      repo
    );

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /approval gate/);
    assert.equal(git(repo, ['branch', '--show-current']), 'builder/smoke-test');
    assert.equal(readFileSync(path.join(repo, 'sample.txt'), 'utf8'), 'after\n');
    assert.equal(git(repo, ['rev-list', '--count', 'HEAD']), '1');

    const reports = readdirSync(path.join(repo, 'builder-bot', 'reports'));
    assert.equal(reports.some((file) => file.endsWith('.md')), true);
    assert.equal(reports.some((file) => file.endsWith('.json')), true);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('protected paths are rejected', () => {
  const task = makeTask();
  task.allowedFiles = ['.env.local'];

  const repo = createRepo(task);

  try {
    const result = run(
      process.execPath,
      [builderScript, '--task=task.json'],
      repo
    );

    assert.equal(result.status, 1);
    assert.match(result.stderr, /protected path/i);
    assert.equal(git(repo, ['branch', '--show-current']), 'main');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
