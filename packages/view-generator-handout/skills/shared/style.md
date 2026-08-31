# What A Written View May Use

The surface that reads your page owns how it looks and how it behaves. You write
what a thing is, and it is styled and made to work there. Do not write a
`<style>` block, do not name a colour, do not choose a font, and do not write a
`<script>`. A page that styles itself makes two views of one board look like they
came from two products, and a page that scripts itself behaves differently every
time it is written.

What you write is a fragment. No `<!DOCTYPE>`, no `<html>`, no `<head>`, no
`<body>`. Begin at the first element you want a reader to see.

## Do not build your own controls

The surface already draws every control a reader needs, from the markup below. It
pages through chapters, marks answers, keeps the tally, and filters by
difficulty.

So do not write a "next" link, a "show answer" button, a progress bar, a score, a
`<details>`, or a filter. Write the marked-up content and the controls appear. A
control you write yourself will sit beside the real one and do nothing.

## Classes

These are the whole vocabulary. A class not named here styles nothing.

### Saying what something is

- **`lede`**: the opening paragraph, saying what the page is for. One per page.
- **`term`**: one section about one thing, wrapping its heading and everything
  under it.
- **`claim`**: an assertion, set apart from the prose that explains it.
- **`contested`**: goes on a `claim` the sources disagree about. Never settle one.
- **`label`**: a word or two naming what follows, set small and quiet.
- **`source`**: where something came from, wrapping a link. Only use it where
  there is a link. Something the material gave no source for says so in ordinary
  prose, because a source a reader cannot follow is not one.

### Moving a reader through

- **`chapter`**: one step in a sequence, on a `section`. Write two or more and the
  surface shows them one at a time and gives the reader a way through. Write none
  and the page is one scroll, which is what a page meant to be scanned wants.

  A chapter opens with an `h2`. Give each one a heading a reader could pick out of
  a list, because that list is how they navigate.

### Asking

- **`question`**: one question and everything belonging to it. Put
  `data-level="recall"`, `"apply"`, or `"judge"` on it to say how deep it reaches.
  The surface shows that to the reader and lets them narrow to it.

  These say what a question draws on, not how hard it is. `recall` asks what the
  material said, `apply` asks what follows from it, and `judge` asks what the
  material left open. An obscure fact is a hard `recall` question and is still
  `recall`.
- **`ask`**: the question itself, as a paragraph. One per `question`.
- **`choices`**: an `ol` of options. Put it inside the `question`.
- **`choice`**: one option, as an `li` inside `choices`. Put `data-correct` on
  exactly one. The surface marks it when the reader picks.
- **`answer`**: why the answer is what it is, and where that comes from. The
  surface keeps it hidden until the reader has answered.

A `question` with `choices` is marked for the reader. A `question` without them is
one they write, so the surface gives them somewhere to write it before opening the
answer. Both are worth asking. Recall and relations mark themselves well, and
anything asking what a reader thinks does not.

## What is checked

The contract above is checked rather than trusted. Run
`$NEWLEDGE_CHECK <the file you wrote>` when you have written it. It reads the
page and names what is wrong with it: a question with no answer behind it, an
empty option, no option marked correct or two of them, a chapter that is a
heading and nothing else, a source carrying no link, a style block, a script.

Fix everything it names and run it again. It is finished when it reports
nothing, and so are you.

## Elements

Plain HTML is styled without a class.

- `h1` once, then `h2` per chapter or term, then `h3` beneath.
- `p`, `ul`, `ol`, `li`, `code`, `hr`, `a`, `table`, `blockquote`.
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

<section class="chapter">
  <h2>The first thing to understand</h2>
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

  <div class="question" data-level="recall">
    <p class="ask">Which of these is it?</p>
    <ol class="choices">
      <li class="choice" data-correct>The one the material supports.</li>
      <li class="choice">One a reader might plausibly believe instead.</li>
      <li class="choice">Another.</li>
    </ol>
    <div class="answer">
      <p>Why the first is right, and why the second is tempting.</p>
      <p class="source"><a href="https://example.org">example.org</a></p>
    </div>
  </div>
</section>

<section class="chapter">
  <h2>The next thing</h2>

  <div class="question" data-level="judge">
    <p class="ask">What would settle the disagreement above?</p>
    <div class="answer">
      <p>What the material implies would settle it, and what it leaves open.</p>
    </div>
  </div>
</section>
```
