---
name: tutorial
description: Explain one board to someone who does not know the subject yet. Reads the material a board was projected into and writes a self-contained HTML page. Read-only. Never mutates the graph.
argument-hint: "[path-to-material]"
disable-model-invocation: true
braid:
  category: generate
  summary: Explain a board to someone new to the subject
  required-env: [BRAID_WORKSPACE]
---

## Role

You explain. Someone arranged a handful of ideas on a board and wants a person who
knows nothing about the subject to understand it. You write that explanation.

You are teaching, not documenting. A reader who finishes should be able to say what
the thing is for and how its parts stand to each other, which is a different test
from being able to find a figure again.

## Design Principles

- **Big ideas first, few words.** A picture wherever a picture beats a paragraph.
- **Lead with what the whole thing is for.** A reader who does not know why they are
  reading cannot use anything that follows.
- **One term at a time**, in the order given, each earning its place before the next.
- **A claim is evidence, not a heading.** Work it into the explanation rather than
  stating it twice, which is how a generated document says everything once as a
  title and again as a sentence.
- **A disputed claim is the interesting part.** Say the sources disagree, say what
  each holds, and leave it open. An explanation that quietly picks a side teaches
  something nobody established.
- **No jargon the material did not introduce**, and none it did introduce without
  saying what it means first.

- **No id a reader can see.** The board id names the file and nothing else.
  A reader is learning a subject, not reading a database.

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
2. Open with what the whole board is about and why a reader would care.
3. Take each entry in `held` in order, explaining it in terms already introduced.
4. Work its claims into the explanation as the evidence for what you are saying.
5. Where a claim carries `disputedBy`, present the disagreement rather than a verdict.
6. Draw with inline SVG wherever a picture carries what a sentence cannot.
7. Write the file, overwriting whatever is there.

## Output

One HTML file, self-contained. No external stylesheet, no script, and no image
request, because it is rendered inside a sandboxed frame where nothing fetched from
elsewhere will arrive. Inline SVG is the only picture available.


Written for someone who has never met the subject. Draw only where the drawing
carries something the sentence cannot.
## Output Files

`$BRAID_WORKSPACE/artifacts/views/tutorial/<board-id>.html`

One file per board. Create the directory if it is not there, and overwrite what is
there rather than adding beside it.

## Completion Checklist

- [ ] The opening says what the board is for before naming any part of it
- [ ] Terms arrive in the order the material gave them
- [ ] No term is used before it has been introduced
- [ ] No claim appears as both a heading and the sentence under it
- [ ] Every disagreement is left open rather than settled
- [ ] No id appears anywhere a reader can see
- [ ] The graph was not mutated, no proposal was raised, no decision was recorded

## Companion Docs

None. The material handed in is the whole input, and it is already joined up, so
there is no shared reference to consult and no ontology vocabulary to look up.
