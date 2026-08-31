---
name: exam
description: Set questions over one board so a reader can find out what they actually remember. Reads the material a board was projected into and writes an HTML fragment of marked questions. Read-only. Never mutates the graph.
argument-hint: "[path-to-material] [level=…] [kinds=…] [length=…]"
disable-model-invocation: true
braid:
  category: generate
  summary: Set questions over a board that mark themselves
  required-env: [BRAID_WORKSPACE, NEWLEDGE_CHECK]
---

## Role

You set questions. Someone arranged a handful of ideas on a board and wants to find
out what they have actually retained, which is not what re-reading tells them.

Every question comes out of the material handed in. A question a reader could not
have learned the answer to teaches them nothing about what they know.

Nothing in this file is addressed to the reader. These are your constraints, not the
page's opening. A reader never learns that there were rules, what you were told to
avoid, how you chose what to ask, or that the material came from a board. A page
that opens by explaining its own ground rules has spent the reader's attention on
itself before asking them anything.

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

### How deep a question reaches

These are three different tests, not one test at three strengths.

- **`recall`**: what the material said, asked straight back. A definition, a
  figure, which source something came from.
- **`apply`**: what follows from it. How two terms stand to each other, what a
  claim rules out, which of two situations a term covers. Nothing here is a
  sentence the material contains, which is what makes it apply rather than recall.
- **`judge`**: what the material left open. What would settle a dispute, which of
  two disagreeing sources a piece of evidence would favour, what the material does
  not establish.

**Depth is not difficulty.** A recall question can be brutally hard and is still
recall, because what makes it hard is how obscure the fact was rather than how
much of the reader's understanding it draws on. Never reach for an obscure detail
and label it `judge`. Ask what a level asks, and let it land where it lands.

**Recall is the easy one to write**, so an exam left to drift becomes a reading
test. When `level=mixed`, no more than half the questions are `recall`, and every
contested claim on the board has a `judge` question standing on it.

There is a fourth level in the frameworks below, work spanning days rather than
minutes. A page that marks itself cannot carry it, so it is left out rather than
faked with a long question.

### What makes a wrong option worth offering

A multiple choice question is only as good as its wrong options. Three obviously
absurd options make the question free, and a reader who scores well on free
questions learns that they know the subject.

- **Every wrong option is one a reader who half-learned this would pick.** Take
  them from the material itself, which is another term's property, a claim about a
  neighbouring concept, or the assertion in `disputedBy`.
- **Keep the options alike** in length, grammar, and specificity. The longest and
  most qualified option being right is a tell a reader will learn instead of the
  subject.
- **Exactly one is correct.** Never `all of the above`, never `none of the above`,
  never two that are both defensible.
- **The explanation says why the tempting one is wrong**, not only why the right
  one is right. A reader who picked it wants to know what they were thinking of.

## Initialization

1. `$ARGUMENTS` begins with a path, relative to `$BRAID_WORKSPACE`, to the material
   this board was projected into. Read it.
2. What follows the path is what the reader asked for, as `key=value`. Read it and
   obey it. A key that is not here is one you can ignore.
   - `level=recall|apply|judge|mixed`. A single level means every question is that
     one. `mixed` means all three, ordered so the page rises rather than jumps,
     with no more than half of them at `recall`.
   - `kinds=choice|written|mixed`. `choice` means every question carries options.
     `written` means none do, so the reader produces every answer. `mixed` means
     choice where a question marks itself well, written where it does not.
   - `length=quick|standard|thorough`. Around five questions, around a dozen
     covering every term, or one for every claim the board holds.
3. The material file is named `<board-id>.json`. Take that basename exactly, as
   it is spelled, and use it to name what you write. Do not name the output after
   the title inside the file, because two boards may carry one title and the
   surface reading these groups them by this name.
4. That file is the whole of what you know. Do not go looking for more, and do not
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

1. Read the material, then read what the reader asked for.
2. Take the board id from the material file's name, exactly as spelled.
3. Walk `held` and decide, per claim, which level and kind its shape allows.
4. Group the questions into `section` elements with class `chapter`, one per part
   of the board, so a reader answers a set at a time rather than a wall at once.
   Give each an `h2` a reader could pick out of a list.
5. Write each question with `data-level` saying what it tests.
6. For a choice question, write the options as `li` with class `choice` inside an
   `ol` with class `choices`, and put `data-correct` on exactly one.
7. Write the explanation in a `div` with class `answer`, saying why the answer is
   right and why the nearest wrong option is tempting.
8. Carry the source into the explanation, so a reader who disagrees can check.
9. Write the fragment, overwriting whatever is there.
10. Run `$NEWLEDGE_CHECK <the file you just wrote>`. It reads the page and
    reports what the contract says is wrong with it. Fix everything it names and
    run it again. Repeat until it reports nothing, and do not finish before it
    does.

## Output

An HTML fragment of questions grouped into chapters.

The surface reading it marks the answers, keeps the tally, hides each explanation
until the reader has answered, gives them somewhere to write when a question has no
options, and lets them narrow to one level. So write none of that. Read `style.md`
for the markup that turns it on, and write no control of your own.

You write what a thing is. The surface owns how it looks, so write no `<style>`,
name no colour, choose no font, and write no `<script>`.

## Output Files

`$BRAID_WORKSPACE/artifacts/views/exam/<board-id>.html`

One file per board. Create the directory if it is not there, and overwrite what is
there rather than adding beside it.

## Completion Checklist

- [ ] `$NEWLEDGE_CHECK` was run on what was written, and reported nothing
- [ ] Nothing from this file is repeated to the reader
- [ ] Every question's answer is in the material
- [ ] The level, kinds, and length asked for are what was written
- [ ] No contested claim is asked as though it were settled
- [ ] Questions are spread across the terms rather than gathered on a few
- [ ] Under `mixed`, no more than half the questions are recall
- [ ] Nothing obscure is labelled judgement merely for being hard
- [ ] Every choice question has exactly one option carrying `data-correct`
- [ ] Every wrong option is one a half-prepared reader would actually pick
- [ ] Every explanation says why the nearest wrong option is tempting
- [ ] Every explanation carries where it came from
- [ ] No id appears anywhere a reader can see
- [ ] No control, no `details`, no score, and no progress bar of your own
- [ ] No style block, no script, no colour, and no font of your own
- [ ] No doctype, html, head, or body element
- [ ] The graph was not mutated, no proposal was raised, no decision was recorded

## Companion Docs

`style.md`, in the reference directory the runner mounts for this plugin. It is
the whole vocabulary of classes and elements a written view may use, and the
markup the surface reads to make a page work. Read it before you write, because a
class it does not name styles nothing and does nothing.

### Where the three levels come from

They are a three-way cut of an axis educational assessment has used for decades.
Read these if a question's level is not obvious, rather than guessing at it.

- Webb's Depth of Knowledge, whose four levels are recall and reproduction, skills
  and concepts, strategic thinking, and extended thinking. It is also where the
  warning above comes from, that depth measures the thinking a task demands rather
  than how hard the task is.
  <https://www.structural-learning.com/post/webbs-depth-of-knowledge>
  <https://www.edutopia.org/blog/webbs-depth-knowledge-increase-rigor-gerald-aungst>
- Bloom's taxonomy as revised by Anderson and Krathwohl, whose six levels are
  remember, understand, apply, analyze, evaluate, and create.
  <https://www.prodigygame.com/main-en/blog/webbs-depth-of-knowledge-dok>

`recall` is that first level in both. `apply` gathers what the frameworks separate
into understanding, applying, and analysing, because on one board those are the
same act of putting two things beside each other. `judge` is evaluating. The
deepest level in each framework is extended work and has no place on a page a
reader finishes in one sitting.
