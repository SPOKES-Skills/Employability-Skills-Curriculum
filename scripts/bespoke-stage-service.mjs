#!/usr/bin/env node
/** Stage only the service and its authority files, excluding lesson media and private setup. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv[2] && path.resolve(process.argv[2]);
if (!target || fs.existsSync(target)) throw new Error('Supply a new staging directory: node scripts/bespoke-stage-service.mjs /private/stage-path');
fs.mkdirSync(target, { recursive: true });
for (const rel of ['netlify.toml', 'netlify/functions', 'netlify/site', 'bespoke/selection.schema.json', 'bespoke/selection-v2.schema.json', 'bespoke/builder-model.mjs', 'bespoke/background-structures.mjs', 'bespoke/builder-catalog.json', 'bespoke/catalog.json', 'SPOKES Builder/bespoke-library-catalog.json']) {
  const dest = path.join(target, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(path.join(root, rel), dest, { recursive: true });
}
fs.writeFileSync(path.join(target, 'package.json'), JSON.stringify({ name: 'spokes-bespoke-service', version: '1.0.0', private: true, type: 'module', engines: { node: '22.x' } }, null, 2) + '\n');
console.log(`Service-only deployment staged at ${target}. It contains no lesson media, access links, or secrets.`);
