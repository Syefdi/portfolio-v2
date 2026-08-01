/**
 * Tailwind configuration: the Tally design system.
 *
 * Two art directions, deliberately. The front page is a poster: near-black
 * ground, white document plates laid on it, and one hi-vis accent. The artefact
 * pages stay a printed light document, because that is what they are. Consistency
 * of voice beats consistency of treatment.
 *
 * Colour strategy: drenched. The ground is the colour, and 332 hi-vis cells carry
 * the hero. The accent is safety yellow-green, the hue of a calibration label and
 * an inspection vest, not the cyan every QA and developer portfolio lands on.
 *
 * Semantics: hi-vis means verified. Red means failed. That mapping holds
 * everywhere on the page, so colour is never decoration.
 */

// Condensed signage face for scale, normal-width grotesque for reading. A real
// contrast axis rather than two near-identical sans faces.
const displayStack = ['"Big Shoulders Display"', 'Archivo Narrow', 'Impact', 'sans-serif'];

const textStack = [
  'Archivo',
  'ui-sans-serif',
  'system-ui',
  '-apple-system',
  '"Segoe UI"',
  'Helvetica',
  'Arial',
  'sans-serif',
];

// Kept for the artefact pages, which remain a printed document.
const dataStack = [
  '"Martian Mono"',
  'ui-monospace',
  'SFMono-Regular',
  'Menlo',
  'Consolas',
  '"Liberation Mono"',
  'monospace',
];

module.exports = {
  content: ['./index.html', './docs/*.html', './assets/js/**/*.js'],
  theme: {
    extend: {
      colors: {
        /* ---- Poster surfaces (front page) ---- */
        ground: '#0d0d0f',
        'ground-raised': '#17171b',
        'ground-rule': '#2c2c33',
        'on-ground': '#f2f2f0',
        'on-ground-muted': '#9a9ba1',

        /* Document plates laid on the ground */
        plate: '#ffffff',
        'plate-sunken': '#f1f2f3',
        'plate-rule': '#d9dbdf',

        /* ---- The accent ---- */
        // Safety yellow-green. Verified means this colour, everywhere.
        hivis: '#d7f733',
        'hivis-dim': '#a8c220',
        // Legible as text on white, where the bright accent would fail contrast.
        'hivis-ink': '#4f5f00',

        /* ---- Outcome vocabulary, used in the tally field ---- */
        fail: '#ff3b30',
        'fail-ink': '#c0271e',
        pending: '#8a8a92',
        absent: '#2a2a2f',

        /* ---- Severity, on plates ---- */
        'sev-critical': '#b3261e',
        'sev-high': '#c2410c',
        'sev-medium': '#8a5a00',
        'sev-low': '#1d4ed8',
        verified: '#136c33',
        'verified-wash': '#e8f4ec',

        /* ---- Artefact pages keep the printed document system ---- */
        sheet: '#eef0f3',
        'sheet-raised': '#ffffff',
        'sheet-sunken': '#e4e7ec',
        ink: '#101014',
        'ink-secondary': '#40454d',
        'ink-muted': '#54585f',
        rule: '#d2d5da',
        'rule-strong': '#a8adb6',
        signal: '#e04a1f',
        'signal-ink': '#b8330f',
      },
      fontFamily: {
        display: displayStack,
        sans: textStack,
        mono: dataStack,
      },
      fontSize: {
        // Poster scale. Condensed faces can take this without shouting, and the
        // ceiling stays under the point where type stops being designed.
        mega: ['clamp(3.5rem, 15vw, 12rem)', { lineHeight: '0.82', letterSpacing: '-0.02em', fontWeight: '800' }],
        huge: ['clamp(2.5rem, 7vw, 5.5rem)', { lineHeight: '0.88', letterSpacing: '-0.015em', fontWeight: '700' }],
        loud: ['clamp(1.75rem, 4vw, 3.25rem)', { lineHeight: '0.95', letterSpacing: '-0.01em', fontWeight: '700' }],
        lead: ['clamp(1.125rem, 1.7vw, 1.5rem)', { lineHeight: '1.45', fontWeight: '400' }],
        label: ['0.6875rem', { lineHeight: '1.3', letterSpacing: '0.07em', fontWeight: '600' }],
        datum: ['0.8125rem', { lineHeight: '1.5', fontWeight: '500' }],
        field: ['0.6875rem', { lineHeight: '1.4', fontWeight: '500' }],
        'section-title': ['clamp(1.5rem, 2.4vw, 2rem)', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],
      },
      maxWidth: {
        measure: '62ch',
        'measure-tight': '48ch',
      },
      spacing: {
        zone: 'clamp(4rem, 8vw, 7.5rem)',
      },
      borderRadius: {
        none: '0',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      zIndex: {
        rule: '10',
        masthead: '20',
        overlay: '30',
        'overlay-content': '40',
      },
    },
  },
  plugins: [],
};
