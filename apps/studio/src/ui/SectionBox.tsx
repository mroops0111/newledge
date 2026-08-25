import type { Section } from '@newledge/board'
import { Handle, Position, useStore } from '@xyflow/react'
import { SECTION_HEADER } from '../lib/arrange.js'
import { growthAt } from '../lib/boardStyle.js'

/**
 * How the name is set at rest, in the units the board is laid out in.
 * Read off the label role, since that is what the name is worn as,
 * and needed as a number here because the room it has is one too.
 */
const NAME_SIZE = 12
const NAME_LEADING = 1.2

/** What the name is inset by, and the air kept under it, in board units. */
const NAME_TOP = 8
const NAME_PADDING = 8

/**
 * How far the name may be grown before it runs out of the strip it sits in.
 *
 * The strip is what the layout keeps clear, so the name may fill it,
 * and no more. Past this it reaches the first row of cards,
 * and a name written across a card is worse than a section named small.
 *
 * Its padding does not grow with it, so this is worked out from the line alone.
 * That is also why the name is set by its size rather than scaled whole,
 * the way a card's name is, which would carry the padding along.
 */
const NAME_GROWS_TO = (SECTION_HEADER - NAME_TOP - NAME_PADDING) / (NAME_SIZE * NAME_LEADING)

export interface SectionBoxData {
  readonly section: Section
  readonly onRename: (name: string) => void
  readonly onRenamed: () => void
  /** Whether a reader has taken hold of this section, which is what moves. */
  readonly grabbed: boolean
  [key: string]: unknown
}

/**
 * A container a reader drew and named.
 * It sits behind the cards rather than around them,
 * so what a reader dropped inside stays legible,
 * and the grouping reads as ground rather than as a box competing with it.
 * The name stands on that ground rather than in the gap above it,
 * so it reads as the section's own,
 * and not as something floating between one section and the next.
 * The layout keeps the top of a section clear for it,
 * so nothing is dropped over it.
 *
 * A section moves only once a reader has taken hold of it.
 * Its ground is the largest thing on the board,
 * and it is where a reader reaches to move the board itself,
 * so a section that moved by its ground would be a hole the board fell into.
 */
export function SectionBox({ data }: { data: SectionBoxData }): React.JSX.Element {
  const { section, onRename, onRenamed, grabbed } = data
  const growth = growthAt(useStore(state => state.transform[2]), NAME_GROWS_TO)
  return (
    <div className="relative" style={{ width: section.width, height: section.height }}>
      {/*
        A section is a topic, so a relation can run between two of them, and a
        canvas drops an edge whose end has nowhere to attach.
      */}
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
      <div
        className={`size-full rounded-card border bg-section ${grabbed
          ? 'cursor-grab border-ink/30 ring-2 ring-ink/20'
          : 'border-section-line'}`}
      />
      {/*
        Sized to its own text, so a click beside the name still lands on the
        section and not in a text field that reaches across the whole strip.
        The size is in characters, so the field widens with the name as the
        name grows, and is held to the strip so a long one cannot run past it.
      */}
      <div className="absolute left-3 top-2 max-w-[calc(100%-1.5rem)] font-ui text-label">
        <input
          value={section.name}
          onChange={event => onRename(event.target.value)}
          onBlur={onRenamed}
          size={Math.max(section.name.length, 8)}
          aria-label="Section name"
          style={{ fontSize: `${growth}em` }}
          className="nodrag max-w-full rounded-control bg-transparent px-1 py-1 font-semibold text-ink-muted outline-none focus:bg-surface"
        />
      </div>
    </div>
  )
}
