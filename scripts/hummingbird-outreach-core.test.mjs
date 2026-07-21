import assert from 'node:assert/strict';
import test from 'node:test';

import {
  approveOutreach,
  closeOutreach,
  createOutreachRecord,
  markFollowUpSent,
  markOutreachReplied,
  markOutreachSent,
  refreshOutreachStatus,
} from './hummingbird-outreach-core.mjs';

function sampleRecord() {
  return createOutreachRecord({
    businessName: 'Atlanta Yard Pros',
    niche: 'landscaping',
    location: 'Atlanta',
    instagram: '@exampleatlantayard',
    observedIssue: 'The quote CTA is unclear.',
    suggestedComment: 'Strong transformation.',
    suggestedDm: 'I made a free example.',
    followUpMessage: 'Following up in case this got buried.',
    demoPrompt: 'Create a landscaping post.',
    score: 85,
    priority: 'High',
  });
}

test('creates a drafted Instagram-first outreach record', () => {
  const record = sampleRecord();

  assert.equal(record.status, 'drafted');
  assert.equal(record.preferredChannel, 'instagram');
  assert.equal(record.id.length, 16);
});

test('requires approval before outreach is marked sent', () => {
  assert.throws(
    () => markOutreachSent(sampleRecord()),
    /Only approved outreach/
  );
});

test('approves, sends, and schedules one follow-up', () => {
  const approvedAt = new Date('2026-07-17T12:00:00Z');
  const sentAt = new Date('2026-07-18T12:00:00Z');

  const approved = approveOutreach(sampleRecord(), approvedAt);
  const sent = markOutreachSent(approved, sentAt, 4);

  assert.equal(approved.status, 'approved');
  assert.equal(sent.status, 'sent');
  assert.equal(
    sent.followUpDueAt,
    '2026-07-22T12:00:00.000Z'
  );
});

test('marks a sent message follow-up due after four days', () => {
  const approved = approveOutreach(sampleRecord());
  const sent = markOutreachSent(
    approved,
    new Date('2026-07-18T12:00:00Z'),
    4
  );

  const refreshed = refreshOutreachStatus(
    sent,
    new Date('2026-07-22T12:00:00Z')
  );

  assert.equal(refreshed.status, 'follow_up_due');
});

test('reply stops future follow-ups', () => {
  const approved = approveOutreach(sampleRecord());
  const sent = markOutreachSent(approved);
  const replied = markOutreachReplied(sent);

  assert.equal(replied.status, 'replied');
  assert.equal(replied.followUpDueAt, null);
});

test('only one follow-up can be marked sent', () => {
  const approved = approveOutreach(sampleRecord());
  const sent = markOutreachSent(
    approved,
    new Date('2026-07-18T12:00:00Z'),
    4
  );
  const due = refreshOutreachStatus(
    sent,
    new Date('2026-07-22T12:00:00Z')
  );
  const followedUp = markFollowUpSent(due);

  assert.equal(followedUp.status, 'followed_up');
  assert.throws(
    () => markFollowUpSent(followedUp),
    /Follow-up is not due/
  );
});

test('closing outreach removes any pending follow-up', () => {
  const approved = approveOutreach(sampleRecord());
  const sent = markOutreachSent(approved);
  const closed = closeOutreach(sent, 'not interested');

  assert.equal(closed.status, 'closed');
  assert.equal(closed.closedReason, 'not interested');
  assert.equal(closed.followUpDueAt, null);
});
