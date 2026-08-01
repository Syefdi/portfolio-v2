/**
 * Generates the tally field: one cell for every test item in the ERM V3 run.
 *
 * This is the hero image of the site, and it is made entirely of real numbers
 * taken from docs/metrics.html. 400 items, of which 332 passed, 21 failed, 36 were
 * in progress and 11 were never executed. At poster scale the whole argument of
 * the portfolio is legible without reading a word: almost everything passed, and
 * these few did not.
 *
 * The arrangement is a tally rather than a sequence, so positions carry no
 * meaning. It is shuffled with a fixed seed, which keeps the output byte-identical
 * between builds and keeps the diff clean.
 *
 * Usage: npm run build:field
 */

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = join(projectRoot, 'index.html');

const START_MARKER = '<!-- tally-field:start -->';
const END_MARKER = '<!-- tally-field:end -->';

/* Source: docs/metrics.html, REKAP STATUS ERMV3 summary sheet. */
const OUTCOMES = [
  { key: 'pass', count: 332, label: 'Passed' },
  { key: 'fail', count: 21, label: 'Failed' },
  { key: 'pending', count: 36, label: 'In progress' },
  { key: 'absent', count: 11, label: 'Not executed' },
];

const COLUMNS = 20;
const PITCH = 10;
const CELL = 8;
const SEED = 0x5eed1e;

/** mulberry32. Small, fast, and deterministic for a fixed seed. */
function createRandom(seed) {
  let state = seed >>> 0;

  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildShuffledOutcomes() {
  const cells = [];

  OUTCOMES.forEach((outcome) => {
    for (let index = 0; index < outcome.count; index += 1) {
      cells.push(outcome.key);
    }
  });

  const random = createRandom(SEED);

  // Fisher-Yates, seeded.
  for (let index = cells.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const held = cells[index];
    cells[index] = cells[swap];
    cells[swap] = held;
  }

  return cells;
}

function buildFieldMarkup(cells) {
  const total = cells.length;
  const rows = Math.ceil(total / COLUMNS);
  const size = COLUMNS * PITCH;

  const summary = OUTCOMES.map((outcome) => `${outcome.count} ${outcome.label.toLowerCase()}`).join(
    ', ',
  );

  const rects = cells.map((key, index) => {
    const column = index % COLUMNS;
    const row = Math.floor(index / COLUMNS);
    // The stagger sweeps diagonally, so the field fills the way a page prints.
    const wave = column + row;

    return (
      `<rect class="cell cell-${key}" data-outcome="${key}" ` +
      `x="${column * PITCH}" y="${row * PITCH}" width="${CELL}" height="${CELL}" ` +
      `style="--cell-delay:${wave * 14}ms"/>`
    );
  });

  const lines = [
    START_MARKER,
    `<svg class="tally-field" viewBox="0 0 ${size} ${rows * PITCH}" role="img" aria-labelledby="tally-title tally-desc" preserveAspectRatio="xMidYMid meet">`,
    '  <title id="tally-title">Test execution tally for ERM V3</title>',
    `  <desc id="tally-desc">${total} test items: ${summary}. One cell per item; the arrangement is a tally, not a sequence.</desc>`,
  ];

  for (let index = 0; index < rects.length; index += COLUMNS) {
    lines.push('  ' + rects.slice(index, index + COLUMNS).join(''));
  }

  lines.push('</svg>', END_MARKER);
  return lines.join('\n');
}

async function main() {
  const cells = buildShuffledOutcomes();
  const declared = OUTCOMES.reduce((total, outcome) => total + outcome.count, 0);

  if (cells.length !== declared) {
    throw new Error(`Cell count ${cells.length} does not match the declared total ${declared}.`);
  }

  const html = await readFile(TARGET, 'utf8');
  const startIndex = html.indexOf(START_MARKER);
  const endIndex = html.indexOf(END_MARKER);

  if (startIndex === -1 || endIndex === -1) {
    throw new Error(`Could not find the tally-field markers in ${TARGET}.`);
  }

  const updated =
    html.slice(0, startIndex) + buildFieldMarkup(cells) + html.slice(endIndex + END_MARKER.length);

  await writeFile(TARGET, updated, 'utf8');

  const tally = OUTCOMES.map((outcome) => `${outcome.key}=${outcome.count}`).join(' ');
  console.log(`Tally field: ${cells.length} cells (${tally}) written into index.html`);
}

main().catch((error) => {
  console.error(`Tally field build failed: ${error.message}`);
  process.exitCode = 1;
});
