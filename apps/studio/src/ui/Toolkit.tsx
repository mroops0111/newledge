import type { ReactNode, Ref } from 'react'

export interface Tool {
  readonly id: string
  readonly label: string
  readonly icon: ReactNode
  readonly onUse: () => void
  readonly disabled?: boolean
  readonly active?: boolean
}

/**
 * What a reader reaches for while working on a board.
 * It sits down the left of the canvas rather than above it, because it is a
 * set of instruments a reader keeps returning to, not a header the board is
 * filed under, and because it will grow.
 */
export function Toolkit({ groups, ref }: {
  groups: readonly (readonly Tool[])[]
  /** Held so a fit can leave the board room to stand clear of the rail. */
  ref?: Ref<HTMLDivElement>
}): React.JSX.Element {
  return (
    <div ref={ref} className="absolute left-4 top-4 z-10 flex flex-col gap-2 rounded-card border border-line bg-surface p-1.5 shadow-card">
      {groups.map((group, index) => (
        <div key={group[0]?.id ?? index} className="flex flex-col gap-0.5">
          {index > 0 && <div className="mx-1 mb-1.5 h-px bg-line" />}
          {group.map(tool => (
            <button
              key={tool.id}
              type="button"
              onClick={tool.onUse}
              disabled={tool.disabled === true}
              aria-label={tool.label}
              aria-pressed={tool.active}
              title={tool.label}
              className={`flex size-9 items-center justify-center rounded-control transition-colors
                disabled:cursor-not-allowed disabled:opacity-30
                ${tool.active === true ? 'bg-ink text-canvas' : 'text-ink-muted hover:bg-raised hover:text-ink'}`}
            >
              {tool.icon}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

function Glyph({ children }: { children: ReactNode }): React.JSX.Element {
  return <svg viewBox="0 0 20 20" className="size-4" aria-hidden {...STROKE}>{children}</svg>
}

export const GLYPHS = {
  fit: <Glyph><path d="M3 7V4a1 1 0 0 1 1-1h3M17 7V4a1 1 0 0 0-1-1h-3M3 13v3a1 1 0 0 0 1 1h3M17 13v3a1 1 0 0 1-1 1h-3" /></Glyph>,
  zoomIn: <Glyph><circle cx="9" cy="9" r="5.5" /><path d="M9 7v4M7 9h4M13 13l4 4" /></Glyph>,
  zoomOut: <Glyph><circle cx="9" cy="9" r="5.5" /><path d="M7 9h4M13 13l4 4" /></Glyph>,
  section: <Glyph><rect x="3" y="4" width="14" height="12" rx="2" /><path d="M3 8h14" /></Glyph>,
  card: <Glyph><rect x="4" y="3" width="12" height="14" rx="2" /><path d="M7 7h6M7 10h6M7 13h3" /></Glyph>,
  focus: <Glyph><circle cx="10" cy="10" r="3" /><path d="M10 2v2M10 16v2M2 10h2M16 10h2" /></Glyph>,
  rearrange: <Glyph><path d="M4 6h5a3 3 0 0 1 3 3v5M16 6h-2M16 6l-2-2M16 6l-2 2M12 14l-2-2M12 14l2-2" /></Glyph>,
}
