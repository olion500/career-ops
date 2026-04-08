#!/usr/bin/env node
/**
 * normalize-statuses.mjs — Clean non-canonical states in applications.md
 *
 * Maps all non-canonical statuses to canonical ones per templates/states.yml.
 * Strips markdown bold and trailing dates from the status field.
 * Also sorts entries by # (ascending) so recent batches stay ordered.
 *
 * Run: node career-ops/normalize-statuses.mjs [--dry-run]
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'fs';
import { join } from 'path';
import { loadStates, normalizeStatus } from './lib/states.mjs';

const CAREER_OPS = new URL('.', import.meta.url).pathname;
const APPS_FILE = existsSync(join(CAREER_OPS, 'data/applications.md'))
  ? join(CAREER_OPS, 'data/applications.md')
  : join(CAREER_OPS, 'applications.md');
const DRY_RUN = process.argv.includes('--dry-run');

const { aliasMap } = loadStates();

if (!existsSync(APPS_FILE)) {
  console.log('No applications.md found. Nothing to normalize.');
  process.exit(0);
}
const content = readFileSync(APPS_FILE, 'utf-8');
const lines = content.split('\n');

let changes = 0;
let unknowns = [];

// --- Pass 1: normalize statuses in place ---
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line.startsWith('|')) continue;

  const parts = line.split('|').map(s => s.trim());
  if (parts.length < 9) continue;
  if (parts[1] === '#' || parts[1] === '---' || parts[1] === '') continue;

  const num = parseInt(parts[1]);
  if (isNaN(num)) continue;

  const rawStatus = parts[6];
  const result = normalizeStatus(rawStatus, aliasMap);

  if (result.unknown) {
    unknowns.push({ num, rawStatus, line: i + 1 });
    continue;
  }

  if (result.status === rawStatus && !parts[5].includes('**')) continue;

  const oldStatus = rawStatus;
  parts[6] = result.status;

  if (result.moveToNotes) {
    const existing = parts[9] || '';
    if (!existing.includes(result.moveToNotes)) {
      parts[9] = result.moveToNotes + (existing ? '. ' + existing : '');
    }
  }

  if (parts[5]) parts[5] = parts[5].replace(/\*\*/g, '');

  const newLine = '| ' + parts.slice(1, -1).join(' | ') + ' |';
  lines[i] = newLine;
  if (oldStatus !== result.status) {
    changes++;
    console.log(`#${num}: "${oldStatus}" → "${result.status}"`);
  }
}

if (unknowns.length > 0) {
  console.log(`\n⚠️  ${unknowns.length} unknown statuses:`);
  for (const u of unknowns) {
    console.log(`  #${u.num} (line ${u.line}): "${u.rawStatus}"`);
  }
}

// --- Pass 2: sort data rows by # (ascending), keep header/non-data rows in place ---
const dataRowIdx = [];
const dataRows = [];
for (let i = 0; i < lines.length; i++) {
  if (!lines[i].startsWith('|')) continue;
  const parts = lines[i].split('|').map(s => s.trim());
  if (parts.length < 9) continue;
  const num = parseInt(parts[1]);
  if (isNaN(num)) continue;
  dataRowIdx.push(i);
  dataRows.push({ num, line: lines[i] });
}

const sortedRows = [...dataRows].sort((a, b) => a.num - b.num);
let sortChanges = 0;
for (let k = 0; k < dataRowIdx.length; k++) {
  if (lines[dataRowIdx[k]] !== sortedRows[k].line) {
    lines[dataRowIdx[k]] = sortedRows[k].line;
    sortChanges++;
  }
}
if (sortChanges > 0) {
  console.log(`\n🔢 Sorted ${sortChanges} rows by #`);
}

console.log(`\n📊 ${changes} statuses normalized, ${sortChanges} rows reordered`);

if (!DRY_RUN && (changes > 0 || sortChanges > 0)) {
  copyFileSync(APPS_FILE, APPS_FILE + '.bak');
  writeFileSync(APPS_FILE, lines.join('\n'));
  console.log('✅ Written to applications.md (backup: applications.md.bak)');
} else if (DRY_RUN) {
  console.log('(dry-run — no changes written)');
} else {
  console.log('✅ No changes needed');
}
