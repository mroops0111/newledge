import { useState } from 'react'
import { KindBadge } from './KindBadge.js'

/** One thing that can be switched on, and how much of it there is. */
export interface Filterable {
  readonly id: string
  readonly colour?: string
  readonly count: number
}

/**
 * What a reader has chosen to see, kept under the surface's own name.
 *
 * A survey of everything is unreadable, so what is on it is a choice,
 * and it belongs beside the name of the surface making it,
 * rather than in a strip over the canvas.
 * That is where a board keeps its list of boards,
 * and a graph choosing what it draws is the same kind of choice.
 *
 * Each group folds away.
 * A reader who has settled what they want to see is not still being asked,
 * and a count is what says whether anything is behind a switch,
 * before a reader touches it.
 */
export function GraphFilters({ kinds, relations, activeKinds, activeRelations, onToggle }: {
  kinds: readonly Filterable[]
  relations: readonly Filterable[]
  activeKinds: ReadonlySet<string>
  activeRelations: ReadonlySet<string>
  onToggle: (group: 'nodeTypes' | 'edgeTypes', id: string) => void
}): React.JSX.Element {
  return (
    <div className="mt-1 space-y-1 border-l border-line pl-3">
      <Group name="Kinds" things={kinds} active={activeKinds} onToggle={id => onToggle('nodeTypes', id)} />
      <Group name="Relations" things={relations} active={activeRelations} onToggle={id => onToggle('edgeTypes', id)} />
    </div>
  )
}

function Group({ name, things, active, onToggle }: {
  name: string
  things: readonly Filterable[]
  active: ReadonlySet<string>
  onToggle: (id: string) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(true)
  const on = things.filter(thing => active.has(thing.id)).length

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(now => !now)}
        className="flex w-full items-center gap-1 rounded-control px-1.5 py-1 text-left font-ui text-label font-semibold uppercase text-ink-subtle transition-colors hover:bg-raised/60"
      >
        <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
        {name}
        <span className="ml-auto font-normal normal-case tabular-nums">{`${on}/${things.length}`}</span>
      </button>
      {open && (
        <ul className="space-y-px">
          {things.map(thing => (
            <li key={thing.id}>
              <Row thing={thing} on={active.has(thing.id)} onToggle={() => onToggle(thing.id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * One switch, wearing the thing it switches.
 * A kind wears the badge it wears on a card,
 * so a reader matches the switch to what appears without reading either.
 * A relation has no badge, since what tells relations apart is the line,
 * which a list cannot draw.
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
      className={`flex w-full items-center gap-2 rounded-control px-1.5 py-1 text-left font-ui text-label transition-colors ${on
        ? 'text-ink'
        : 'text-ink-subtle/60 hover:bg-raised/60 hover:text-ink-muted'}`}
    >
      {thing.colour === undefined
        ? <span className="truncate">{thing.id}</span>
        : <KindBadge kind={thing.id} {...(on ? { colour: thing.colour } : {})} />}
      <span className="ml-auto tabular-nums opacity-60">{thing.count}</span>
    </button>
  )
}
