/**
 * Builds the SVG icon sprite used across the portfolio.
 *
 * Why this exists: the pages previously loaded the Material Symbols variable
 * font from Google Fonts and referenced glyphs by ligature name. That download
 * is roughly 250 KB, blocks nothing (so the raw ligature text "bug_report" is
 * painted first), and adds a third-party dependency to every page view.
 *
 * This script collects only the icons each page actually references, converts
 * them to `<symbol>` elements, and injects them inline between the
 * `<!-- icon-sprite:start -->` and `<!-- icon-sprite:end -->` markers. Inlining
 * keeps the icons request-free and immune to CDN failure.
 *
 * Usage: npm run build:icons
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const iconSourceDir = join(
  projectRoot,
  'node_modules',
  '@material-symbols',
  'svg-400',
  'outlined',
);
const spriteOutputPath = join(projectRoot, 'assets', 'icons', 'sprite.svg');

/**
 * Pages to process. `scripts` lists companion files whose runtime-generated
 * markup also references sprite icons, so those icons end up in the page sprite
 * instead of resolving to nothing.
 */
const pages = [
  { html: 'index.html', scripts: ['assets/js/main.js'] },
  { html: 'docs/bug-report.html', scripts: ['assets/js/docs.js'] },
  { html: 'docs/metrics.html', scripts: ['assets/js/docs.js'] },
  { html: 'docs/smoke-test.html', scripts: ['assets/js/docs.js'] },
  { html: 'docs/test-cases.html', scripts: ['assets/js/docs.js'] },
];

const START_MARKER = '<!-- icon-sprite:start -->';
const END_MARKER = '<!-- icon-sprite:end -->';
const ICON_REFERENCE_PATTERN = /#icon-([a-z0-9-]+)/g;
const VIEW_BOX = '0 -960 960 960';

/** Markup uses hyphens (`icon-bug-report`); the source files use underscores. */
function toSourceFileName(iconName) {
  return `${iconName.replace(/-/g, '_')}.svg`;
}

/** Extracts the inner markup of a source SVG, dropping the wrapper element. */
function extractInnerMarkup(svgSource, iconName) {
  const match = svgSource.match(/<svg[^>]*>([\s\S]*)<\/svg>/);

  if (!match) {
    throw new Error(`Unable to parse the SVG source for icon "${iconName}".`);
  }

  return match[1].trim();
}

async function loadSymbol(iconName) {
  const filePath = join(iconSourceDir, toSourceFileName(iconName));

  let svgSource;
  try {
    svgSource = await readFile(filePath, 'utf8');
  } catch (error) {
    throw new Error(
      `Icon "${iconName}" was referenced in the markup but "${filePath}" could not be read. ` +
        `Run "npm install" first, or check the icon name. Original error: ${error.message}`,
    );
  }

  const inner = extractInnerMarkup(svgSource, iconName);
  return `<symbol id="icon-${iconName}" viewBox="${VIEW_BOX}">${inner}</symbol>`;
}

function collectIconNames(html) {
  const names = new Set();
  for (const match of html.matchAll(ICON_REFERENCE_PATTERN)) {
    names.add(match[1]);
  }
  return [...names].sort();
}

function buildInlineSprite(symbols) {
  if (symbols.length === 0) {
    return `${START_MARKER}\n${END_MARKER}`;
  }

  return [
    START_MARKER,
    '<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden">',
    ...symbols.map((symbol) => `  ${symbol}`),
    '</svg>',
    END_MARKER,
  ].join('\n');
}

async function processPage(page, symbolCache) {
  const filePath = join(projectRoot, page.html);
  const html = await readFile(filePath, 'utf8');

  const startIndex = html.indexOf(START_MARKER);
  const endIndex = html.indexOf(END_MARKER);

  if (startIndex === -1 || endIndex === -1) {
    console.warn(`  skipped ${page.html} (no icon-sprite markers found)`);
    return [];
  }

  if (endIndex < startIndex) {
    throw new Error(`Icon sprite markers are out of order in ${page.html}.`);
  }

  let sources = html;

  for (const scriptPath of page.scripts || []) {
    sources += await readFile(join(projectRoot, scriptPath), 'utf8');
  }

  const iconNames = collectIconNames(sources);
  const symbols = [];

  for (const iconName of iconNames) {
    if (!symbolCache.has(iconName)) {
      symbolCache.set(iconName, await loadSymbol(iconName));
    }
    symbols.push(symbolCache.get(iconName));
  }

  const updated =
    html.slice(0, startIndex) +
    buildInlineSprite(symbols) +
    html.slice(endIndex + END_MARKER.length);

  if (updated !== html) {
    await writeFile(filePath, updated, 'utf8');
  }

  console.log(`  ${page.html}: ${iconNames.length} icon(s)`);
  return iconNames;
}

async function writeStandaloneSprite(symbolCache) {
  const symbols = [...symbolCache.keys()].sort().map((name) => symbolCache.get(name));
  const sprite = [
    '<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">',
    ...symbols.map((symbol) => `  ${symbol}`),
    '</svg>',
    '',
  ].join('\n');

  await mkdir(dirname(spriteOutputPath), { recursive: true });
  await writeFile(spriteOutputPath, sprite, 'utf8');
}

async function main() {
  const symbolCache = new Map();

  console.log('Building icon sprite from @material-symbols/svg-400 (outlined):');

  for (const page of pages) {
    await processPage(page, symbolCache);
  }

  await writeStandaloneSprite(symbolCache);
  console.log(`Done. ${symbolCache.size} unique icon(s) written to assets/icons/sprite.svg`);
}

main().catch((error) => {
  console.error(`Icon build failed: ${error.message}`);
  process.exitCode = 1;
});
