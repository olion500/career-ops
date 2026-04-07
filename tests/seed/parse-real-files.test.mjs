// Smoke test: every real Obsidian 기업/*.md file must parse cleanly.
// Guards against schema-drift between assumed fixtures and actual files.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { parseCompany } from '../../scripts/seed/parse-company.mjs';

const COMPANIES_DIR = '/Users/2302-pc04/space/docs/02_Areas/기업';

test('all 기업/*.md files parse without throwing', { skip: !existsSync(COMPANIES_DIR) }, () => {
  const files = readdirSync(COMPANIES_DIR).filter(f => f.endsWith('.md'));
  assert.ok(files.length > 0, 'expected at least one company file');

  const failures = [];
  for (const file of files) {
    const text = readFileSync(join(COMPANIES_DIR, file), 'utf-8');
    try {
      const record = parseCompany(text);
      assert.ok(record.name, `${file}: empty name`);
      assert.ok(record.slug, `${file}: empty slug`);
    } catch (e) {
      failures.push(`${file}: ${e.message}`);
    }
  }
  assert.deepEqual(failures, [], `parse failures:\n${failures.join('\n')}`);
});
