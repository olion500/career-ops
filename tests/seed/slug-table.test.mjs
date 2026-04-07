import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SLUG_TABLE, slugFor, allSlugs } from '../../scripts/seed/slug-table.mjs';

test('slug table covers 33 unique companies (aliases allowed)', () => {
  const uniqueSlugs = new Set(allSlugs());
  assert.equal(uniqueSlugs.size, 33);
});

test('all slugs are kebab-case ASCII', () => {
  for (const slug of allSlugs()) {
    assert.match(slug, /^[a-z0-9-]+$/, `Slug "${slug}" is not lowercase kebab-case ASCII`);
  }
});

test('slugFor returns mapped slug', () => {
  assert.equal(slugFor('딜라이트룸'), 'delight-room');
  assert.equal(slugFor('네이버웹툰'), 'naver-webtoon');
  assert.equal(slugFor('AB180'), 'ab180');
});

test('slugFor throws helpful error for unknown company', () => {
  assert.throws(
    () => slugFor('Unknown회사'),
    /No slug mapping for company "Unknown회사"/
  );
});
