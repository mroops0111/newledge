import type { Section } from '@newledge/board'

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
 * competing with its contents. The name sits above the ground, where a card
 * dropped into the section cannot cover it.
 */
export function SectionBox({ data }: { data: SectionBoxData }): React.JSX.Element {
  const { section, onRename, onRenamed } = data
  return (
    <div className="relative" style={{ width: section.width, height: section.height }}>
      <input
        value={section.name}
        onChange={event => onRename(event.target.value)}
        onBlur={onRenamed}
        aria-label="Section name"
        className="nodrag absolute -top-8 left-0 w-full rounded-control bg-transparent px-2 py-1 font-ui text-sm font-semibold text-ink-muted outline-none focus:bg-surface"
      />
      <div className="size-full rounded-card border border-section-line bg-section" />
    </div>
  )
}
