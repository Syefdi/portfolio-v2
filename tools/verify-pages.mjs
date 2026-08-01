/**
 * Headless page checks for the Inspection Record build.
 *
 * Starts a throwaway static server, drives every page in Firefox, and asserts the
 * things that are easy to break: unresolved sprite icons, utilities that were
 * never compiled, dialog semantics, the severity filter, and text that fails
 * contrast. The contrast audit matters more here than in a dark build, because a
 * light sheet with a muted ink ramp is exactly where readability slips.
 *
 * Firefox is used because Chromium needs system libraries absent from a default
 * WSL install. Run `sudo npx playwright install-deps` to add Chromium locally.
 *
 * Usage: npm run verify
 */

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { firefox } from 'playwright';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.VERIFY_PORT || 8899);
const GROUND = 'rgb(13, 13, 15)';
const SHEET = 'rgb(238, 240, 243)';

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};

const passed = [];
const failed = [];

function check(label, condition, detail) {
  if (condition) {
    passed.push(`  ok    ${label}`);
  } else {
    failed.push(`  FAIL  ${label}${detail ? ' -> ' + detail : ''}`);
  }
}

function startStaticServer() {
  const server = createServer(async (request, response) => {
    const requestPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const filePath = join(projectRoot, normalize(requestPath).replace(/^(\.\.[/\\])+/, ''));

    if (!filePath.startsWith(projectRoot)) {
      response.writeHead(403).end('Forbidden');
      return;
    }

    try {
      const stats = await stat(filePath);

      if (stats.isDirectory()) {
        response.writeHead(404).end('Not found');
        return;
      }

      response.writeHead(200, {
        'Content-Type': CONTENT_TYPES[extname(filePath)] || 'application/octet-stream',
        'Content-Length': stats.size,
      });
      createReadStream(filePath).pipe(response);
    } catch {
      response.writeHead(404).end('Not found');
    }
  });

  return new Promise((resolvePromise, rejectPromise) => {
    server.once('error', rejectPromise);
    server.listen(PORT, '127.0.0.1', () => resolvePromise(server));
  });
}

function watchForProblems(page, label) {
  const consoleErrors = [];
  const requestProblems = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));
  page.on('requestfailed', (request) =>
    requestProblems.push(`${request.url()} (${request.failure()?.errorText})`),
  );
  page.on('response', (response) => {
    if (response.status() >= 400) {
      requestProblems.push(`${response.url()} -> HTTP ${response.status()}`);
    }
  });

  return function report() {
    check(`${label}: no console errors`, consoleErrors.length === 0, consoleErrors.join(' | '));
    check(`${label}: no failed requests`, requestProblems.length === 0, requestProblems.join(' | '));
  };
}

/** Animated scrolling moves click targets and makes assertions intermittent. */
async function disableSmoothScroll(page) {
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
}

/* ---------------------------------------------------------------- in-page ---- */

function collectUnresolvedSpriteReferences() {
  const missing = [];
  document.querySelectorAll('use').forEach((use) => {
    const reference = use.getAttribute('href');
    if (reference && reference.startsWith('#') && !document.querySelector(reference)) {
      missing.push(reference);
    }
  });
  return missing;
}

function measureRenderedIcons() {
  // Only icon instances count. The sprite container itself is deliberately
  // zero-sized, and icons inside a closed dialog have no box yet.
  return Array.from(document.querySelectorAll('svg'))
    .filter((svg) => svg.querySelector('use') && svg.getClientRects().length > 0)
    .map((svg) => Math.round(svg.getBoundingClientRect().width));
}

function measureHorizontalOverflow() {
  return document.documentElement.scrollWidth - document.documentElement.clientWidth;
}

/**
 * Walks every element that owns visible text, resolves the first opaque
 * background behind it, and returns anything under the WCAG AA threshold for its
 * size and weight.
 */
function auditContrast() {
  function parse(color) {
    const match = color.match(/rgba?\(([^)]+)\)/);
    if (!match) {
      return null;
    }
    const parts = match[1].split(',').map((value) => parseFloat(value.trim()));
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  }

  function channel(value) {
    const ratio = value / 255;
    return ratio <= 0.03928 ? ratio / 12.92 : Math.pow((ratio + 0.055) / 1.055, 2.4);
  }

  function luminance(rgb) {
    return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
  }

  function blend(top, bottom) {
    return {
      r: top.r * top.a + bottom.r * (1 - top.a),
      g: top.g * top.a + bottom.g * (1 - top.a),
      b: top.b * top.a + bottom.b * (1 - top.a),
      a: 1,
    };
  }

  function backgroundFor(element) {
    let node = element;
    let result = { r: 255, g: 255, b: 255, a: 1 };
    const stack = [];

    while (node && node.nodeType === 1) {
      const background = parse(getComputedStyle(node).backgroundColor);
      if (background && background.a > 0) {
        stack.push(background);
        if (background.a === 1) {
          break;
        }
      }
      node = node.parentElement;
    }

    for (let index = stack.length - 1; index >= 0; index -= 1) {
      result = stack[index].a === 1 ? stack[index] : blend(stack[index], result);
    }

    return result;
  }

  const failures = [];

  document.querySelectorAll('body *').forEach((element) => {
    const ownText = Array.from(element.childNodes)
      .filter((node) => node.nodeType === 3)
      .map((node) => node.textContent.trim())
      .join('');

    if (!ownText || element.closest('[hidden]') || element.closest('dialog:not([open])')) {
      return;
    }

    const style = getComputedStyle(element);
    if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) < 0.5) {
      return;
    }

    if (element.getClientRects().length === 0) {
      return;
    }

    const foreground = parse(style.color);
    if (!foreground) {
      return;
    }

    // Element opacity dims the text as surely as an alpha channel does, so fold
    // it into the foreground alpha before measuring.
    const elementOpacity = Number(style.opacity);
    if (elementOpacity < 1) {
      foreground.a *= elementOpacity;
    }

    const background = backgroundFor(element);
    const resolved = foreground.a < 1 ? blend(foreground, background) : foreground;

    const light = Math.max(luminance(resolved), luminance(background));
    const dark = Math.min(luminance(resolved), luminance(background));
    const ratio = (light + 0.05) / (dark + 0.05);

    const size = parseFloat(style.fontSize);
    const weight = Number(style.fontWeight) || 400;
    const isLarge = size >= 24 || (size >= 18.66 && weight >= 700);
    const threshold = isLarge ? 3 : 4.5;

    if (ratio + 0.01 < threshold) {
      failures.push(
        `${element.tagName.toLowerCase()}.${(element.className || '').toString().split(' ')[0]} ` +
          `"${ownText.slice(0, 24)}" ${ratio.toFixed(2)}:1 (needs ${threshold})`,
      );
    }
  });

  return failures.slice(0, 8);
}

/* ------------------------------------------------------------------ suites --- */

async function verifyDesktop(browser, baseUrl) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const report = watchForProblems(page, 'index (desktop)');

  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });
  await disableSmoothScroll(page);

  check(
    'compiled stylesheet applied',
    (await page.evaluate(() => getComputedStyle(document.body).backgroundColor)) === GROUND,
  );
  check(
    'text face resolves to Archivo',
    (await page.evaluate(() => getComputedStyle(document.body).fontFamily)).includes('Archivo'),
  );
  check(
    'display face resolves to Big Shoulders Display',
    (await page.evaluate(() => {
      const heading = document.querySelector('#hero-claim');
      return heading ? getComputedStyle(heading).fontFamily : '';
    })).includes('Big Shoulders Display'),
  );

  // The tally field is the hero image and is generated from the metrics sheet, so
  // its cell counts must match the published totals exactly.
  const tally = await page.evaluate(() => {
    const counts = { pass: 0, fail: 0, pending: 0, absent: 0 };
    document.querySelectorAll('.tally-field .cell').forEach((cell) => {
      const outcome = cell.getAttribute('data-outcome');
      if (outcome in counts) {
        counts[outcome] += 1;
      }
    });
    return counts;
  });
  const tallyTotal = tally.pass + tally.fail + tally.pending + tally.absent;
  check('tally field holds one cell per test item', tallyTotal === 400, `total=${tallyTotal}`);
  check(
    'tally counts match the published metrics',
    tally.pass === 332 && tally.fail === 21 && tally.pending === 36 && tally.absent === 11,
    JSON.stringify(tally),
  );
  check(
    'tally field has an accessible description',
    Boolean(await page.locator('#tally-desc').count()),
  );

  const headingCount = await page.locator('h1').count();
  check('exactly one h1', headingCount === 1, `found ${headingCount}`);

  const unresolved = await page.evaluate(collectUnresolvedSpriteReferences);
  check('all sprite icon references resolve', unresolved.length === 0, unresolved.join(', '));

  const iconWidths = await page.evaluate(measureRenderedIcons);
  check(
    'rendered icons have a real size',
    iconWidths.length > 5 && iconWidths.every((width) => width > 6),
    `count=${iconWidths.length} min=${Math.min(...iconWidths)}`,
  );

  check(
    'portrait is displayed, not only in meta',
    await page.locator('.portrait img').first().isVisible(),
  );
  check(
    'portrait actually loaded',
    await page.evaluate(() => {
      const image = document.querySelector('.portrait img');
      return Boolean(image && image.complete && image.naturalWidth > 0);
    }),
  );

  // Walk the page so every entrance and the chart trigger.
  await page.evaluate(async () => {
    const step = window.innerHeight / 2;
    for (let position = 0; position < document.body.scrollHeight; position += step) {
      window.scrollTo(0, position);
      await new Promise((done) => setTimeout(done, 60));
    }
  });
  await page.waitForTimeout(1000);

  const stillHidden = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-enter]'))
      .filter((element) => Number(getComputedStyle(element).opacity) < 0.9)
      .map((element) => element.tagName.toLowerCase() + '.' + element.getAttribute('data-enter')),
  );
  check('every entrance completed', stillHidden.length === 0, stillHidden.join(', '));

  const undrawnBars = await page.evaluate(
    () => document.querySelectorAll('.chart-bar:not(.is-drawn)').length,
  );
  check('chart bars drew', undrawnBars === 0, `${undrawnBars} undrawn`);

  check(
    'tally field printed in',
    await page.evaluate(() => document.getElementById('tally').classList.contains('is-printed')),
  );

  // The legend doubles as a control: pressing an outcome isolates it.
  await page.locator('#tally-legend [data-outcome="fail"]').click();
  await page.waitForTimeout(150);
  check(
    'legend isolates an outcome',
    (await page.locator('#tally').getAttribute('data-isolate')) === 'fail',
  );
  check(
    'isolation announced',
    (await page.locator('#tally-status').textContent()).includes('failed'),
  );
  await page.locator('#tally-legend [data-outcome="fail"]').click();
  await page.waitForTimeout(150);
  check(
    'pressing again clears the isolation',
    (await page.locator('#tally').getAttribute('data-isolate')) === null,
  );

  check(
    'active section marker applied',
    (await page.locator('.masthead-link.is-active').count()) >= 1,
  );
  check(
    'reading position advanced',
    (await page.evaluate(() => document.getElementById('read-progress').style.transform)) !==
      'scaleX(0)',
  );

  // Severity filter
  await page.locator('#severity-filter [data-severity="critical"]').click();
  await page.waitForTimeout(120);
  check(
    'filter narrows the log to critical records',
    (await page.locator('.record-row:visible').count()) === 3,
    `${await page.locator('.record-row:visible').count()} visible`,
  );
  check(
    'filter state announced',
    (await page.locator('#filter-status').textContent()).includes('3 critical'),
  );
  check(
    'pressed state reflected on the control',
    (await page
      .locator('#severity-filter [data-severity="critical"]')
      .getAttribute('aria-pressed')) === 'true',
  );

  await page.keyboard.press('2');
  await page.waitForTimeout(120);
  check(
    'number key filters by severity',
    (await page.locator('#filter-status').textContent()).includes('3 high'),
  );

  await page.locator('#severity-filter [data-severity="all"]').click();
  await page.waitForTimeout(120);
  check(
    'filter resets to every record',
    (await page.locator('.record-row:visible').count()) === 10,
  );

  // System detail overlay
  await page.locator('[data-system="erm"]').click();
  await page.locator('#system-overlay').waitFor({ state: 'visible' });
  check('system overlay opens as a modal', await page.evaluate(() => document.getElementById('system-overlay').open));
  check(
    'overlay heading rendered',
    (await page.locator('#system-panel-title').textContent()) === 'ERM',
  );
  check(
    'overlay labelled by its heading',
    (await page.locator('#system-overlay').getAttribute('aria-labelledby')) === 'system-panel-title',
  );
  check(
    'page scroll locked while open',
    await page.evaluate(() => document.documentElement.classList.contains('has-overlay')),
  );

  await page.keyboard.press('Escape');
  await page.waitForTimeout(320);
  check(
    'Escape closes the overlay',
    (await page.evaluate(() => document.getElementById('system-overlay').open)) === false,
  );
  check('overlay content cleared', (await page.locator('#system-panel-body').innerHTML()) === '');
  check(
    'scroll lock released',
    (await page.evaluate(() => document.documentElement.classList.contains('has-overlay'))) === false,
  );

  await page.locator('.masthead-link[href="#instruments"]').click();
  await page.waitForTimeout(300);
  check('hash navigation keeps the fragment', page.url().endsWith('#instruments'), page.url());

  // Built section: two projects, and the pipeline is a genuine three-stage
  // sequence rather than decorative numbering.
  check('built section present', (await page.locator('#built').count()) === 1);
  const builtCount = await page.locator('#built .built-item').count();
  check('built section lists both projects', builtCount === 2, `${builtCount} entries`);
  const pipelineSteps = await page.locator('#built .pipeline-step').count();
  check('pipeline documents three stages', pipelineSteps === 3, `${pipelineSteps} steps`);

  // The record reads as three blocks now: work, study, credentials. Without the
  // study dates the timeline looked like someone walked straight into a QA post.
  const recordLabels = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#instruments .plate-label')).map((node) =>
      node.textContent.trim(),
    ),
  );
  check(
    'record is split into work, study and credentials',
    ['Work', 'Study', 'Credentials'].every((label) => recordLabels.includes(label)),
    recordLabels.join(', '),
  );
  check(
    'the role progression shows three stages',
    (await page.locator('#instruments .grid.gap-px > span').count()) === 3,
  );
  check(
    'the actual job title is on the page',
    (await page.locator('#instruments').innerText()).includes('Junior QA Tester'),
  );

  // Revision archive: the trigger has to be reachable, the overlay has to show
  // both builds, and the screenshots have to actually load rather than sitting
  // there as broken images.
  check('revision trigger is visible', await page.locator('#archive-toggle').isVisible());
  await page.locator('#archive-toggle').click();
  await page.locator('#archive-overlay').waitFor({ state: 'visible' });
  check('archive opens as a modal', await page.evaluate(() => document.getElementById('archive-overlay').open));
  check(
    'archive is labelled by its heading',
    (await page.locator('#archive-overlay').getAttribute('aria-labelledby')) === 'archive-title',
  );
  const revEntries = await page.locator('#archive-overlay .rev-entry').count();
  check('archive lists both revisions', revEntries === 2, `${revEntries} entries`);
  const shotsLoaded = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#archive-overlay .rev-shot')).every(
      (image) => image.complete && image.naturalWidth > 0,
    ),
  );
  check('revision screenshots loaded', shotsLoaded);
  check(
    'archive links to the other build',
    (await page.locator('#archive-overlay a[href="https://syefdi.github.io/"]').count()) >= 1,
  );
  await page.keyboard.press('Escape');
  await page.waitForTimeout(320);
  check(
    'Escape closes the archive',
    (await page.evaluate(() => document.getElementById('archive-overlay').open)) === false,
  );

  // A project without a published repository must not carry a dead link.
  const emptyLinks = await page.evaluate(
    () =>
      Array.from(document.querySelectorAll('a')).filter((link) => {
        const href = link.getAttribute('href');
        return !href || href === '#' || href.trim() === '';
      }).length,
  );
  check('no placeholder or empty links', emptyLinks === 0, `${emptyLinks} found`);

  const contrastFailures = await page.evaluate(auditContrast);
  check('all visible text meets WCAG AA contrast', contrastFailures.length === 0, contrastFailures.join(' | '));

  const overflow = await page.evaluate(measureHorizontalOverflow);
  check('no horizontal overflow on desktop', overflow <= 1, `overflow=${overflow}px`);

  report();
  await context.close();
}

async function verifyMobile(browser, baseUrl) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const report = watchForProblems(page, 'index (mobile)');

  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });
  await disableSmoothScroll(page);

  check(
    'masthead nav hidden on small screens',
    !(await page.locator('header nav[aria-label="Contents"]').isVisible()),
  );

  await page.locator('#contents-toggle').click();
  await page.locator('#contents-overlay').waitFor({ state: 'visible' });
  check('contents overlay opens', await page.evaluate(() => document.getElementById('contents-overlay').open));
  check(
    'toggle reports expanded',
    (await page.locator('#contents-toggle').getAttribute('aria-expanded')) === 'true',
  );

  await page.locator('#contents-overlay a[href="#method"]').click();
  await page.waitForTimeout(400);
  check(
    'contents overlay closes on selection',
    (await page.evaluate(() => document.getElementById('contents-overlay').open)) === false,
  );
  check(
    'toggle reports collapsed',
    (await page.locator('#contents-toggle').getAttribute('aria-expanded')) === 'false',
  );

  const overflow = await page.evaluate(measureHorizontalOverflow);
  check('no horizontal overflow on mobile', overflow <= 1, `overflow=${overflow}px`);

  const contrastFailures = await page.evaluate(auditContrast);
  check('mobile text meets WCAG AA contrast', contrastFailures.length === 0, contrastFailures.join(' | '));

  report();
  await context.close();
}

async function verifyWithoutScripting(browser, baseUrl) {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'load' });

  check('hero claim readable without JavaScript', await page.locator('#hero-claim').isVisible());
  check('sign-off readable without JavaScript', await page.locator('#sign-off').isVisible());

  const paintedCells = await page.evaluate(
    () =>
      Array.from(document.querySelectorAll('.tally-field .cell')).filter(
        (cell) => Number(getComputedStyle(cell).opacity) > 0.9,
      ).length,
  );
  check('tally field fully painted without JavaScript', paintedCells === 400, `${paintedCells} visible`);

  const recordCount = await page.locator('.record-row:visible').count();
  check('every defect record visible without JavaScript', recordCount === 10, `${recordCount} visible`);

  const barWidth = await page.locator('.chart-bar span').first().evaluate((node) => node.getBoundingClientRect().width);
  check('chart bars render at full length without JavaScript', barWidth > 20, `${Math.round(barWidth)}px`);

  await context.close();
}

async function verifyDocumentationPage(browser, baseUrl, name) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const report = watchForProblems(page, `docs/${name}`);

  await page.goto(`${baseUrl}/docs/${name}.html`, { waitUntil: 'networkidle' });

  check(
    `docs/${name}: stylesheet applied`,
    (await page.evaluate(() => getComputedStyle(document.body).backgroundColor)) === SHEET,
  );

  const unresolved = await page.evaluate(collectUnresolvedSpriteReferences);
  check(`docs/${name}: sprite references resolve`, unresolved.length === 0, unresolved.join(', '));

  const blockCount = await page.locator('pre').count();
  const buttonCount = await page.locator('pre .copy-button').count();
  check(
    `docs/${name}: every code block has a copy control`,
    blockCount === buttonCount,
    `pre=${blockCount} buttons=${buttonCount}`,
  );

  check(
    `docs/${name}: back link points at the portfolio`,
    (await page.locator('a[href="../index.html"]').count()) >= 1,
  );

  const contrastFailures = await page.evaluate(auditContrast);
  check(
    `docs/${name}: text meets WCAG AA contrast`,
    contrastFailures.length === 0,
    contrastFailures.join(' | '),
  );

  const overflow = await page.evaluate(measureHorizontalOverflow);
  check(`docs/${name}: no page-level horizontal overflow`, overflow <= 1, `overflow=${overflow}px`);

  report();
  await context.close();
}

async function main() {
  const server = await startStaticServer();
  const baseUrl = `http://127.0.0.1:${PORT}`;
  const browser = await firefox.launch();

  try {
    await verifyDesktop(browser, baseUrl);
    await verifyMobile(browser, baseUrl);
    await verifyWithoutScripting(browser, baseUrl);

    for (const name of ['smoke-test', 'bug-report', 'test-cases', 'metrics']) {
      await verifyDocumentationPage(browser, baseUrl, name);
    }
  } finally {
    await browser.close();
    await new Promise((done) => server.close(done));
  }

  console.log(passed.join('\n'));

  if (failed.length > 0) {
    console.log('\n' + failed.join('\n'));
    console.log(`\n${failed.length} of ${passed.length + failed.length} checks failed.`);
    process.exitCode = 1;
    return;
  }

  console.log(`\nAll ${passed.length} checks passed.`);
}

main().catch((error) => {
  console.error(`Verification could not complete: ${error.message}`);
  process.exitCode = 1;
});
