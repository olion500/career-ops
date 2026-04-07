import { parseFrontmatter } from './frontmatter.mjs';
import { slugFor } from './slug-table.mjs';

export function parseCompany(text) {
  const { data, body } = parseFrontmatter(text);
  if (!data.company) {
    throw new Error('Company file missing required "company" field in frontmatter');
  }
  return {
    name: data.company,
    slug: slugFor(data.company),
    field: data.field || '',
    location: data.location || '',
    remote: data.remote || '',
    stack: Array.isArray(data.stack) ? data.stack : [],
    job: data.job || '',
    url: data.url || '',
    rating: data.rating || '',
    rawStatus: data.status || '',
    open: data.open === true,
    updated: data.updated || '',
    body,
  };
}
