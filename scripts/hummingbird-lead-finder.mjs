#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';

import { createOutreachRecord } from './hummingbird-outreach-core.mjs';

const args = process.argv.slice(2);
const inputArg = args.find((arg) => arg.startsWith('--input='));

const inputPath = inputArg
  ? inputArg.split('=').slice(1).join('=')
  : 'lead-finder/sample-leads.csv';

const reportDir = 'lead-finder/reports';
const queuePath = 'lead-finder/outreach-queue.json';

if (!existsSync(inputPath)) {
  console.error(`Missing input file: ${inputPath}`);
  process.exit(1);
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      values.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }

  values.push(current.trim());
  return values;
}

function scoreLead(niche, instagram, website, notes) {
  const value = `${niche} ${notes}`.toLowerCase();
  let score = 50;

  if (/before|after|photo|photos|visual|video|reel/.test(value)) score += 15;
  if (/cta|dm|quote|booking|caption|generic|unclear|estimate/.test(value)) {
    score += 20;
  }
  if (/cleaning|detail|lash|nail|landscap|massage|chiro|fitness/.test(value)) {
    score += 15;
  }
  if (!instagram && !website) score -= 15;

  return Math.max(0, Math.min(100, score));
}

function priority(score) {
  if (score >= 80) return 'High';
  if (score >= 60) return 'Medium';
  return 'Low';
}

function loadExistingQueue() {
  if (!existsSync(queuePath)) return [];

  try {
    const parsed = JSON.parse(readFileSync(queuePath, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.warn('Existing outreach queue could not be read. Starting fresh.');
    return [];
  }
}

const text = readFileSync(inputPath, 'utf8').trim();
const rows = text.split(/\r?\n/).filter(Boolean);
const headers = parseCsvLine(rows[0] || '');
const leadRows = rows.slice(1).map((row) => {
  const values = parseCsvLine(row);

  return Object.fromEntries(
    headers.map((header, index) => [header, values[index] || ''])
  );
});

const existingQueue = loadExistingQueue();
const existingById = new Map(
  existingQueue.map((record) => [record.id, record])
);

const queue = [];
const reportLines = [
  '# Hummingbird Lead Finder Report',
  '',
  `Created: ${new Date().toISOString()}`,
  '',
  '> Draft-only queue. Nothing is sent automatically.',
  '',
  '| Priority | Score | Business | Niche | Location | Channel | Status |',
  '|---|---:|---|---|---|---|---|',
];

const detailLines = ['', '## Outreach Drafts', ''];

console.log('Lead Finder Bot v2');
console.log(`Input: ${inputPath}`);
console.log(`Lead rows found: ${leadRows.length}`);
console.log('Sending: disabled — drafts only');

for (const lead of leadRows) {
  const {
    businessName = '',
    niche = '',
    location = '',
    instagram = '',
    email = '',
    website = '',
    notes = '',
  } = lead;

  if (!businessName) continue;

  const score = scoreLead(niche, instagram, website, notes);
  const leadPriority = priority(score);
  const observedIssue =
    notes || 'The next step for interested people could be clearer.';

  const suggestedComment =
    `Strong ${niche} content. The before-and-after or finished-work posts ` +
    'would be even easier to act on with one clear next step.';

  const suggestedDm =
    `Hey — I came across ${businessName} and noticed you already have ` +
    `strong ${niche} content. ${observedIssue} ` +
    'I’m testing Hummingbird AI, a workspace that turns one service photo ' +
    'into a ready-to-post caption, CTA, and customer reply. I’d be happy ' +
    'to make one free example from a recent post if that would be useful.';

  const followUpMessage =
    'Just following up in case this got buried. I’d still be happy to ' +
    'create one free post example from one of your recent photos—no commitment.';

  const demoPrompt =
    `${niche} in ${location}. Turn this service photo into a natural ` +
    'Instagram or Facebook post with one clear inquiry CTA.';

  const draft = createOutreachRecord({
    businessName,
    niche,
    location,
    instagram,
    email,
    website,
    observedIssue,
    suggestedComment,
    suggestedDm,
    followUpMessage,
    demoPrompt,
    score,
    priority: leadPriority,
  });

  const existing = existingById.get(draft.id);

  const record = existing
    ? {
        ...draft,
        status: existing.status,
        approvedAt: existing.approvedAt || null,
        sentAt: existing.sentAt || null,
        followUpDueAt: existing.followUpDueAt || null,
        followedUpAt: existing.followedUpAt || null,
        repliedAt: existing.repliedAt || null,
        closedAt: existing.closedAt || null,
        closedReason: existing.closedReason || null,
        createdAt: existing.createdAt || draft.createdAt,
        updatedAt: existing.updatedAt || draft.updatedAt,
      }
    : draft;

  queue.push(record);

  console.log(
    `- ${leadPriority} ${score}/100 — ${businessName} — ` +
      `${record.preferredChannel} — ${record.status}`
  );

  reportLines.push(
    `| ${leadPriority} | ${score} | ${businessName} | ${niche} | ` +
      `${location} | ${record.preferredChannel} | ${record.status} |`
  );

  detailLines.push(`### ${businessName}`);
  detailLines.push('');
  detailLines.push(`Queue ID: \`${record.id}\``);
  detailLines.push(`Preferred channel: **${record.preferredChannel}**`);
  detailLines.push(`Status: **${record.status}**`);
  detailLines.push('');
  detailLines.push('Observed issue:');
  detailLines.push(`> ${observedIssue}`);
  detailLines.push('');
  detailLines.push('Suggested comment:');
  detailLines.push(`> ${suggestedComment}`);
  detailLines.push('');
  detailLines.push('Suggested DM:');
  detailLines.push(`> ${suggestedDm}`);
  detailLines.push('');
  detailLines.push('One follow-up:');
  detailLines.push(`> ${followUpMessage}`);
  detailLines.push('');
  detailLines.push('Demo prompt:');
  detailLines.push(`\`${demoPrompt}\``);
  detailLines.push('');
}

queue.sort((first, second) => second.score - first.score);

mkdirSync(reportDir, { recursive: true });
writeFileSync(
  `${reportDir}/latest.md`,
  `${[...reportLines, ...detailLines].join('\n')}\n`
);
writeFileSync(queuePath, `${JSON.stringify(queue, null, 2)}\n`);

console.log(`Report written: ${reportDir}/latest.md`);
console.log(`Draft queue written: ${queuePath}`);
console.log('Review and approval are required before any manual outreach.');
