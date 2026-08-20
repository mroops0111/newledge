import type { ReactNode } from 'react'

export interface OutlineEntry {
  readonly anchor: string
  readonly label: string
}

export interface OutlineSection {
  readonly id: string
  readonly title: string
  readonly entries: readonly OutlineEntry[]
}

// Both columns hold their own scroll and stay put,
// since a reader steering by them loses the map the moment it scrolls away.
const COLUMN = 'sticky top-0 h-screen shrink-0 overflow-y-auto border-r border-line'

function Outline({ sections }: { sections: readonly OutlineSection[] }): React.JSX.Element {
  return (
    <aside className={`${COLUMN} hidden w-60 px-3 py-6 lg:block`}>
      {sections.map(section => (
        <section key={section.id} className="mb-5">
          <h2 className="px-3 font-ui text-label font-semibold uppercase text-ink-subtle">{section.title}</h2>
          <ul className="mt-1.5">
            {section.entries.map(entry => (
              <li key={entry.anchor}>
                <a
                  href={`#${entry.anchor}`}
                  className="block truncate rounded-control px-3 py-1 font-ui text-xs text-ink-muted transition-colors hover:bg-raised hover:text-ink"
                >
                  {entry.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </aside>
  )
}

/**
 * The frame every surface sits in.
 * A narrow column names the surfaces, an outline column steers within the one
 * on screen, and main is left full width for each surface to take the measure
 * it needs, so a dense surface and a reading one share this frame.
 */
export function AppShell({ title, count, outline, children }: {
  title: string
  count?: number
  outline: readonly OutlineSection[]
  children: ReactNode
}): React.JSX.Element {
  return (
    <div className="flex min-h-screen">
      <nav className={`${COLUMN} hidden w-52 bg-raised/40 p-4 md:block`}>
        <p className="px-3 py-2 font-ui text-sm font-semibold tracking-tight text-ink">Newledge</p>
        <span className="mt-4 flex items-center justify-between rounded-control bg-raised px-3 py-2 font-ui text-sm text-ink">
          {title}
          {count !== undefined && count > 0 && (
            <span className="font-ui text-xs tabular-nums text-ink-subtle">{count}</span>
          )}
        </span>
      </nav>

      {outline.length > 0 && <Outline sections={outline} />}

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}
