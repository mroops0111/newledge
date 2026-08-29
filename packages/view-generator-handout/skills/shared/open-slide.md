# Writing An Open-Slide Deck

A presentation is not a page. It is a folder of React pages that the open-slide
runtime scales, navigates, and plays full screen. This is the contract it holds
you to.

## The file

One file, `index.tsx`, in a folder named after the board.

```tsx
import type { DesignSystem, Page, SlideMeta } from '@open-slide/core'

export const design: DesignSystem = {
  palette: { bg: '#0f172a', text: '#f8fafc', accent: '#fbbf24' },
  fonts: {
    display: 'system-ui, -apple-system, sans-serif',
    body: 'system-ui, -apple-system, sans-serif',
  },
  typeScale: { hero: 180, body: 40 },
  radius: 12,
}

const Cover: Page = () => <div style={fill}>…</div>
const Body: Page = () => <div style={fill}>…</div>

export const meta: SlideMeta = {
  title: 'What the board is called',
  createdAt: '2026-01-01T00:00:00Z',
}
export default [Cover, Body] satisfies Page[]
```

- `export default` is a non-empty array of zero-prop React components, in order.
- `meta.createdAt` is a plain ISO 8601 string literal. The runtime reads it with a
  regular expression at build time rather than evaluating the module, so it cannot
  be `new Date()` or an import. Run `date -u +%Y-%m-%dT%H:%M:%SZ` and paste what
  it prints, because a timestamp written from memory is wrong.
- Declare the `design` const and read it back as `var(--osd-bg)`,
  `var(--osd-text)`, `var(--osd-accent)`, `var(--osd-font-display)`,
  `var(--osd-font-body)`, `var(--osd-size-hero)`, `var(--osd-size-body)`. The
  runtime injects them, and a live design panel edits them after you are gone.
- Only `react`, `@open-slide/core`, and standard web APIs are available. Add no
  dependency, and write no second file. Helper components go inside `index.tsx`.

## The canvas

Every page renders into a fixed **1920 by 1080** canvas that does not scroll.
Design as though the viewport is literally that. Use absolute pixel values, never
`rem`, `vw`, `vh`, or a percentage for type. The root element of a page fills it
with `width: '100%'` and `height: '100%'`.

| Element | Size |
| --- | --- |
| Hero title | 140 to 200px |
| Section heading | 80 to 120px |
| Page heading | 56 to 80px |
| Body text | 32 to 44px |
| Caption or label | 22 to 28px |

Content padding is 100 to 160px from every edge. Line height is 1.2 for headings
and 1.5 to 1.7 for body.

## Anything past 1080px is silently cropped

This is the one failure that ruins a deck, so do the arithmetic before writing the
page rather than after.

Usable height is `1080` minus the top and bottom padding, so 120px of padding
leaves 840px. An element costs `font size × line height × lines`, and a bullet
that wraps counts twice. Add the gap below each one, which is 32 to 64px, and sum.

A page carries one heading and a paragraph, or one heading and up to five short
bullets. Not both. A hero title page carries a title, one subtitle, and nothing
else. When the budget is tight, split the page in two. Never raise the padding,
shrink type below the scale, or reach for `overflow`, a negative margin, or a
transform to make something fit.

## Holding a look

Pick one background, one primary text colour, one accent, and one muted, and hold
them across every page. One display font and one body font. One content padding.
Commit to a single aesthetic rather than mixing several.
