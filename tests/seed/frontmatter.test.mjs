import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter } from '../../scripts/seed/frontmatter.mjs';

test('parses simple key-value pairs', () => {
  const input = `---
company: 딜라이트룸
field: 슬립테크/웰니스
location: 강남 (신논현역)
---
# Body
content here`;
  const { data, body } = parseFrontmatter(input);
  assert.equal(data.company, '딜라이트룸');
  assert.equal(data.field, '슬립테크/웰니스');
  assert.equal(data.location, '강남 (신논현역)');
  assert.equal(body.trim(), '# Body\ncontent here');
});

test('parses inline list syntax', () => {
  const input = `---
stack: [Golang, Node.js, Python, Kubernetes]
---
body`;
  const { data } = parseFrontmatter(input);
  assert.deepEqual(data.stack, ['Golang', 'Node.js', 'Python', 'Kubernetes']);
});

test('parses booleans', () => {
  const input = `---
open: true
closed: false
---
body`;
  const { data } = parseFrontmatter(input);
  assert.equal(data.open, true);
  assert.equal(data.closed, false);
});

test('parses double-quoted strings (preserving inner content)', () => {
  const input = `---
rating: "잡플 4.8 / 블라 4.7"
---
body`;
  const { data } = parseFrontmatter(input);
  assert.equal(data.rating, '잡플 4.8 / 블라 4.7');
});

test('returns empty data when no frontmatter', () => {
  const input = `# Just a heading\n\nNo frontmatter here.`;
  const { data, body } = parseFrontmatter(input);
  assert.deepEqual(data, {});
  assert.equal(body, input);
});

test('handles dates as strings', () => {
  const input = `---
updated: 2026-02-28
---
body`;
  const { data } = parseFrontmatter(input);
  assert.equal(data.updated, '2026-02-28');
});

test('preserves colons inside values (URLs)', () => {
  const input = `---
url: https://team.alar.my/job_posting/fYEkfMEa
github: https://github.com/olion500
---
body`;
  const { data } = parseFrontmatter(input);
  assert.equal(data.url, 'https://team.alar.my/job_posting/fYEkfMEa');
  assert.equal(data.github, 'https://github.com/olion500');
});
