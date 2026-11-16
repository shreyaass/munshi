/**
 * Regenerates sheet/AppsScript.gs from the four source files.
 * Run: node sheet/bundle.mjs
 *
 * Apps Script has no import system, so the combined file is just a paste target
 * for the bound script project. Keep the sources authoritative.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const scriptDir = join(here, '..', 'apps', 'script');

const sources = ['Code.gs', 'Sheet.gs', 'Api.gs', 'Setup.gs'];

const banner = `/**
 * Expense Manager — combined Apps Script backend (generated file).
 *
 * Source of truth: apps/script/{Code,Sheet,Api,Setup}.gs
 * Paste this whole file into the bound Apps Script project's Code.gs.
 *
 * You still need two more files in the same project:
 *   - ConnectionInfo.html  (File > New > HTML)
 *   - appsscript.json      (Project Settings > Show manifest, then paste)
 *
 * Do not edit this generated copy; edit the sources and regenerate.
 */
`;

const body = sources
  .map((name) => {
    const content = readFileSync(join(scriptDir, name), 'utf8');
    return `\n/* ===================== apps/script/${name} ===================== */\n${content}`;
  })
  .join('\n');

const out = join(here, 'AppsScript.gs');
writeFileSync(out, banner + body, 'utf8');
console.log(`wrote ${out}`);
