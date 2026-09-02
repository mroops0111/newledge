import { useStore } from '@xyflow/react'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { growthAt } from '../lib/boardStyle.js'
import { GLYPHS } from './Toolkit.js'

/**
 * How far this may grow back against a board going out.
 *
 * A control wants a size on the screen rather than a size on the board,
 * and undoing the scale is how one is held on a canvas that scales.
 * Further than a card's own text may grow,
 * because a word shrinking is still a word and a button of seven pixels,
 * is a button nobody can hit.
 */
const HOLDS_ITS_SIZE = 6

/** One thing a reader can do to the card they opened this on. */
export interface CardAct {
  readonly id: string
  readonly label: string
  readonly icon: ReactNode
  /**
   * Whether this takes something away.
   * It is the one act in a menu a reader wants to be sure of,
   * before they press it.
   */
  readonly removes?: boolean
  /** How else it can be reached, said where a reader hovers rather than drawn. */
  readonly key?: string
  readonly onUse: () => void
}

/**
 * What a reader can do to one card, opened from the card itself.
 *
 * Not in the rail beside the board.
 * A rail is where a reader reaches for what goes on a board,
 * and for how they are looking at it,
 * so an act on one card would answer a question nobody had asked yet,
 * in the place they ask a different one.
 *
 * A menu rather than a cross.
 * Taking a card off is one of several things worth doing to one,
 * and a cross can only ever be the last of them.
 */
export function CardMenu({ acts }: { acts: readonly CardAct[] }): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const held = useRef<HTMLDivElement>(null)
  const growth = growthAt(useStore(state => state.transform[2]), HOLDS_ITS_SIZE)

  // Clicking away closes it, which is the only way out that costs no control.
  useEffect(() => {
    if (!open)
      return
    function away(event: MouseEvent): void {
      if (!held.current?.contains(event.target as Node))
        setOpen(false)
    }
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [open])

  return (
    <div
      ref={held}
      className="nodrag absolute right-1 top-1 z-10 origin-top-right"
      style={{ transform: `scale(${growth})` }}
    >
      <button
        type="button"
        aria-label="What you can do with this card"
        aria-expanded={open}
        onClick={(event) => {
          // The canvas would take this as picking the card underneath.
          event.stopPropagation()
          setOpen(now => !now)
        }}
        // A glyph that takes a ground,
        // which is how every small control here is drawn.
        // Open, it holds the ground it took rather than inverting,
        // since a dark square is a weight this card did not ask for,
        // to say a menu under it is showing.
        className={`flex size-7 items-center justify-center rounded-control transition-colors ${open
          ? 'bg-raised text-ink'
          : 'text-ink-muted hover:bg-raised hover:text-ink'}`}
      >
        {GLYPHS.more}
      </button>

      {open && (
        <ul className="absolute right-0 top-8 w-36 rounded-card border border-line bg-surface py-1 shadow-lifted">
          {acts.map(act => (
            <li key={act.id}>
              <button
                type="button"
                // Where else it can be reached, said on hover rather than drawn.
                // A glyph at each end of two words,
                // is two glyphs to read past to reach them.
                title={act.key === undefined ? act.label : `${act.label}  ${act.key}`}
                onClick={(event) => {
                  event.stopPropagation()
                  setOpen(false)
                  act.onUse()
                }}
                className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left font-ui text-prose-sm transition-colors ${act.removes === true
                  ? 'text-claim hover:bg-claim/5'
                  : 'text-ink-muted hover:bg-raised hover:text-ink'}`}
              >
                <span className="shrink-0">{act.icon}</span>
                {act.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
