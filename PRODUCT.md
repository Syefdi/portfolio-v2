# Product

## Register

brand

## Users

**Primary:** Technical recruiters and hiring managers evaluating candidates for QA and development roles. They need to quickly assess technical competency, work experience, and professionalism within the first 30 seconds of landing.

**Secondary:** Fellow developers and collaborators exploring potential partnerships or seeking to understand technical background and project experience.

**Context:** Users arrive via LinkedIn, GitHub, or direct links. They're often comparing multiple candidates simultaneously, scanning for signal over noise. Mobile access is common during commutes or casual browsing.

## Product Purpose

A portfolio that demonstrates technical precision and professional competency without unnecessary flourish. Every element serves evaluation: skills are categorized and verifiable, projects show real systems built, experience is timeline-clear, and contact paths are direct.

Success is measured by quality connection: a recruiter reaching out with a relevant role, or a developer initiating a meaningful technical conversation. Not traffic volume, but conversion to real opportunity.

## Brand Personality

**Precise, Modern, Approachable**

The portfolio embodies Apple's design philosophy: premium restraint where every element has purpose. Clean typography, intentional whitespace, and subtle interactive details (cursor spotlight, smooth transitions) signal attention to craft without screaming for attention.

The terminal mode serves dual purpose: it demonstrates technical comfort with command-line interfaces while offering an alternative navigation path for those who prefer it. It's not a gimmick; it's a genuine second interface that reflects how developers actually work.

Professional and competent, yet human. The visitor should feel they're looking at someone who takes their craft seriously but isn't unapproachable. Confidence without arrogance.

## Anti-references

**Reject these patterns explicitly:**

- **Playful illustrated portfolios**: No cartoon avatars, no hand-drawn doodles, no "fun" illustrations. This isn't a creative agency portfolio; it's a technical professional showcase.
- **LinkedIn-generic corporate**: No stock photo backgrounds, no buzzword bingo ("passionate self-starter"), no corporate template sameness.
- **Over-engineered spectacle**: No 3D WebGL scenes, no particle systems, no scroll-jacking, no animations that distract from content. Technical skill is demonstrated through the system built, not through visual pyrotechnics.
- **Gradient-heavy color chaos**: Not the 2020-era saturated gradient trend. Not rainbow badge collections. Restrained color with sky blue as primary accent, purple and amber as support.
- **Developer portfolio clichés**: Not the dark mode only "hacker aesthetic" with green monospace everywhere. Not the "hero with giant headshot and wave emoji." Not the portfolio that tries to be a landing page with big CTAs.

The anti-pattern is **decoration over substance**. Every visual choice must serve comprehension and evaluation, not just "look designed."

## Design Principles

1. **Precision Over Decoration**  
   Every element earns its place. Whitespace is intentional, not filler. Interactive effects enhance comprehension (hover states clarify clickability), they don't perform for performance's sake. If it doesn't help the recruiter evaluate or the developer connect, it's removed.

2. **Show System Thinking**  
   The portfolio itself is a system: consistent spacing scale, semantic color roles, reusable component patterns, dual light/dark themes that aren't afterthoughts. The code quality (clean separation of HTML/CSS/JS, no frameworks needed) demonstrates the same discipline expected in production systems.

3. **Progressive Disclosure**  
   Landing view gives the recruiter what they need in 10 seconds: name, role, current status, availability. Each section reveals depth on engagement: skills grouped by domain, projects detailed with role badges, experience structured as timeline. The terminal mode is an easter egg for those who explore; it rewards curiosity without gating content.

4. **Accessibility Is Craft**  
   WCAG 2.1 AA isn't compliance theater; it's recognition that good design works for everyone. Sufficient contrast ratios, keyboard navigation, semantic HTML, skip links, and reduced motion support aren't checklist items. They're markers of someone who builds systems thoughtfully.

5. **Terminal As Interface, Not Gimmick**  
   The terminal mode isn't decoration. It's a fully functional alternate interface that reflects genuine developer workflow. Command history, tab autocomplete, typing animation that feels real, Easter eggs that demonstrate personality without breaking character. It says: "I'm comfortable here, and I built this properly."

## Accessibility & Inclusion

**Target:** WCAG 2.1 AA compliance as baseline, not aspiration.

**Requirements:**
- All text meets 4.5:1 contrast minimum (large text 3:1)
- Keyboard navigation works throughout both visual and terminal interfaces
- Focus indicators are visible and clear
- Reduced motion preferences are respected (animations disable gracefully)
- Semantic HTML with proper heading hierarchy and landmark regions
- Alt text for images where meaningful
- Skip link to main content
- Terminal mode provides text-based navigation alternative

**Rationale:** Accessibility is a signal of technical competency. A developer who builds accessible interfaces understands progressive enhancement, semantic markup, and inclusive design. It's not a checkbox; it's a demonstration of craft.

## Notes

The dual interface (visual portfolio + terminal mode) is the portfolio's unique element. It's not "portfolio with terminal Easter egg." Both are first-class interfaces, equally complete, reflecting the duality of modern development: visual polish meets command-line precision.

The color palette (sky blue primary, purple and amber accents) is already committed and working. It's restrained enough to stay professional, distinctive enough to avoid generic. Dark mode isn't an afterthought; both themes are equally refined.

Current implementation already demonstrates the principles above. This document codifies what's working so future updates stay on brand rather than drifting toward portfolio clichés.
