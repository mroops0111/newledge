import type { ReactNode } from 'react'

/** The surface a single reading sits on. */
export function Surface({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <article className="rounded-card border border-line bg-surface p-7 shadow-card transition-shadow hover:shadow-lifted">
      {children}
    </article>
  )
}

/** A small uppercase heading that labels a group without competing with it. */
export function GroupLabel({ children }: { children: ReactNode }): React.JSX.Element {
  return <h3 className="font-ui text-label font-semibold uppercase text-ink-subtle">{children}</h3>
}

/** A quiet link out to a page a reading came from, named rather than hosted. */
export function SourceLink({ href, children }: { href?: string, children: ReactNode }): React.JSX.Element {
  const shared = 'block rounded-control bg-raised px-2 py-1 font-ui text-xs text-ink-muted'
  if (href === undefined)
    return <span className={shared}>{children}</span>
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`${shared} transition-colors hover:text-ink`}
    >
      {children}
    </a>
  )
}
