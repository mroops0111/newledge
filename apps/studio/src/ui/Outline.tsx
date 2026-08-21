export interface OutlineEntry {
  readonly anchor: string
  readonly label: string
}

export interface OutlineSection {
  readonly id: string
  readonly title: string
  readonly entries: readonly OutlineEntry[]
}

/**
 * A document outline, drawn as entries hanging off one continuous rule.
 * Depth is carried by the rule and the indent rather than by a heavy label,
 * so the themes stay quiet enough for the entries under them to be scanned.
 */
export function Outline({ sections }: { sections: readonly OutlineSection[] }): React.JSX.Element {
  return (
    <nav className="w-60 px-4 py-6">
      {sections.map(section => (
        <section key={section.id} className="mb-6 last:mb-0">
          <h2 className="font-ui text-xs font-semibold text-ink">{section.title}</h2>
          <ul className="mt-1.5 space-y-0.5">
            {section.entries.map(entry => (
              <li key={entry.anchor}>
                <a
                  href={`#${entry.anchor}`}
                  title={entry.label}
                  className="-ml-4 block truncate border-l border-transparent py-0.5 pl-4 font-ui text-xs text-ink-subtle transition-colors hover:border-l-ink-muted hover:text-ink"
                >
                  {entry.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  )
}
