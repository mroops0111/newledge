import { GroupLabel } from './Surface.js'

/** One thing that can be switched on, and how much of it there is. */
export interface Filterable {
  readonly id: string
  readonly colour?: string
  readonly count: number
}

/**
 * What a reader has chosen to see, standing beside the canvas it decides.
 *
 * A survey of everything is unreadable, so what is on it is a choice,
 * and the choice stands beside what it decides,
 * rather than in a strip across the top of it.
 * A strip spends a band of the surface whatever is in it.
 *
 * Set as the panel on the other side of the canvas is set,
 * since both are a column of things read down beside a drawing,
 * and a reader crossing between them learns no second way to read a list.
 *
 * It stands over the canvas rather than beside it,
 * the way a board's instruments do,
 * so opening it does not squeeze the graph and set every card moving.
 * What it covers is given back to the fit instead,
 * which is a quieter way of making room.
 */
export function GraphFilters({ ref, kinds, relations, activeKinds, activeRelations, onToggle, onOnly }: {
  /** So the fit can give back whatever the panel is standing over. */
  ref?: React.Ref<HTMLElement>
  kinds: readonly Filterable[]
  relations: readonly Filterable[]
  activeKinds: ReadonlySet<string>
  activeRelations: ReadonlySet<string>
  onToggle: (group: 'nodeTypes' | 'edgeTypes', id: string) => void
  onOnly: (group: 'nodeTypes' | 'edgeTypes', ids: readonly string[]) => void
}): React.JSX.Element {
  return (
    <aside
      ref={ref}
      className="absolute inset-y-0 left-0 z-10 w-56 overflow-y-auto border-r border-line bg-surface px-4 pb-6 pt-14 shadow-lifted"
    >
      <Group
        name="Kinds"
        things={kinds}
        active={activeKinds}
        onToggle={id => onToggle('nodeTypes', id)}
        onAll={ids => onOnly('nodeTypes', ids)}
      />
      <div className="mt-7">
        <Group
          name="Relations"
          things={relations}
          active={activeRelations}
          onToggle={id => onToggle('edgeTypes', id)}
          onAll={ids => onOnly('edgeTypes', ids)}
        />
      </div>
    </aside>
  )
}

function Group({ name, things, active, onToggle, onAll }: {
  name: string
  things: readonly Filterable[]
  active: ReadonlySet<string>
  onToggle: (id: string) => void
  onAll: (ids: readonly string[]) => void
}): React.JSX.Element {
  const every = things.every(thing => active.has(thing.id))

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <GroupLabel>{name}</GroupLabel>
        {/*
          One switch rather than two, since all and none are the same reach
          for a reader who wants to start over, and which of the two they
          meant is answered by what is on.
        */}
        <button
          type="button"
          onClick={() => onAll(every ? [] : things.map(thing => thing.id))}
          className="font-ui text-label text-ink-subtle transition-colors hover:text-ink"
        >
          {every ? 'None' : 'All'}
        </button>
      </div>
      <ul className="mt-3 space-y-px">
        {things.map(thing => (
          <li key={thing.id}>
            <Row thing={thing} on={active.has(thing.id)} onToggle={() => onToggle(thing.id)} />
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * One switch, which is a dot, a word, and how much of it there is.
 *
 * A kind wears its own colour as the dot a topic card wears,
 * and a relation has no colour of its own,
 * so its dot is drawn in the line colour and stands where the others stand.
 * A row without one would sit out of the column the rest are read down.
 *
 * A count says whether anything is behind a switch before it is touched,
 * and it is set quiet,
 * since it is what the row is about only once the name has been read.
 */
function Row({ thing, on, onToggle }: {
  thing: Filterable
  on: boolean
  onToggle: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className="flex w-full items-center gap-2.5 rounded-control px-2 py-1 text-left transition-colors hover:bg-raised"
    >
      <span
        className="size-2 shrink-0 rounded-full transition-colors"
        style={{ backgroundColor: on ? (thing.colour ?? 'var(--edge)') : 'var(--line-strong)' }}
      />
      <span className={`truncate font-ui text-prose-sm ${on ? 'text-ink' : 'text-ink-subtle'}`}>
        {thing.id}
      </span>
      <span className="ml-auto font-ui text-label tabular-nums text-ink-subtle">{thing.count}</span>
    </button>
  )
}
