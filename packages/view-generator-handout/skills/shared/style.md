# What A Written View May Use

The surface that reads your page owns how it looks. You write what a thing is,
and it is styled there. Do not write a `<style>` block, do not name a colour, and
do not choose a font. A page that styles itself makes two views of one board look
like they came from two products.

What you write is a fragment. No `<!DOCTYPE>`, no `<html>`, no `<head>`, no
`<body>`. Begin at the first element you want a reader to see.

## Classes

These are the whole vocabulary. A class not named here styles nothing.

- **`lede`**: the opening paragraph, saying what the page is for. One per page.
- **`term`**: one section about one thing, wrapping its heading and everything
  under it.
- **`claim`**: an assertion, set apart from the prose that explains it.
- **`contested`**: goes on a `claim` the sources disagree about. Never settle one.
- **`label`**: a word or two naming what follows, set small and quiet.
- **`source`**: where something came from, wrapping a link.
- **`question`**: one question and its hidden answer, on an exam.

## Elements

Plain HTML is styled without a class.

- `h1` once, then `h2` per term, then `h3` beneath.
- `p`, `ul`, `ol`, `li`, `code`, `hr`, `a`, `table`.
- `details` with a `summary` for anything a reader opens. Needs no script.
- `figure` with inline `svg` and an optional `figcaption`, for a drawing.

## Drawing

Inline `svg` is the one thing you compose freely, because a diagram is a reading
of the material rather than a decoration. Draw only where the drawing carries
something the sentence cannot, and give it a `figure` to sit in.

Use `currentColor` for strokes and fills so a drawing follows the page rather
than fighting it. Do not put a background on a drawing.

## Shape

```html
<p class="lede">What this page is for.</p>

<section class="term">
  <h2>A term</h2>
  <p>What it is.</p>

  <div class="claim contested">
    <span class="label">Sources disagree</span>
    <p>One assertion, and what argues with it.</p>
    <p class="source"><a href="https://example.org">example.org</a></p>
  </div>

  <figure>
    <svg viewBox="0 0 300 100">…</svg>
    <figcaption>What the drawing shows.</figcaption>
  </figure>
</section>
```
