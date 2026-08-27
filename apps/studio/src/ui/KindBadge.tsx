/**
 * How much of the kind's own colour the badge is washed with.
 * Enough to read as that colour at a glance,
 * and pale enough that the word stays the thing read, not the patch under it.
 */
const WASH = '15%'
const EDGE = '35%'

/**
 * What kind of thing a card is, said in a word.
 *
 * Said in a colour alone it would be another thing colour means,
 * after which family a card is in, and whether a relation agrees or conflicts,
 * and a reader would have to know which of the three a patch was speaking.
 * The word needs nothing known in advance,
 * and wearing the colour as well lets a reader find every card of one kind,
 * without reading any of them.
 *
 * Worn the same on every surface,
 * so a reader crossing between a survey and a board is told one thing once.
 *
 * A surface whose colours already mean something else passes none,
 * and the badge goes quiet rather than reading the same patch twice.
 */
export function KindBadge({ kind, colour }: {
  kind: string
  colour?: string
}): React.JSX.Element {
  // Mixed rather than given an alpha,
  // since a colour reaches here as a plain hex or as a variable,
  // and neither takes an alpha component appended to it.
  const worn = colour === undefined
    ? undefined
    : {
        color: colour,
        backgroundColor: `color-mix(in oklab, ${colour} ${WASH}, transparent)`,
        borderColor: `color-mix(in oklab, ${colour} ${EDGE}, transparent)`,
      }

  return (
    <span
      className={`inline-flex items-center rounded-sm border px-1 py-px font-ui text-label font-semibold uppercase ${
        worn === undefined ? 'border-transparent bg-raised text-ink-subtle' : ''}`}
      {...(worn === undefined ? {} : { style: worn })}
    >
      {kind}
    </span>
  )
}
