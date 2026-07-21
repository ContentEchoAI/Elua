import crypto from 'node:crypto';

export const OUTREACH_STATUSES = [
  'drafted',
  'approved',
  'sent',
  'follow_up_due',
  'followed_up',
  'replied',
  'closed',
];

export function createOutreachId({
  businessName,
  instagram,
  email,
}) {
  return crypto
    .createHash('sha256')
    .update(
      `${businessName || ''}|${instagram || ''}|${email || ''}`
        .trim()
        .toLowerCase()
    )
    .digest('hex')
    .slice(0, 16);
}

export function createOutreachRecord({
  businessName,
  niche,
  location,
  instagram = '',
  email = '',
  website = '',
  observedIssue,
  suggestedComment,
  suggestedDm,
  followUpMessage,
  demoPrompt,
  score,
  priority,
}) {
  const now = new Date().toISOString();

  return {
    id: createOutreachId({ businessName, instagram, email }),
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
    priority,
    preferredChannel: instagram ? 'instagram' : email ? 'email' : 'manual',
    status: 'drafted',
    approvedAt: null,
    sentAt: null,
    followUpDueAt: null,
    followedUpAt: null,
    repliedAt: null,
    closedAt: null,
    closedReason: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function approveOutreach(record, now = new Date()) {
  if (record.status !== 'drafted') {
    throw new Error('Only drafted outreach can be approved.');
  }

  return {
    ...record,
    status: 'approved',
    approvedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export function markOutreachSent(
  record,
  now = new Date(),
  followUpDelayDays = 4
) {
  if (record.status !== 'approved') {
    throw new Error('Only approved outreach can be marked sent.');
  }

  const followUpDue = new Date(now);
  followUpDue.setUTCDate(followUpDue.getUTCDate() + followUpDelayDays);

  return {
    ...record,
    status: 'sent',
    sentAt: now.toISOString(),
    followUpDueAt: followUpDue.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export function refreshOutreachStatus(record, now = new Date()) {
  if (
    record.status === 'sent' &&
    record.followUpDueAt &&
    now >= new Date(record.followUpDueAt)
  ) {
    return {
      ...record,
      status: 'follow_up_due',
      updatedAt: now.toISOString(),
    };
  }

  return record;
}

export function markFollowUpSent(record, now = new Date()) {
  if (record.status !== 'follow_up_due') {
    throw new Error('Follow-up is not due for this outreach.');
  }

  return {
    ...record,
    status: 'followed_up',
    followedUpAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export function markOutreachReplied(record, now = new Date()) {
  if (record.status === 'closed') {
    throw new Error('Closed outreach cannot be marked replied.');
  }

  return {
    ...record,
    status: 'replied',
    repliedAt: now.toISOString(),
    followUpDueAt: null,
    updatedAt: now.toISOString(),
  };
}

export function closeOutreach(
  record,
  reason,
  now = new Date()
) {
  return {
    ...record,
    status: 'closed',
    closedAt: now.toISOString(),
    closedReason: reason || 'closed',
    followUpDueAt: null,
    updatedAt: now.toISOString(),
  };
}
