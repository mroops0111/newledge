---
name: handbook
description: Write one board up as a handbook, something to look things up in. Reads the material a board was projected into and writes a self-contained HTML page. Read-only. Never mutates the graph.
argument-hint: "[path-to-material]"
disable-model-invocation: true
braid:
  category: generate
  summary: Write a board up as a handbook to look things up in
  required-env: [BRAID_WORKSPACE, NEWLEDGE_CHECK]
---

## Role

You write a handbook. Someone arranged a handful of ideas on a board and
wants a page they can come back to and find one thing in, quickly, without reading it
through.

That is the whole difference from an explanation. A reader of a handbook already
knows roughly what they are looking for. They are scanning, not learning, so the page
is arranged to be scanned.

Nothing in this file is addressed to the reader. These are your constraints, not the
page's opening. A reader never learns that there were rules, what you were told to
avoid, how you chose the arrangement, or that the material came from a board.

## Design Principles

- **Scannable over readable.** One term per section, findable by its own name.
- **Description first**, in a sentence or two, so a scanner can stop there.
- **Claims as a list**, not as prose, since a list is what a scanning eye crosses.
- **Every figure carries its source** on the same line, because the reason to look
  something up is often to cite it.
- **A disputed claim says so where it sits.** A handbook presenting a contested
  figure as settled is worse than one that leaves it out.
- **No heading that restates the sentence below it.** A claim is a heading or a
  sentence, never both.
- **No status table** repeating every item with the same word beside each row. A note
  true of everything belongs in one line at the top, or nowhere.

## Initialization

1. `$ARGUMENTS` is a path, relative to `$BRAID_WORKSPACE`, to the material this
   board was projected into. Read it.
2. The material file is named `<board-id>.json`. Take that basename exactly, as
   it is spelled, and use it to name what you write. Do not name the output after
   the title inside the file, because two boards may carry one title and the
   surface reading these groups them by this name.
3. That file is the whole of what you know. Do not go looking for more, and do not
   decide what this is about, because a reader already did.

The material is shaped like this.

```json
{
  "title": "what the reader called this board",
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

The order of `held` is the reader's own. They arranged it, so keep it, and do not
reorder because another order reads better to you.

## Procedure

1. Read the material and take the board id from the file name, as spelled.
2. Write the title, then one section per entry in `held`, in the order given.
3. Under each, the description, then its claims as a list.
4. Mark a claim carrying `disputedBy` where it sits, and name what disagrees.
5. Put each claim's source on its own line, as a link.
6. Write the fragment, overwriting whatever is there.
7. Run `$NEWLEDGE_CHECK <the file you just wrote>`. It reads the page and
   reports what the contract says is wrong with it. Fix everything it names and
   run it again. Repeat until it reports nothing, and do not finish before it
   does.

## Output

An HTML fragment, arranged to be crossed rather than read through. No
introduction, no conclusion, and no summary of what the page contains, because
the page is the summary.

A handbook is one scroll rather than a sequence, because a reader crossing it is
looking for one thing and would have to page through chapters to find it. So write
no `chapter`, and write no question. Those belong to a page a reader works through,
and this is a page they cross.

You write what a thing is. The surface reading it owns how it looks and how it
behaves, so write no `<style>`, name no colour, choose no font, and write no
`<script>`. Read `style.md` for the classes and elements available to you.

## Output Files

`$BRAID_WORKSPACE/artifacts/views/handbook/<board-id>.html`

One file per board. Create the directory if it is not there, and overwrite what is
there rather than adding beside it, since the board is what changed and there is one
handbook of it.

## Completion Checklist

- [ ] `$NEWLEDGE_CHECK` was run on what was written, and reported nothing
- [ ] Nothing from this file is repeated to the reader
- [ ] Every entry in `held` has a section, in the order the material gave them
- [ ] No node id appears anywhere a reader can see
- [ ] Every figure has its source beside it
- [ ] Every disputed claim is marked as disputed
- [ ] No heading repeats the sentence under it
- [ ] No chapter and no question, since a handbook is crossed rather than worked
- [ ] No style block, no script, no colour, and no font of your own
- [ ] The graph was not mutated, no proposal was raised, no decision was recorded

## Companion Docs

`style.md`, in the reference directory the runner mounts for this plugin. It is
the whole vocabulary of classes and elements a written view may use, and the
markup the surface reads to make a page work. Read it before you write, because a
class it does not name styles nothing and does nothing.
