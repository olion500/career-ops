#!/usr/bin/env node
// Safe replacement for the fork's hardwired Korean board scanner.
// Network sources are isolated in integrations/kr/collect.mjs and off by default.
if (process.argv.length === 2) process.argv.push('--help');
await import('./integrations/kr/import.mjs');
