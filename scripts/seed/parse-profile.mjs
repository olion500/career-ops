import { parseFrontmatter } from './frontmatter.mjs';

// Extract content of a "# Heading" section up to the next h1 or EOF.
// Strips trailing "---" separator if present.
function extractSection(body, headingText) {
  const re = new RegExp(`(^|\\n)# ${escapeRegex(headingText)}\\s*\\n([\\s\\S]*?)(?=\\n# |$)`);
  const m = body.match(re);
  if (!m) return '';
  let content = m[2].trim();
  // Remove trailing "---" if present
  content = content.replace(/\n---\s*$/, '');
  return content;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function parseProfile(text) {
  const { data, body } = parseFrontmatter(text);
  return {
    name: data.name || '',
    title: data.title || '',
    experience: data.experience || '',
    current: data.current || '',
    location: data.location || '',
    email: data.email || '',
    linkedin: data.linkedin || '',
    github: data.github || '',
    updated: data.updated || '',
    headline: extractSection(body, '한 줄 소개'),
    strengths: extractSection(body, '강점'),
    weaknesses: extractSection(body, '약점'),
    preferences: extractSection(body, '선호 조건'),
    rawBody: body,
  };
}
