import { slugFor } from './slug-table.mjs';

// Parses a Career/applications/{회사}/README.md file into a tracker row.
// Company name is passed in (from the directory name, since some dir names
// are ASCII like "naver-webtoon" and don't match the README's first heading).

export function parseApplication(text, companyKoreanName) {
  const role = matchField(text, '직무');
  const date = matchField(text, '지원일');
  const sourceLine = matchField(text, '출처');
  const url = extractFirstUrl(sourceLine);
  const status = date ? '지원' : '평가완료';

  return {
    company: companyKoreanName,
    slug: slugFor(companyKoreanName),
    role: role || '',
    date: date || '',
    url: url || '',
    status,
  };
}

function matchField(text, label) {
  // Matches "**label:** value" up to end of line
  const re = new RegExp(`\\*\\*${escapeRegex(label)}:\\*\\*\\s*(.+)`);
  const m = text.match(re);
  return m ? m[1].trim() : '';
}

function extractFirstUrl(text) {
  // Matches markdown link [...](url) or bare http(s)://...
  const mdLink = text.match(/\[[^\]]+\]\((https?:\/\/[^)]+)\)/);
  if (mdLink) return mdLink[1];
  const bare = text.match(/https?:\/\/\S+/);
  return bare ? bare[0] : '';
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
