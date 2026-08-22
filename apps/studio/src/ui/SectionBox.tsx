import type { Section } from '@newledge/board'
import { Handle, Position } from '@xyflow/react'

export interface SectionBoxData {
  readonly section: Section
  readonly onRename: (name: string) => void
  readonly onRenamed: () => void
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
 */
export function SectionBox({ data }: { data: SectionBoxData }): React.JSX.Element {
  const { section, onRename, onRenamed } = data
  return (
    <div className="relative" style={{ width: section.width, height: section.height }}>
      {/*
        A section is a topic, so a relation can run between two of them, and a
        canvas drops an edge whose end has nowhere to attach.
      */}
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
      <div className="size-full rounded-card border border-section-line bg-section" />
      <input
        value={section.name}
        onChange={event => onRename(event.target.value)}
        onBlur={onRenamed}
        aria-label="Section name"
        className="nodrag absolute left-3 top-2 w-[calc(100%-1.5rem)] rounded-control bg-transparent px-1 py-1 font-ui text-sm font-semibold text-ink-muted outline-none focus:bg-surface"
      />
    </div>
  )
}
