# portfolio-v2

QA engineer portfolio. The hero is not a headline, it is the test run: 400 cells,
one per test item from the ERM V3 release. 332 passed in hi-vis, 21 failed in red.
The argument the whole site makes is legible before you read a word.

Vanilla HTML, CSS and JavaScript. Tailwind compiled ahead of time. No framework,
no runtime CDN dependency, no analytics.

[**Live**](https://syefdi.github.io/portfolio-v2/) · [Design system](DESIGN.md) · [Brand brief](PRODUCT.md)

## The idea

Most QA portfolios describe rigour. This one shows the output and lets the reader
audit it.

- **The hero is generated from the data.** `src/build-field.mjs` reads the counts
  published in `docs/metrics.html` and emits 400 SVG cells at build time, so the
  image cannot drift from the numbers it represents. Verification asserts the cell
  counts match exactly.
- **The legend is a control.** Pressing an outcome dims the other cells to 12
  percent rather than hiding them, so the subset stands out while the proportion
  stays readable.
- **Ten real defects on the front page**, filterable by severity, with number keys
  1 to 4 as accelerators. Severity carries a hue *and* a distinct swatch shape, so
  the table survives a greyscale print and colour vision deficiency.
- **Nothing invented.** Only one defect has a real reference number, so only one
  shows a reference. Where the data does not exist, the column does not exist.
- **Contrast is verified, not asserted.** The check walks every element with
  visible text, resolves the real background behind it including transparent and
  opacity-dimmed layers, and fails the build under WCAG AA.

## Structure

```text
portfolio-v2/
├── index.html                  # The poster
├── tailwind.config.js          # Design tokens and content sources
├── DESIGN.md                   # Design system, and what was deliberately rejected
├── PRODUCT.md                  # Audience and brand brief
│
├── src/
│   ├── input.css               # Tailwind directives plus all custom CSS
│   ├── build-field.mjs         # Generates the 400-cell tally from the metrics
│   └── build-icons.mjs         # Generates and inlines the SVG icon sprite
│
├── tools/
│   ├── verify-pages.mjs        # Headless checks, including the contrast audit
│   └── extract-video-frame.mjs # Pulls stills from a walkthrough recording
│
├── docs/                       # Published QA artefacts
│   ├── bug-report.html         # Template plus the ERM-CRON-001 write-up in full
│   ├── test-cases.html         # Four worked cases: positive, negative, edge
│   ├── smoke-test.html         # Twelve critical path checks
│   └── metrics.html            # 400 items, pass rate, defect density by module
│
└── assets/
    ├── css/style.css           # Compiled output, committed so no build runs on deploy
    ├── icons/sprite.svg        # Generated sprite reference copy
    ├── js/main.js              # Page behaviour
    ├── js/docs.js              # Copy to clipboard on the artefact pages
    ├── documents/resume.pdf
    └── images/                 # Portrait and favicons
```

## Getting started

The compiled CSS, the inline sprites and the tally field are all committed, so the
site runs with no setup. The build is only needed when you change styles, tokens,
icons, or the tally counts.

```bash
npm install
npm run build      # tally field, icon sprite, stylesheet
npm run verify     # 82 headless checks in Firefox
python3 -m http.server 8080
```

Serve over HTTP rather than opening the file directly, otherwise the copy buttons
on the artefact pages cannot reach the Clipboard API.

| Change | Command |
| --- | --- |
| Edited `src/input.css` or `tailwind.config.js` | `npm run build:css` |
| Added or changed a class in any HTML or JS file | `npm run build:css` |
| Added a new `#icon-...` reference | `npm run build:icons` |
| Changed the test execution counts | `npm run build:field` |
| Anything else | `npm run build` |

Tailwind only generates classes it can find, so a new utility does nothing until
the stylesheet is rebuilt.

## The tally field

`src/build-field.mjs` holds the source counts in one place:

```js
const OUTCOMES = [
  { key: 'pass',    count: 332, label: 'Passed' },
  { key: 'fail',    count: 21,  label: 'Failed' },
  { key: 'pending', count: 36,  label: 'In progress' },
  { key: 'absent',  count: 11,  label: 'Not executed' },
];
```

Change a count, run `npm run build:field`, and the field, its accessible
description and its cell delays all regenerate. Update the legend figures in
`index.html` to match; verification will fail if the totals disagree.

The arrangement is shuffled with a fixed seed, so it is a tally rather than a
sequence, positions carry no meaning, and the output stays byte-identical between
builds to keep diffs clean.

## Icons

```html
<svg class="h-3.5 w-3.5 fill-current" aria-hidden="true" focusable="false">
    <use href="#icon-arrow-outward"/>
</svg>
```

`npm run build:icons` scans each page and its companion script for `#icon-`
references, pulls the matching outlined SVG from `@material-symbols/svg-400`, and
inlines only the symbols that page needs. Hyphens map to underscores, so
`#icon-arrow-outward` resolves to `arrow_outward.svg`. Nothing is fetched at
runtime, and there is no icon web font.

## Verification

`npm run verify` starts a throwaway static server and drives every page in
headless Firefox. 82 checks:

- no console errors and no failed requests on any page
- both font families resolving, compiled stylesheet applied
- **tally cell counts matching the published metrics exactly**
- tally printing in, legend isolating an outcome, isolation announced
- every `#icon-` reference resolving to a symbol that exists
- the portrait actually loading, not merely referenced in meta tags
- severity filter narrowing the log, announcing state, responding to number keys
- dialogs opening as modals, labelled, scroll-locked, closing on Escape, clearing
- **every visible text element meeting WCAG AA for its size and weight**
- no horizontal overflow at 1440px, 1280px or 390px
- the tally, the log, the chart and the sign-off all readable with JavaScript off

Firefox is used because Chromium needs system libraries a default WSL install
lacks. For Chromium locally: `sudo npx playwright install-deps`.

## Deployment

GitHub Pages from the default branch. The compiled CSS, inline sprites and tally
field are committed, so no build action runs on push.

The site is published under a project path, so absolute URLs use
`https://syefdi.github.io/portfolio-v2/`. If this later becomes the primary site
at `syefdi.github.io`, update the base URL in `index.html`, `docs/*.html`,
`sitemap.xml` and `robots.txt`.

## Known limitation

A 35 MB walkthrough recording exists locally but is excluded from version control
until it is compressed. Nothing on the page links to it, so there are no broken
references. `tools/extract-video-frame.mjs` can pull stills from it with a browser
that decodes H.264; Firefox under WSL cannot.

## Maintenance

- **New defect record:** add a `<tr class="record-row" data-severity="...">` to the
  table in `index.html` and update the filter counts above it.
- **New system:** add an entry to `SYSTEMS` in `assets/js/main.js` and a matching
  `data-system` row in `index.html`.
- **Colour or type change:** edit `tailwind.config.js`, run `npm run build:css`,
  then `npm run verify`. The contrast audit catches a step that has drifted light.
- **Custom CSS:** edit `src/input.css`, never `assets/css/style.css`, which is
  generated output.

## Credits

Design and build by Syefdi Fasmawi Syaban. Icons from
[Material Symbols](https://github.com/marella/material-symbols) (Apache 2.0).
Type: [Big Shoulders Display](https://fonts.google.com/specimen/Big+Shoulders+Display)
and [Archivo](https://fonts.google.com/specimen/Archivo), both SIL Open Font
License.

## License

Personal portfolio. Use the structure and tooling as inspiration, but replace all
personal content, imagery, defect data and project details with your own.

## Contact

- **Email:** syefdifasmawi@gmail.com
- **LinkedIn:** [syefdi-fasmawi-syaban](https://linkedin.com/in/syefdi-fasmawi-syaban-6b6531337)
- **GitHub:** [github.com/Syefdi](https://github.com/Syefdi)
