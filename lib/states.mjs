/**
 * lib/states.mjs — Shared state normalization (reads templates/states.yml at runtime)
 *
 * Single source of truth for canonical statuses. All pipeline scripts
 * (merge-tracker, normalize-statuses, verify-pipeline, dedup-tracker)
 * must import from here instead of hardcoding status lists.
 *
 * Unicode-safe: normalization functions preserve Korean/CJK characters.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const CAREER_OPS = new URL('..', import.meta.url).pathname;
const STATES_FILE = existsSync(join(CAREER_OPS, 'templates/states.yml'))
  ? join(CAREER_OPS, 'templates/states.yml')
  : join(CAREER_OPS, 'states.yml');

/**
 * Parse states.yml into { labels, aliasMap }.
 *   labels:   canonical labels in file order (array of strings)
 *   aliasMap: lowercased alias or label → canonical label (Map)
 *
 * Minimal YAML parser — only recognizes `label: X` and `aliases: [a, b]`.
 */
export function loadStates() {
  const labels = [];
  const aliasMap = new Map();

  if (!existsSync(STATES_FILE)) {
    throw new Error(`states.yml not found at ${STATES_FILE}`);
  }

  const text = readFileSync(STATES_FILE, 'utf-8');
  let currentLabel = null;

  for (const line of text.split('\n')) {
    const labelMatch = line.match(/^\s*label:\s*(.+?)\s*$/);
    if (labelMatch) {
      currentLabel = labelMatch[1];
      labels.push(currentLabel);
      aliasMap.set(currentLabel.toLowerCase(), currentLabel);
      continue;
    }
    const aliasMatch = line.match(/^\s*aliases:\s*\[(.+)\]\s*$/);
    if (aliasMatch && currentLabel) {
      for (const a of aliasMatch[1].split(',')) {
        const alias = a.trim().toLowerCase();
        if (alias) aliasMap.set(alias, currentLabel);
      }
    }
  }

  return { labels, aliasMap };
}

/**
 * Legacy Spanish → Korean canonical fallback (for historical data migration).
 * Consulted only when a raw status is not recognized by states.yml aliases.
 */
const LEGACY_FALLBACK = {
  'no aplicar': 'SKIP',
  'no_aplicar': 'SKIP',
  'geo blocker': 'SKIP',
  'monitor': 'SKIP',
  'cerrada': '보류',
  'cancelada': '보류',
  'descartada': '보류',
  'descartado': '보류',
  'rechazada': '불합격',
  'enviada': '지원',
  'aplicada': '지원',
  'aplicado': '지원',
  'condicional': '평가완료',
  'hold': '평가완료',
  'evaluar': '평가완료',
  'verificar': '평가완료',
  'evaluada': '평가완료',
  'respondido': '응답',
  'entrevista': '면접',
  'oferta': '오퍼',
  'rechazado': '불합격',
};

/**
 * Normalize a raw status string to the canonical Korean label.
 * Strips markdown bold, trailing dates, and surrounding whitespace.
 * Returns { status: canonical|null, unknown: boolean, moveToNotes?: string }.
 */
export function normalizeStatus(raw, aliasMap) {
  if (raw == null) return { status: null, unknown: true };

  // Strip bold, trailing dates (e.g. "Aplicado 2026-04-08"), whitespace
  let cleaned = raw
    .replace(/\*\*/g, '')
    .replace(/\s+\d{4}-\d{2}-\d{2}.*$/, '')
    .trim();

  const lower = cleaned.toLowerCase();

  // DUPLICADO / Repost variants → 보류 (preserve raw in notes)
  if (/^(duplicado|dup\b|repost)/i.test(cleaned)) {
    return { status: '보류', moveToNotes: raw.trim() };
  }

  // Empty / dash → 보류
  if (cleaned === '' || cleaned === '—' || cleaned === '-') {
    return { status: '보류' };
  }

  // Direct match from states.yml (label or alias)
  if (aliasMap.has(lower)) {
    return { status: aliasMap.get(lower) };
  }

  // Legacy Spanish → Korean fallback
  if (LEGACY_FALLBACK[lower]) {
    return { status: LEGACY_FALLBACK[lower] };
  }

  return { status: null, unknown: true };
}

/**
 * Status rank for dedup priority (higher = more advanced in the pipeline).
 * Terminal 불합격 is below active states so an Applied entry beats a Rejected dup.
 */
const STATUS_RANK = {
  'SKIP': 0,
  '보류': 0,
  '불합격': 1,
  '평가완료': 2,
  '지원': 3,
  '응답': 4,
  '면접': 5,
  '오퍼': 6,
};

export function statusRank(label) {
  return STATUS_RANK[label] ?? 0;
}

/**
 * Unicode-safe company name normalization.
 * Lowercases, NFKC-normalizes, strips whitespace/punctuation/symbols.
 * PRESERVES Korean/CJK/Latin letters and digits.
 *
 * The old `.replace(/[^a-z0-9]/g, '')` collapsed every Korean company
 * to the empty string, which caused verify-pipeline to flag every
 * Korean entry as a duplicate.
 */
export function normalizeCompany(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\s\p{P}\p{S}]+/gu, '');
}

/**
 * Unicode-safe role normalization. Collapses whitespace, strips punctuation,
 * preserves letters/digits in any script.
 */
export function normalizeRole(role) {
  if (!role) return '';
  return role
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strict role match: normalized strings must be equal.
 * Used for dedup — we prefer false negatives over false positives
 * (better to keep two similar-looking postings than merge distinct ones).
 */
export function roleMatch(a, b) {
  return normalizeRole(a) === normalizeRole(b);
}
