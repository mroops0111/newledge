import type { ReactNode } from 'react'
import type { OutlineSection } from './Outline.js'
import { Outline } from './Outline.js'

export type { OutlineEntry, OutlineSection } from './Outline.js'

// The rail stays put and holds its own scroll,
// since a reader steering by it loses the map the moment it scrolls away.
const RAIL = 'sticky top-0 h-screen shrink-0 overflow-y-auto'

/**
 * The frame every surface sits in.
 * A narrow column names the surfaces, an outline steers within the one on screen,
 * and main is left full width for each surface to take the measure it needs,
 * so a dense surface and a reading one share this frame.
 */
export function AppShell({ title, count, outline, children }: {
  title: string
  count?: number
  outline: readonly OutlineSection[]
  children: ReactNode
}): React.JSX.Element {
  return (
    <div className="flex min-h-screen">
      <nav className={`${RAIL} hidden w-52 border-r border-line bg-raised/40 p-4 md:block`}>
        <p className="px-3 py-2 font-ui text-sm font-semibold tracking-tight text-ink">Newledge</p>
        <span className="mt-4 flex items-center justify-between rounded-control bg-raised px-3 py-2 font-ui text-sm text-ink">
          {title}
          {count !== undefined && count > 0 && (
            <span className="font-ui text-xs tabular-nums text-ink-subtle">{count}</span>
          )}
        </span>
      </nav>

      {/* The outline sits opposite the navigation, so the reading column is held
          between them rather than pushed off to one side.
          A rail against the left margin would also compete with the return
          sweep the eye makes at the start of every line. */}
      <main className="min-w-0 flex-1">
        <div className="mx-auto flex w-full max-w-[64.5rem] gap-10 px-10 py-14">
          <div className="min-w-0 flex-1">{children}</div>
          {outline.length > 0 && (
            <aside className="sticky top-14 hidden h-fit max-h-[calc(100vh-7rem)] w-56 shrink-0 overflow-y-auto lg:block">
              <Outline sections={outline} />
            </aside>
          )}
        </div>
      </main>
    </div>
  )
}
