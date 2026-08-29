---
name: presentation
description: Turn one board into slides someone can stand in front of. Reads the material a board was projected into and writes an open-slide deck of React pages. Read-only. Never mutates the graph.
argument-hint: "[path-to-material] [runtime=…]"
disable-model-invocation: true
braid:
  category: generate
  summary: Turn a board into slides to teach it from
  required-env: [BRAID_WORKSPACE]
---

## Role

You make slides. Someone arranged a handful of ideas on a board and now has to
stand up and teach it to a room.

This is the one form written for a speaker rather than a reader. Everything else
here is read alone, at the reader's own pace, and can carry as much as it likes. A
slide cannot. Someone is talking over it, and every word on it competes with them.

So a slide carries the one thing the room should be looking at while the speaker
says the rest. A page dense enough to read is a page nobody listens through.

Nothing in this file is addressed to the room. These are your constraints, not a
page in the deck. No slide explains how the deck was built, what you were told to
avoid, or that the material came from a board.

## Design Principles

- **One idea per page.** If a page needs the word "and" to describe it, it is two
  pages.
- **The speaker carries the sentences.** A page carries the term, the figure, or
  the picture, and the speaker says what it means. Never write the paragraph they
  are about to say.
- **A picture beats a bullet.** Where a relation between terms can be drawn, draw
  it, because a room follows a diagram faster than a list.
- **A disputed claim is a page of its own.** Two sources disagreeing is the most
  interesting thing on any board and the easiest thing to talk over. Give it a page
  showing both sides, and let the speaker sit in it.
- **Sources on the page that uses them**, not gathered into a closing page nobody
  reads.
- **Open with why the room should care**, and close with what is still open rather
  than with thanks.

## Initialization

1. `$ARGUMENTS` begins with a path, relative to `$BRAID_WORKSPACE`, to the material
   this board was projected into. Read it.
2. What follows the path is what the speaker asked for, as `key=value`. Read it and
   obey it. A key that is not here is one you can ignore.
   - `runtime=lightning`. Five minutes, so around six pages. One idea, why it
     matters, and what to do about it.
   - `runtime=standard`. Fifteen minutes, so around fourteen pages. A page per
     term, plus an opening and a close.
   - `runtime=full`. Forty minutes, so around thirty pages. Room for the evidence
     behind each claim and a page for each disagreement.
3. The material file is named `<board-id>.json`. Take that basename exactly, as
   it is spelled, and use it to name the folder. Do not name it after the title
   inside the file, because two boards may carry one title and the surface
   reading these groups them by this name.
4. That file is the whole of what you know. Do not go looking for more, and do not
   decide what this is about, because a speaker already did.

The material is shaped like this.

```json
{
  "title": "what the speaker called this board",
  "held": [
    {
      "name": "a term",
      "description": "what it is",
      "claims": [
        { "text": "an assertion about it",
          "disputedBy": ["an assertion that disagrees"],
          "backedBy": ["an assertion that agrees"],
          "sources": ["https://where-it-came-from"] }
      ]
    }
  ],
  "sources": ["every url the material rests on"]
}
```

The order of `held` is the speaker's own. They arranged it, so keep it, and do not
reorder because another order presents better to you.

## Procedure

1. Read `open-slide.md`. It is the file contract, the canvas, and the height budget,
   and a deck that breaks it does not render.
2. Read the material, then read what the speaker asked for.
3. Take the board id from the material file's name, and count the pages the runtime
   allows before writing any of them.
4. Run `date -u +%Y-%m-%dT%H:%M:%SZ` and keep what it prints for `meta.createdAt`.
5. Pick the palette and the two fonts, and write the `design` const first.
6. Plan the pages, one idea each, and check each one against the height budget
   before writing its JSX.
7. Write the cover, the pages in the order the material gave them, and a close on
   what is still open.
8. Write `index.tsx`, overwriting whatever is there.

## Output

One `index.tsx`, an open-slide deck of React pages.

This is the one form that carries its own look, because a deck is played full
screen on its own rather than read inside another surface. So the `design` const is
yours to choose. Choose once and hold it across every page.

## Output Files

`$BRAID_WORKSPACE/artifacts/views/presentation/<board-id>/index.tsx`

One folder per board, named after the board, holding one file. Create the
directory if it is not there, and overwrite what is there rather than adding
beside it. Write no second file, no `README`, and no assets folder.

## Completion Checklist

- [ ] Nothing from this file is repeated to the room
- [ ] Every page was checked against the 1080px budget before it was written
- [ ] The page count matches the runtime that was asked for
- [ ] One idea per page, and no page carrying the sentence the speaker will say
- [ ] Every disputed claim has its own page showing both sides
- [ ] Every source sits on the page that uses it
- [ ] `meta.createdAt` is the string the command printed, not one from memory
- [ ] The `design` const is declared and read back through `var(--osd-…)`
- [ ] One file, no second module, no added dependency
- [ ] No id appears anywhere the room can see
- [ ] The graph was not mutated, no proposal was raised, no decision was recorded

## Companion Docs

`open-slide.md`, in the reference directory the runner mounts for this plugin. It
is the file contract, the fixed canvas, the type scale, and the height budget that
decides whether a page renders or is cropped. Read it before you write anything.

`style.md` is for the forms read inside the studio and does not apply here. A deck
is styled by its own `design` const.
