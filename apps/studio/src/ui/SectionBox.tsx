import type { Section } from '@newledge/board'
import { Handle, Position } from '@xyflow/react'

export interface SectionBoxData {
  readonly section: Section
  readonly onRename: (name: string) => void
  readonly onRenamed: () => void
  /** Whether a reader has taken hold of this section, which is what moves it. */
  readonly grabbed: boolean
  [key: string]: unknown
}

/**
 * A container a reader drew and named.
 * It sits behind the cards rather than around them, so what a reader dropped
 * inside stays legible and the grouping reads as ground rather than as a box
 * competing with its contents. The name stands on that ground rather than in
 * the gap above it, so it reads as the section's own and not as something
 * floating between one section and the next. The layout keeps the top of a
 * section clear for it, so nothing is dropped over it.
 *
 * A section moves only once a reader has taken hold of it. Its ground is the
 * largest thing on the board and it is where a reader reaches to move the
 * board itself, so a section that moved by its ground would be a hole the
 * board fell into wherever a section lay.
 */
export function SectionBox({ data }: { data: SectionBoxData }): React.JSX.Element {
  const { section, onRename, onRenamed, grabbed } = data
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
      */}
      <input
        value={section.name}
        onChange={event => onRename(event.target.value)}
        onBlur={onRenamed}
        size={Math.max(section.name.length, 8)}
        aria-label="Section name"
        className="nodrag absolute left-3 top-2 max-w-[calc(100%-1.5rem)] rounded-control bg-transparent px-1 py-1 font-ui text-sm font-semibold text-ink-muted outline-none focus:bg-surface"
      />
    </div>
  )
}
