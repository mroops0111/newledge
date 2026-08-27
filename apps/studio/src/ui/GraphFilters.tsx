import { GroupLabel } from './Surface.js'
import { GLYPHS } from './Toolkit.js'

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
 * It takes its own column rather than standing over the canvas,
 * so nothing a reader turned on is then hidden by the switch that turned it on,
 * and the canvas keeps a corner of its own to put its instruments in.
 */
export function GraphFilters({ kinds, relations, activeKinds, activeRelations, onToggle, onOnly }: {
  kinds: readonly Filterable[]
  relations: readonly Filterable[]
  activeKinds: ReadonlySet<string>
  activeRelations: ReadonlySet<string>
  onToggle: (group: 'nodeTypes' | 'edgeTypes', id: string) => void
  onOnly: (group: 'nodeTypes' | 'edgeTypes', ids: readonly string[]) => void
}): React.JSX.Element {
  return (
    <aside className="w-56 shrink-0 overflow-y-auto border-r border-line bg-surface py-5">
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

/**
 * A group of switches under the heading they answer to.
 *
 * All and none are offered as two words rather than as one that changes,
 * since a reader reaches for the one they want by name.
 * A word that would change nothing is set quiet and left in place,
 * because a control that disappears is one a reader has to find again.
 */
function Group({ name, things, active, onToggle, onAll }: {
  name: string
  things: readonly Filterable[]
  active: ReadonlySet<string>
  onToggle: (id: string) => void
  onAll: (ids: readonly string[]) => void
}): React.JSX.Element {
  const every = things.every(thing => active.has(thing.id))
  const none = things.every(thing => !active.has(thing.id))

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 px-4">
        <GroupLabel>{name}</GroupLabel>
        <div className="flex items-baseline gap-2.5">
          <Sweep word="All" spent={every} onClick={() => onAll(things.map(thing => thing.id))} />
          <Sweep word="None" spent={none} onClick={() => onAll([])} />
        </div>
      </div>
      <ul className="mt-2">
        {things.map(thing => (
          <li key={thing.id}>
            <Row thing={thing} on={active.has(thing.id)} onToggle={() => onToggle(thing.id)} />
          </li>
        ))}
      </ul>
    </div>
  )
}

/** One reach that takes a whole group somewhere, or is already there. */
function Sweep({ word, spent, onClick }: {
  word: string
  spent: boolean
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={spent}
      className={`font-ui text-label transition-colors ${spent
        ? 'text-line-strong'
        : 'text-ink-subtle hover:text-ink'}`}
    >
      {word}
    </button>
  )
}

/**
 * A type's name set as words rather than as the identifier it is written as.
 * A name is read here, not typed,
 * and `relatesTo` read in capitals is one word nobody can see the seam in.
 */
function worded(id: string): string {
  return id.replace(/(?<=[a-z])(?=[A-Z])/g, ' ')
}

/**
 * One switch, which is a dot, a word, how much of it there is, and a tick.
 *
 * The dot keeps its colour whether the switch is on or off,
 * since it is the legend for that colour wherever it appears on the canvas,
 * and a legend that only holds while a kind is drawn is not a legend.
 * A relation has no colour of its own,
 * so its dot is drawn in the line colour and stands where the others stand.
 *
 * Whether a switch is on is said by the band behind it and by the tick,
 * which are read across a column at a glance,
 * where a shade of grey has to be compared against its neighbours.
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
      className={`flex w-full items-center gap-2.5 px-4 py-1.5 text-left transition-colors ${on
        ? 'bg-raised'
        : 'hover:bg-raised'}`}
    >
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: thing.colour ?? 'var(--edge)' }}
      />
      <span
        className={`truncate font-ui text-label font-semibold uppercase tracking-wide ${on
          ? 'text-ink'
          : 'text-ink-subtle'}`}
      >
        {worded(thing.id)}
      </span>
      <span className="ml-auto font-ui text-label tabular-nums text-ink-subtle">{thing.count}</span>
      {/* Kept in the row whether it is ticked or not, so a name never shifts. */}
      <span className={`shrink-0 ${on ? 'text-ink-muted' : 'text-transparent'}`}>{GLYPHS.check}</span>
    </button>
  )
}
