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
 * competing with its contents.
 */
export function SectionBox({ data }: { data: SectionBoxData }): React.JSX.Element {
  const { section, onRename, onRenamed } = data
  return (
    <div
      className="rounded-card border border-line bg-raised/60"
      style={{ width: section.width, height: section.height }}
    >
      <input
        value={section.name}
        onChange={event => onRename(event.target.value)}
        onBlur={onRenamed}
        aria-label="Section name"
        className="nodrag m-2 w-[calc(100%-1rem)] rounded-control bg-transparent px-2 py-1 font-ui text-xs font-semibold text-ink outline-none focus:bg-surface"
      />
    </div>
  )
}
