#!/usr/bin/env node
// Copy-only migration into a NEW data root. Never runs the Obsidian seed,
// modifies the source, overwrites a target, or transfers .env/credentials.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hash, atomic } from './delta.mjs';
const USER = ['cv.md', 'config/profile.yml', 'config/cv-facts.json', 'config/benchmarks.yml', 'config/plugins.yml', 'modes/_profile.md', 'modes/_custom.md', 'modes/_brief.md', 'voice-dna.md', 'article-digest.md', 'portals.yml', 'data', 'documents', 'jds', 'reports', 'output', 'interview-prep', 'writing-samples', 'batch/tracker-additions', 'plugins.local', 'plugins.lock', '.career-ops-web', 'applications.md'];
export function migrate(source, destination, { commit = false } = {}) {
  source = fs.realpathSync(source); destination = path.resolve(destination);
  if (!fs.statSync(source).isDirectory()) throw new Error('Source must be a directory');
  if (fs.existsSync(destination) || destination === source || destination.startsWith(source + path.sep)) throw new Error('Destination must be a NEW directory outside source');
  const files = [];
  const walk = rel => {
    const full = path.join(source, rel), stat = fs.lstatSync(full);
    if (stat.isSymbolicLink()) throw new Error(`Symlink requires manual review: ${rel}`);
    if (stat.isDirectory()) for (const name of fs.readdirSync(full).sort()) walk(path.join(rel, name));
    else if (stat.isFile()) files.push({ path: rel, sha256: hash(fs.readFileSync(full)), bytes: stat.size });
    else throw new Error(`Unsupported file: ${rel}`);
  };
  for (const rel of USER) if (fs.existsSync(path.join(source, rel))) walk(rel);
  const result = { source, destination, files, secretsExcluded: true, committed: false };
  if (!commit) return result;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const stage = fs.mkdtempSync(path.join(path.dirname(destination), '.career-migrate-'));
  try {
    for (const file of files) {
      const target = path.join(stage, file.path);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(source, file.path), target, fs.constants.COPYFILE_EXCL);
      fs.chmodSync(target, 0o600);
      if (hash(fs.readFileSync(target)) !== file.sha256) throw new Error(`Copy verification failed: ${file.path}`);
    }
    result.committed = true;
    atomic(path.join(stage, 'migration-manifest.json'), result);
    // mkdir reservation refuses a concurrent creator; then move verified files
    // individually with exclusive copy, not rename-overwrite of the target dir.
    fs.mkdirSync(destination, { mode: 0o700 });
    fs.cpSync(stage, destination, { recursive: true, errorOnExist: true, force: false });
    return result;
  } finally { fs.rmSync(stage, { recursive: true, force: true }); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2), commit = args.includes('--commit');
    const rest = args.filter(a => a !== '--commit');
    if (rest.length !== 2 || rest.some(a => a.startsWith('--'))) throw new Error('node integrations/kr/migrate-user.mjs SOURCE NEW_DATA_ROOT [--commit]');
    const result = migrate(rest[0], rest[1], { commit });
    console.log(JSON.stringify(result, null, 2));
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
