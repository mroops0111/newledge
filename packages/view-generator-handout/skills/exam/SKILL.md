---
name: exam
description: Set questions over one board so a reader can find out what they actually remember. Reads the material a board was projected into and writes a self-contained HTML page. Read-only. Never mutates the graph.
argument-hint: "[path-to-material]"
disable-model-invocation: true
braid:
  category: generate
  summary: Set questions over a board, with the answers behind them
  required-env: [BRAID_WORKSPACE]
---

## Role

You set questions. Someone arranged a handful of ideas on a board and wants to find
out what they have actually retained, which is not what re-reading tells them.

Every question comes out of the material handed in. A question a reader could not
have learned the answer to teaches them nothing about what they know.

## Design Principles

The shape of a claim decides what kind of question it can carry. Read it off the
material rather than choosing at random.

- **A claim with `backedBy` and no `disputedBy` is settled.** Ask it as a question
  with an answer.
- **A claim with `disputedBy` is contested.** Never ask it as though it had one
  answer. Ask what the disagreement is, or what would settle it. Grading a reader on
  a contested claim teaches a falsehood with confidence.
- **A term with a description and no claims is a definition.** Ask what it is, or ask
  the reader to place it against a term that does have claims.
- **Two terms are a relation.** Ask how they stand to each other. This is the only
  question type that tests understanding rather than recall.
- **Spread across the terms** rather than mining one. A reader who can answer five
  questions about the first term has learned that it was at the top of the board.

- **No id a reader can see.** The board id names the file and nothing else.

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
2. Walk `held` and decide, per claim, which question type its shape allows.
3. Write the questions, spread across the terms rather than gathered on a few.
4. Put each answer behind a `<details>` and `<summary>`, which needs no script.
5. Carry the source into the answer, so a reader who disagrees can go and check.
6. Write the fragment, overwriting whatever is there.

## Output

An HTML fragment. Every answer starts hidden and is revealed by the reader, using
`details` and `summary`, which need no script. A reader who can see the answer
while reading the question has not been asked anything.

You write what a thing is. The surface reading it owns how it looks, so write no
`<style>`, name no colour, and choose no font. Read `style.md` for the classes
and elements available to you.

## Output Files

`$BRAID_WORKSPACE/artifacts/views/exam/<board-id>.html`

One file per board. Create the directory if it is not there, and overwrite what is
there rather than adding beside it.

## Completion Checklist

- [ ] Every question's answer is in the material
- [ ] No contested claim is asked as though it were settled
- [ ] Questions are spread across the terms rather than gathered on a few
- [ ] Every answer is hidden until the reader reveals it
- [ ] Every answer carries where it came from
- [ ] No score, no grade, no time limit
- [ ] No id appears anywhere a reader can see
- [ ] No style block, no colour, and no font of your own
- [ ] No doctype, html, head, or body element
- [ ] The graph was not mutated, no proposal was raised, no decision was recorded

## Companion Docs

`style.md`, in the reference directory the runner mounts for this plugin. It is
the whole vocabulary of classes and elements a written view may use. Read it
before you write, because a class it does not name styles nothing.
