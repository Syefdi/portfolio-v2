# Design system: Tally

The visual system for the `redesign/tally` branch. Tokens live in
`tailwind.config.js`, hand-written CSS in `src/input.css`, compiled output in
`assets/css/style.css`.

## Thesis

The strongest thing this person has is a test run: 400 items, 332 passed, 21
failed and got fixed before release. So the run itself is the hero image.

400 cells, one per test item, coloured by outcome. At poster scale the whole
argument is legible before you read a word: almost everything passed, and these
few did not. It is generated at build time from the numbers published in
`docs/metrics.html`, so the image cannot drift from the data.

Verified means hi-vis. That mapping holds across the entire page, which is why
the accent colour is doing work rather than decorating.

### Reference objects

A safety vest. A calibration label. A punch card. An inspection tally sheet.
Swiss poster logic for the composition: flat colour planes, condensed type at
scale, an asymmetric grid.

### Two art directions, deliberately

The front page is a poster. The artefact pages in `docs/` stay a printed light
document, because that is what they are. Consistency of voice beats consistency
of treatment.

### Rejected

- **Dark navy with a cyan accent.** The saturated default for QA and developer
  portfolios.
- **Warm cream or sand.** The default that replaced it.
- **Editorial serif with italic display.** A different costume, same reflex.
- **The hero-metric row.** The four numbers here are a chart legend keyed to the
  cells above them, and pressing one isolates that subset in the field. They are
  controls with a referent, not three round numbers floating in space.
- **Monospace as shorthand for technical.** The previous build set every label in
  a mono face. Here mono appears only on the artefact pages, where it is setting
  actual code and tabular records.
- **Tracked uppercase eyebrows above every section**, and numbered section
  markers.
- **Identical card grids.** The artefact index is a four-up grid of hi-vis hover
  panels, and it is the only grid of its kind on the page. The two projects in
  Built are a ruled two-column split, not a pair of cards.

## Colour

Strategy: **drenched**. The ground is the colour, the plates are paper laid on
it, and one accent carries meaning.

| Token | Value | Role |
| --- | --- | --- |
| `ground` | `#0d0d0f` | Body. Near-black, neutral. |
| `ground-raised` | `#17171b` | Pressed and hovered rows. |
| `ground-rule` | `#2c2c33` | Hairline on the ground. |
| `on-ground` | `#f2f2f0` | Text on the ground. |
| `on-ground-muted` | `#9a9ba1` | Secondary text. 7.0:1 on ground. |
| `hivis` | `#d7f733` | The accent. Verified, active, emphasis. 15.9:1 on ground. |
| `hivis-ink` | `#4f5f00` | Legible as text on a hi-vis fill. 5.7:1. |
| `fail` | `#ff3b30` | Failed items in the tally. |
| `pending` | `#8a8a92` | In progress. |
| `absent` | `#2a2a2f` | Never executed. |
| `plate` | `#ffffff` | Document plates. |
| `plate-sunken` | `#f1f2f3` | Row hover, chart track. |
| `ink` | `#101014` | Text on plates. 18.9:1. |
| `ink-secondary` | `#40454d` | Prose on plates. 9.6:1. |
| `ink-muted` | `#54585f` | Labels on plates. 7.0:1. |
| `sev-critical` `sev-high` `sev-medium` `sev-low` | see config | Severity, on plates only. |

Severity is never carried by hue alone. Each level has a distinct swatch shape as
well: critical and high solid, medium hollow, low half filled, with the word
always printed beside it. The table survives greyscale printing and colour vision
deficiency.

Every colour pair is verified on every `npm run verify`. The contrast audit walks
each element with visible text, resolves the real background behind it including
transparent layers, and fails the run under WCAG AA for that size and weight.

## Typography

Two families, a real contrast axis.

- **Big Shoulders Display** for everything at scale. A condensed signage face,
  which is what lets the hero run at 12rem without overflowing or shouting.
- **Archivo** for reading, labels and data.

Neither is on the currently saturated list. Martian Mono is retained for the
artefact pages only.

| Token | Size | Use |
| --- | --- | --- |
| `text-mega` | `clamp(3.5rem, 15vw, 12rem)` | The hero claim, once. |
| `text-huge` | `clamp(2.5rem, 7vw, 5.5rem)` | Section titles, system names. |
| `text-loud` | `clamp(1.75rem, 4vw, 3.25rem)` | Method headings, sub-claims. |
| `text-lead` | `clamp(1.125rem, 1.7vw, 1.5rem)` | Opening paragraphs. |
| `text-label` | `11px` | Field labels, uppercase, `0.07em` tracking. |

All fluid, no breakpoint steps in the type scale. Prose capped at `62ch`.

## Layout

Zones rather than a single column, so the page has tonal rhythm instead of one
inversion at the end:

```
ground   hero, tally field
hi-vis   availability strip
ground   findings heading, with white plates inside it
ground   method
ground   systems, artefact index
ground   built
ground   instruments heading, with a white plate inside it
hi-vis   sign-off
```

Twelve-column asymmetric grid at the top: claim on seven, tally on five. Plates
are hard-edged white rectangles sitting on the ground, so depth comes from tone
rather than shadow. Border radius is zero everywhere.

`z-index` is a named scale: `rule`, `masthead`, `overlay`, `overlay-content`.

## Motion

One choreography, tuned to what it reveals.

1. The tally field prints in on a diagonal sweep, 400 cells at 14ms per diagonal
   step. Opacity only, so the cell count stays cheap.
2. Hero text rises in at 0, 120 and 200ms.
3. Method blocks slide in from the left as they enter.
4. Density bars draw in sequence at 70ms intervals.

Only `opacity` and `transform` animate. Every starting state is gated on
`html.js`, so a failed script cannot leave the page blank, and everything
collapses to an instant render under `prefers-reduced-motion`.

## Interaction

- **The legend is a control.** Pressing an outcome dims the other cells to 12
  percent rather than hiding them, so the subset stands out while the proportion
  stays readable. Pressing again clears it. State is announced through
  `aria-live` and reported through `aria-pressed`.
- **Severity filter** over the defect log, with number keys 1 to 4 and 0 to
  reset.
- **Overlays** are native `<dialog>`. Focus trapping, Escape, focus restoration
  and background inertness come from the platform.
- Controls that cannot work disable themselves rather than sitting there dead.

## Numbering, and when it is allowed

Numbered markers as section scaffolding are banned here, which is why the
navigation and the section headings carry none. The one exception is the DropIt
pipeline, where the three stages are a real sequence and the order is the
information: analyse, then resolve a strategy from what was found, then encode.
Verification asserts there are exactly three stages, so the numbering cannot drift
into decoration.
