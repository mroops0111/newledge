export interface ToggleOption {
  readonly id: string
  readonly colour?: string
}

/**
 * The switches that decide what the board draws.
 * Drawing rules live in the view rather than in the canvas,
 * so asking for a relation brings whatever it reaches along with it.
 */
export function TypeToggles({ label, options, active, onToggle }: {
  label: string
  options: readonly ToggleOption[]
  active: ReadonlySet<string>
  onToggle: (id: string) => void
}): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 font-ui text-label font-semibold uppercase text-ink-subtle">{label}</span>
      {options.map((option) => {
        const on = active.has(option.id)
        const tone = on ? 'border-line-strong bg-surface text-ink' : 'border-transparent text-ink-subtle hover:text-ink-muted'
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onToggle(option.id)}
            aria-pressed={on}
            className={`flex items-center gap-1.5 rounded-control border px-2 py-1 font-ui text-xs transition-colors ${tone}`}
          >
            {option.colour !== undefined && (
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: on ? option.colour : 'currentColor' }}
              />
            )}
            {option.id}
          </button>
        )
      })}
    </div>
  )
}
