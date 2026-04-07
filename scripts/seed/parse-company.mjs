import { parseFrontmatter } from './frontmatter.mjs';
import { slugFor } from './slug-table.mjs';

// Strip trailing parenthetical (English alias) from a Korean company name.
// "가우스랩스 (GaussLabs)" → "가우스랩스"
// "AB180" → "AB180"
function normalizeName(raw) {
  return raw.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

export function parseCompany(text) {
  const { data, body } = parseFrontmatter(text);
  // Support both old (company/stack/url/...) and new (company_name/tech_stack/job_board/...) schemas.
  const rawName = data.company || data.company_name;
  if (!rawName) {
    throw new Error('Company file missing required "company" field in frontmatter');
  }
  const name = normalizeName(rawName);
  const stack = data.stack || data.tech_stack || [];
  return {
    name,
    slug: slugFor(name),
    field: data.field || '',
    location: data.location || '',
    remote: data.remote || '',
    stack: Array.isArray(stack) ? stack : [],
    job: data.job || data.job_title || '',
    url: data.url || data.job_board || '',
    rating: data.rating || '',
    rawStatus: data.status || data.apply_status || '',
    open: (data.open === true) || (data.job_open === true),
    updated: data.updated || '',
    body,
  };
}
