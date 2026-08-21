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
