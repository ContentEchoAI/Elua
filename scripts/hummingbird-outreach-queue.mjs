#!/usr/bin/env node
import {
  existsSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';

import {
  approveOutreach,
  closeOutreach,
  markFollowUpSent,
  markOutreachReplied,
  markOutreachSent,
  refreshOutreachStatus,
} from './hummingbird-outreach-core.mjs';

const queuePath = 'lead-finder/outreach-queue.json';
const [command = 'status', id = '', ...rest] =
  process.argv.slice(2);

if (!existsSync(queuePath)) {
  console.error(
    'Outreach queue not found. Run npm run lead:finder first.'
  );
  process.exit(1);
}

function loadQueue() {
  const parsed = JSON.parse(readFileSync(queuePath, 'utf8'));

  if (!Array.isArray(parsed)) {
    throw new Error('Outreach queue is invalid.');
  }

  return parsed;
}

function saveQueue(queue) {
  writeFileSync(
    queuePath,
    `${JSON.stringify(queue, null, 2)}\n`
  );
}

function findRecord(queue, recordId) {
  const index = queue.findIndex(
    (record) => record.id === recordId
  );

  if (index === -1) {
    throw new Error(`Outreach record not found: ${recordId}`);
  }

  return { index, record: queue[index] };
}

function showStatus(queue) {
  const refreshed = queue.map((record) =>
    refreshOutreachStatus(record)
  );

  if (
    JSON.stringify(refreshed) !== JSON.stringify(queue)
  ) {
    saveQueue(refreshed);
  }

  console.table(
    refreshed.map(
      ({
        id,
        businessName,
        preferredChannel,
        status,
        followUpDueAt,
      }) => ({
        id,
        businessName,
        preferredChannel,
        status,
        followUpDueAt: followUpDueAt || '',
      })
    )
  );

  console.log(
    'Sending remains manual. This tool only updates queue state.'
  );
}

try {
  const queue = loadQueue();

  if (command === 'status') {
    showStatus(queue);
    process.exit(0);
  }

  if (command === 'show') {
    if (!id) {
      throw new Error('An outreach ID is required for "show".');
    }

    const { record } = findRecord(queue, id);
    const instagramHandle = String(record.instagram || '')
      .trim()
      .replace(/^@/, '');
    const instagramUrl = instagramHandle
      ? `https://www.instagram.com/${instagramHandle}/`
      : '';

    console.log(`Business: ${record.businessName}`);
    console.log(`Status: ${record.status}`);
    console.log(`Channel: ${record.preferredChannel}`);
    console.log(`Instagram: ${record.instagram || 'Not provided'}`);
    if (instagramUrl) console.log(`Profile: ${instagramUrl}`);
    if (record.email) console.log(`Email: ${record.email}`);
    if (record.website) console.log(`Website: ${record.website}`);
    console.log('');
    console.log('Observed issue:');
    console.log(record.observedIssue);
    console.log('');
    console.log('Suggested comment:');
    console.log(record.suggestedComment);
    console.log('');
    console.log('Suggested DM:');
    console.log(record.suggestedDm);
    console.log('');
    console.log('One follow-up:');
    console.log(record.followUpMessage);
    console.log('');
    console.log('Demo prompt:');
    console.log(record.demoPrompt);
    console.log('');
    console.log('Nothing was sent automatically.');
    process.exit(0);
  }

  if (!id) {
    throw new Error(
      `An outreach ID is required for "${command}".`
    );
  }

  const { index, record } = findRecord(queue, id);
  let updated;

  switch (command) {
    case 'approve':
      updated = approveOutreach(record);
      break;

    case 'sent':
      updated = markOutreachSent(record);
      break;

    case 'followed-up':
      updated = markFollowUpSent(
        refreshOutreachStatus(record)
      );
      break;

    case 'replied':
      updated = markOutreachReplied(record);
      break;

    case 'close':
      updated = closeOutreach(
        record,
        rest.join(' ').trim() || 'closed'
      );
      break;

    default:
      throw new Error(`Unknown command: ${command}`);
  }

  queue[index] = updated;
  saveQueue(queue);

  console.log(
    `${updated.businessName}: ${record.status} → ${updated.status}`
  );
  console.log(
    'No Instagram DM or email was sent automatically.'
  );
} catch (error) {
  console.error(
    error instanceof Error ? error.message : error
  );
  process.exit(1);
}
