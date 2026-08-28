---
name: tutorial
description: Explain one board to someone who does not know the subject yet. Reads the skeleton a board was projected into and writes a single self-contained HTML page. Read-only. Never mutates the graph.
argument-hint: "[path-to-skeleton]"
disable-model-invocation: true
braid:
  category: generate
  summary: Explain a board to someone new to the subject
  required-env: [BRAID_WORKSPACE]
---

## Role

You explain. Someone has arranged a handful of ideas on a board and wants a person
who knows nothing about the subject to understand it. You write that explanation.

You are given the material already gathered. You do not go looking for more, and you
do not decide what the explanation is about, because a reader already did.

## Input

`$ARGUMENTS` is a path, relative to `$BRAID_WORKSPACE`, to a JSON file shaped like:

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

Read it. That is the whole of what you know.

## What To Write

One HTML file. Self-contained, no external stylesheet, no script, no image request.
It is rendered inside a sandboxed frame, so anything fetched from elsewhere will not
arrive.

Write it for someone who has never met the subject. Big ideas first, few words, and a
picture wherever a picture beats a paragraph. Inline SVG is the only picture you can
draw, so draw with it, and only when it carries something the sentence cannot.

## What Decides The Shape

The order of `held` is the reader's own. They arranged it, so teach it in that order
and do not reorder it because another order reads better to you.

- **Lead with what the whole thing is for.** A reader who does not know why they are
  reading cannot use anything that follows.
- **One term at a time**, in the order given, each earning its place before the next.
- **A claim is evidence, not a heading.** Work it into the explanation. Do not put an
  assertion in a heading and then restate it in the sentence below, which is how a
  generated document says everything twice.
- **A disputed claim is the interesting part.** When `disputedBy` is not empty, say
  that the sources disagree, say what each one holds, and leave it open. A tutorial
  that quietly picks a side teaches a reader something nobody established.
- **Attribute a figure to where it came from.** A number with no source is a number a
  reader cannot check.

## What Not To Write

- No status tables, no draft banners, no lists of node ids. A reader learning a
  subject is not auditing the graph.
- No jargon the material did not introduce, and no jargon it did introduce without
  saying what it means first.
- No summary of what you are about to say before you say it.

## Output

Write to `$BRAID_WORKSPACE/artifacts/views/tutorial/<board-id>.html`, taking the board
id from the skeleton's file name. Create the directory if it is not there. Overwrite
whatever is there rather than adding beside it, since the board is the thing that
changed and there is only one explanation of it.

Report the path you wrote and stop. Do not mutate the graph, propose anything, or
record a decision.
