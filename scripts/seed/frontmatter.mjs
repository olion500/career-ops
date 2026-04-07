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

  for (let i = 0; i < fmLines.length; i++) {
    const line = fmLines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    // List item line — handled by lookahead below; skip if encountered standalone.
    if (line.match(/^\s+-\s/)) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    const rawValue = trimmed.slice(colonIdx + 1).trim();

    // Multi-line block list: empty value followed by indented `- item` lines.
    if (rawValue === '' && i + 1 < fmLines.length && fmLines[i + 1].match(/^\s+-\s/)) {
      const items = [];
      let j = i + 1;
      while (j < fmLines.length && fmLines[j].match(/^\s+-\s/)) {
        items.push(fmLines[j].replace(/^\s+-\s+/, '').trim().replace(/^["']|["']$/g, ''));
        j++;
      }
      data[key] = items;
      i = j - 1;
      continue;
    }

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
