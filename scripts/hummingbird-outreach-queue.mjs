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
