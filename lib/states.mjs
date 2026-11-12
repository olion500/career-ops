// Compatibility surface for the Korean fork. The latest upstream tracker
// utilities now own Unicode-safe company matching and canonical state reads.
import { loadCanonicalStates, resolveCanonicalStateId, normalizeCompany } from '../tracker-utils.mjs';
export { normalizeCompany };
const states = () => loadCanonicalStates(new URL('../templates/states.yml', import.meta.url));
export function loadStates() {
  const canonical = states(), aliasMap = new Map();
  for (const s of canonical) for (const a of [s.id, s.label, ...s.aliases]) aliasMap.set(a.toLowerCase(), s.label);
  return { labels: canonical.map(s => s.label), aliasMap };
}
export function normalizeStatus(raw, aliasMap = loadStates().aliasMap) {
  if (raw == null) return { status: null, unknown: true };
  const cleaned = String(raw).replace(/\*\*/g, '').replace(/\s+\d{4}-\d{2}-\d{2}.*$/, '').trim();
  const discard = states().find(s => s.id === 'discarded').label;
  if (/^(duplicado|dup\b|repost)/i.test(cleaned)) return { status: discard, moveToNotes: String(raw).trim() };
  if (!cleaned || ['—', '-'].includes(cleaned)) return { status: discard };
  const status = aliasMap.get(cleaned.toLowerCase());
  return status ? { status } : { status: null, unknown: true };
}
export function statusRank(label) {
  const id = resolveCanonicalStateId(label, states());
  return ({ skip: 0, discarded: 0, rejected: 1, evaluated: 2, applied: 3, responded: 4, assessment: 5, interview: 6, offer: 7, hired: 8 })[id] ?? 0;
}
export function normalizeRole(role) {
  return String(role || '').normalize('NFKC').toLowerCase().replace(/[\p{P}\p{S}]+/gu, ' ').replace(/\s+/g, ' ').trim();
}
export function roleMatch(a, b) { return normalizeRole(a) === normalizeRole(b); }
