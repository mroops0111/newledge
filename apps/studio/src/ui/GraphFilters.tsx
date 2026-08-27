import type { EdgeStyle } from '../lib/boardStyle.js'
import { worded } from '../lib/naming.js'
import { edgeStyle, nodeStyle, TONE_COLOURS } from '../lib/boardStyle.js'
import type { GraphEdge, GraphNode, Ontology } from '../lib/graph.js'
import { markerShape } from './BoardMarkers.js'
import { GroupLabel } from './Surface.js'
import { GLYPHS } from './Toolkit.js'

/**
 * How one switch shows what it stands for on the canvas.
 *
 * A kind is told from another kind by colour, so its legend is that colour.
 * A relation is not.
 * Every relation is drawn in the same two greys unless it is an argument,
 * and what tells one from another is its dash and the end it carries,
 * so a dot beside a relation is a legend for nothing,
 * and a column of them says the relations have no marks, which is false.
 * The survey writes a verb only on the lines a reader has asked about,
 * which leaves this as the one place the rest of them are explained.
 */
export type Legend =
  | { readonly as: 'colour', readonly colour: string }
  | { readonly as: 'line', readonly line: EdgeStyle }

/** One thing that can be switched on, and how much of it there is. */
export interface Filterable {
  readonly id: string
  readonly legend: Legend
  readonly count: number
}

/**
 * The switches the panel offers, worked out from the ontology and the graph.
 *
 * The kinds come in the order they stand on each other. Ground first,
 * since it is what the rest sits on,
 * and then the bands a section is read down,
 * which is terms, then what is asserted about them,
 * then where that came from.
 * Read off the same facts a board arranges by,
 * so the two surfaces never disagree about which kind comes first.
 *
 * Both are counted over the whole graph rather than over what is drawn,
 * so a switch says what turning it on would bring,
 * rather than what it has brought already.
 */
export function switchesFor(
  ontology: Ontology,
  graph: { readonly nodes: readonly GraphNode[], readonly edges: readonly GraphEdge[] },
  colourOf: (typeId: string) => string,
): { readonly kinds: readonly Filterable[], readonly relations: readonly Filterable[] } {
  const standing = [...ontology.nodeTypes].sort((one, other) => {
    const [a, b] = [nodeStyle(one.id), nodeStyle(other.id)]
    return Number(b.ground) - Number(a.ground) || a.band - b.band
  })

  return {
    kinds: standing.map(type => ({
      id: type.id,
      legend: { as: 'colour', colour: colourOf(type.id) },
      count: graph.nodes.filter(node => node.type === type.id).length,
    })),
    relations: ontology.edgeTypes.map(type => ({
      id: type.id,
      legend: { as: 'line', line: edgeStyle(type.id) },
      count: graph.edges.filter(edge => edge.type === type.id).length,
    })),
  }
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
 * How wide a relation's line is drawn in the panel, and how tall its box is.
 * Wide enough that a dash of six on four repeats twice,
 * since one repeat of a dash is a gap and says nothing about the pattern.
 */
const SWATCH_WIDTH = 26
const SWATCH_HEIGHT = 12
const SWATCH_STROKE = 1.5

/**
 * What a switch stands for, drawn as the canvas draws it.
 *
 * A mark keeps its own appearance whether the switch is on or off,
 * since it is the legend for that mark wherever it appears on the canvas,
 * and a legend that only holds while its subject is drawn is not a legend.
 * Whether the switch is on is said by the band and the tick instead.
 */
function Mark({ legend }: { legend: Legend }): React.JSX.Element {
  switch (legend.as) {
    case 'colour':
      return <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: legend.colour }} />
    case 'line': {
      const { line } = legend
      const paint = TONE_COLOURS[line.tone]
      // The end is drawn in its own twelve wide box at the far end of the run,
      // which is the box the canvas defines it in,
      // so a reader comparing the two is comparing the same drawing.
      const marked = line.marker !== 'none'
      return (
        <svg
          viewBox={`0 0 ${SWATCH_WIDTH} ${SWATCH_HEIGHT}`}
          className="h-3 w-[26px] shrink-0"
          aria-hidden
        >
          <line
            x1={0}
            y1={SWATCH_HEIGHT / 2}
            x2={marked ? SWATCH_WIDTH - 10 : SWATCH_WIDTH}
            y2={SWATCH_HEIGHT / 2}
            stroke={paint}
            strokeWidth={SWATCH_STROKE}
            {...(line.dash === undefined ? {} : { strokeDasharray: line.dash })}
          />
          {line.marker !== 'none' && (
            <g transform={`translate(${SWATCH_WIDTH - SWATCH_HEIGHT} 0)`}>
              {markerShape(line.marker, paint)}
            </g>
          )}
        </svg>
      )
    }
    default: {
      const exhaustive: never = legend
      throw new Error(`Unhandled legend: ${JSON.stringify(exhaustive)}`)
    }
  }
}

/**
 * One switch, which is a mark, a word, how much of it there is, and a tick.
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
      <Mark legend={thing.legend} />
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
