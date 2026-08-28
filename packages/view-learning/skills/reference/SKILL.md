---
name: reference
description: Write one board up as something to look things up in. Reads the material a board was projected into and writes a self-contained HTML page. Read-only. Never mutates the graph.
argument-hint: "[path-to-material]"
disable-model-invocation: true
braid:
  category: generate
  summary: Write a board up as something to look things up in
  required-env: [BRAID_WORKSPACE]
---

## Role

You write reference material. Someone arranged a handful of ideas on a board and
wants a page they can come back to and find one thing in, quickly, without reading it
through.

That is the whole difference from an explanation. A reader of a reference already
knows roughly what they are looking for. They are scanning, not learning, so the page
is arranged to be scanned.

## Design Principles

- **Scannable over readable.** One term per section, findable by its own name.
- **Description first**, in a sentence or two, so a scanner can stop there.
- **Claims as a list**, not as prose, since a list is what a scanning eye crosses.
- **Every figure carries its source** on the same line, because the reason to look
  something up is often to cite it.
- **A disputed claim says so where it sits.** A reference presenting a contested
  figure as settled is worse than one that leaves it out.
- **No heading that restates the sentence below it.** A claim is a heading or a
  sentence, never both.
- **No status table** repeating every item with the same word beside each row. A note
  true of everything belongs in one line at the top, or nowhere.

## Initialization

1. `$ARGUMENTS` is a path, relative to `$BRAID_WORKSPACE`, to the material this
   board was projected into. Read it.
2. Take the board id from the file's own name. It names what you write.
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

1. Read the material and take the board id from the file name.
2. Write the title, then one section per entry in `held`, in the order given.
3. Under each, the description, then its claims as a list.
4. Mark a claim carrying `disputedBy` where it sits, and name what disagrees.
5. Put each claim's source on its own line, as a link.
6. Write the file, overwriting whatever is there.

## Output

One HTML file, self-contained. No external stylesheet, no script, and no image
request, because it is rendered inside a sandboxed frame where nothing fetched from
elsewhere will arrive. Inline SVG is the only picture available.


Arranged to be crossed rather than read through. No introduction, no conclusion, and
no summary of what the page contains, because the page is the summary.
## Output Files

`$BRAID_WORKSPACE/artifacts/views/reference/<board-id>.html`

One file per board. Create the directory if it is not there, and overwrite what is
there rather than adding beside it, since the board is what changed and there is one
reference of it.

## Completion Checklist

- [ ] Every entry in `held` has a section, in the order the material gave them
- [ ] No node id appears anywhere a reader can see
- [ ] Every figure has its source beside it
- [ ] Every disputed claim is marked as disputed
- [ ] No heading repeats the sentence under it
- [ ] The graph was not mutated, no proposal was raised, no decision was recorded

## Companion Docs

None. The material handed in is the whole input, and it is already joined up, so
there is no shared reference to consult and no ontology vocabulary to look up.
