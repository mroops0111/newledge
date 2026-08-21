import type { ReactNode } from 'react'

// The rail stays put and holds its own scroll,
// since a reader steering by it loses the map the moment it scrolls away.
const RAIL = 'sticky top-0 h-screen shrink-0 overflow-y-auto'

/**
 * The frame every surface sits in.
 * A narrow column names the surfaces.
 * Main is left full width so each surface takes the measure it needs,
 * which lets a dense surface and a reading one share this frame.
 * The panel beside main is a slot rather than a fixed occupant.
 * Reading fills it with an outline.
 * A conversation or an inspector will take the same place,
 * since each of them answers whichever surface a reader is on.
 */
export interface SurfaceLink {
  readonly id: string
  readonly label: string
  readonly count?: number
}

/** Which surfaces exist and which one a reader is on. */
export interface Nav {
  readonly surfaces: readonly SurfaceLink[]
  readonly activeId: string
  readonly onSelect: (id: string) => void
}

export function AppShell({ surfaces, activeId, onSelect, panel, children }: {
  surfaces: readonly SurfaceLink[]
  activeId: string
  onSelect: (id: string) => void
  panel?: ReactNode
  children: ReactNode
}): React.JSX.Element {
  return (
    <div className="flex min-h-screen">
      <nav className={`${RAIL} hidden w-52 border-r border-line bg-raised/40 p-4 md:block`}>
        <p className="px-3 py-2 font-ui text-sm font-semibold tracking-tight text-ink">Newledge</p>
        <ul className="mt-4 space-y-1">
          {surfaces.map((surface) => {
            const tone = surface.id === activeId ? 'bg-raised text-ink' : 'text-ink-muted hover:bg-raised/60 hover:text-ink'
            return (
              <li key={surface.id}>
                <button
                  type="button"
                  onClick={() => onSelect(surface.id)}
                  className={`flex w-full items-center justify-between rounded-control px-3 py-2 font-ui text-sm transition-colors ${tone}`}
                >
                  {surface.label}
                  {surface.count !== undefined && surface.count > 0 && (
                    <span className="font-ui text-xs tabular-nums text-ink-subtle">{surface.count}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* The frame imposes no measure of its own, so a canvas can run edge to
          edge while a reading surface holds itself to a column.
          The panel sits opposite the navigation, out of the way of the return
          sweep the eye makes at the start of every line. */}
      <main className="min-w-0 flex-1">{children}</main>

      {panel !== undefined && (
        <aside className={`${RAIL} hidden border-l border-line lg:block`}>{panel}</aside>
      )}
    </div>
  )
}
