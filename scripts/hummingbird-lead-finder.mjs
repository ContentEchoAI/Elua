#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const inputPath = 'lead-finder/sample-leads.csv';
const reportDir = 'lead-finder/reports';

if (!existsSync(inputPath)) {
  console.error(`Missing input file: ${inputPath}`);
  process.exit(1);
}

const text = readFileSync(inputPath, 'utf8').trim();
const rows = text.split(/\r?\n/).filter(Boolean);

console.log('Lead Finder Bot v1');
console.log(`Input: ${inputPath}`);
const leadRows = rows.slice(1);

console.log(`Lead rows found: ${leadRows.length}`);

function scoreLead(niche, instagram, website, notes) {
  const text = `${niche} ${notes}`.toLowerCase();
  let score = 50;

  if (/before|after|photo|photos|visual|video|reel/.test(text)) score += 15;
  if (/cta|dm|quote|booking|caption|generic|unclear|estimate/.test(text)) score += 20;
  if (/cleaning|detail|lash|nail|landscap|massage|chiro|fitness/.test(text)) score += 15;
  if (!instagram && !website) score -= 15;

  return Math.max(0, Math.min(100, score));
}

function priority(score) {
  if (score >= 80) return 'High';
  if (score >= 60) return 'Medium';
  return 'Low';
}

const reportLines = [
  '# Hummingbird Lead Finder Report',
  '',
  `Created: ${new Date().toISOString()}`,
  '',
  '| Priority | Score | Business | Niche | Location |',
  '|---|---:|---|---|---|',
];

const detailLines = ['', '## Outreach Drafts', ''];

for (const row of leadRows) {
  const [businessName, niche, location, instagram, website, notes] = row.split(',');
  const score = scoreLead(niche, instagram, website, notes);
  const leadPriority = priority(score);

  console.log(`- ${leadPriority} ${score}/100 — ${businessName} — ${niche} — ${location}`);
  reportLines.push(`| ${leadPriority} | ${score} | ${businessName} | ${niche} | ${location} |`);

  detailLines.push(`### ${businessName}`);
  detailLines.push('');
  detailLines.push(`Suggested comment:`);
  detailLines.push(`> Your ${niche} content already shows the work. The main thing I’d add is a clear CTA so people know what to message next.`);
  detailLines.push('');
  detailLines.push(`Suggested DM:`);
  detailLines.push(`> Hey — I’m building Hummingbird AI for local service businesses. It turns one service idea or photo into a ready-to-post caption, CTA, and reply path. Your ${niche} content looked like a good fit, so I made a sample prompt you could try.`);
  detailLines.push('');
  detailLines.push(`Demo prompt:`);
  detailLines.push(`\`${niche} in ${location}. Turn this into an Instagram post that gets inquiries.\``);
  detailLines.push('');
}

mkdirSync(reportDir, { recursive: true });
writeFileSync(`${reportDir}/latest.md`, `${[...reportLines, ...detailLines].join('\n')}\n`);
console.log(`Report written: ${reportDir}/latest.md`);
