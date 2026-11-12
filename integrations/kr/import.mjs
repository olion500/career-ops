#!/usr/bin/env node
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { prepare, acknowledge } from './delta.mjs';
const { values, positionals } = parseArgs({ allowPositionals: true, options: {
  'dry-run': { type: 'boolean', default: false }, limit: { type: 'string' },
  commit: { type: 'boolean', default: false }, root: { type: 'string' }, now: { type: 'string' }, ack: { type: 'string' },
  'max-jobs': { type: 'string', default: '20' }, 'excerpt-chars': { type: 'string', default: '1200' }, help: { type: 'boolean' },
} });
try {
  if (values.commit && values['dry-run']) throw new Error('--commit conflicts with --dry-run');
  if (values.help) {
    console.log('node integrations/kr/import.mjs jobs.json [--commit] [--root=/data] [--max-jobs=20]\nnode integrations/kr/import.mjs --ack=BATCH_ID [--root=/data]\nDefault: preview only. No network, no AI calls. Acknowledge only after successful triage.');
  } else if (values.ack) {
    if (positionals.length || values.commit) throw new Error('--ack cannot be combined with input/--commit');
    console.log(JSON.stringify(await acknowledge(values.ack, { root: values.root }), null, 2));
  } else {
    if (positionals.length !== 1) throw new Error('Exactly one JSON input file required; see --help');
    if (fs.statSync(positionals[0]).size > 25 * 1024 * 1024) throw new Error('Input exceeds 25 MiB; split the export');
    const result = await prepare(JSON.parse(fs.readFileSync(positionals[0], 'utf8')), { root: values.root, now: values.now, commit: values.commit, maxJobs: Number(values.limit ?? values['max-jobs']), excerptChars: Number(values['excerpt-chars']) });
    // Do not put raw boards or full descriptions on the AI-facing stdout.
    console.log(JSON.stringify(result, null, 2));
  }
} catch (e) { console.error(e.message); process.exitCode = 1; }
