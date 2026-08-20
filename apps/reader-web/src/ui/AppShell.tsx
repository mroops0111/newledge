import type { ReactNode } from 'react'

export interface NavItem {
  readonly id: string
  readonly label: string
  readonly count?: number
}

function NavLink({ item, active }: { item: NavItem, active: boolean }): React.JSX.Element {
  const tone = active ? 'bg-raised text-ink' : 'text-ink-muted hover:bg-raised/60 hover:text-ink'
  return (
    <span className={`flex items-center justify-between rounded-control px-3 py-2 font-ui text-sm ${tone}`}>
      {item.label}
      {item.count !== undefined && item.count > 0 && (
        <span className="font-ui text-xs tabular-nums text-ink-subtle">{item.count}</span>
      )}
    </span>
  )
}

/**
 * The frame every surface sits in, a narrow rail beside a full-width main area.
 * Reading keeps its own column width inside main, while the board can use the
 * whole area, so one frame carries both without a second layout.
 */
export function AppShell({ items, activeId, children }: {
  items: readonly NavItem[]
  activeId: string
  children: ReactNode
}): React.JSX.Element {
  return (
    <div className="flex min-h-screen">
      <nav className="hidden w-60 shrink-0 border-r border-line bg-raised/40 p-4 md:block">
        <p className="px-3 py-2 font-ui text-sm font-semibold tracking-tight text-ink">Newledge</p>
        <ul className="mt-4 space-y-1">
          {items.map(item => (
            <li key={item.id}>
              <NavLink item={item} active={item.id === activeId} />
            </li>
          ))}
        </ul>
      </nav>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}
