// Minimal YAML frontmatter parser for Obsidian markdown files.
// Supports: scalar key:value, quoted strings, inline lists [a, b], booleans.
// Does NOT support: nested objects, multiline strings, anchors.

export function parseFrontmatter(text) {
  if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) {
    return { data: {}, body: text };
  }
  // Find closing ---
  const lines = text.split('\n');
  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      endIdx = i;
      break;
    }
  }
  if (endIdx === -1) return { data: {}, body: text };

  const fmLines = lines.slice(1, endIdx);
  const body = lines.slice(endIdx + 1).join('\n');
  const data = {};

  for (const line of fmLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    const rawValue = trimmed.slice(colonIdx + 1).trim();
    data[key] = parseValue(rawValue);
  }

  return { data, body };
}

function parseValue(raw) {
  if (raw === '') return '';
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  // Quoted string
  if ((raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  // Inline list [a, b, c]
  if (raw.startsWith('[') && raw.endsWith(']')) {
    const inner = raw.slice(1, -1).trim();
    if (inner === '') return [];
    return inner.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
  }
  // Bare scalar (string)
  return raw;
}
