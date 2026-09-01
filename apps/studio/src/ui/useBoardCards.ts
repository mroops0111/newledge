import type { Board } from '@newledge/board'
import type { RefObject } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { withoutCard } from '../lib/boards.js'
import type { CardAct } from './CardMenu.js'
import { GLYPHS } from './Toolkit.js'

export interface BoardCards {
  /** Whether the panel a reader puts things on from is open. */
  readonly putting: boolean
  /**
   * Open or close it.
   * Adding a board opens it, picking a card closes it,
   * and the rail toggles it,
   * so what is offered is the state rather than one gesture over it.
   */
  readonly setPutting: (open: boolean) => void
  /** What a reader may do to one card, offered on that card. */
  readonly actsOn: (nodeId: string) => readonly CardAct[]
}

/**
 * What a board holds, and what a reader does to one card of it.
 *
 * Held apart from the board surface.
 * How a board is arranged and how it is drawn are different questions,
 * and putting a node on, taking one off, and what a card offers,
 * are all about which part of the graph this reading is of.
 * None of them need to know where anything sits.
 *
 * The board is read through a ref rather than taken as a value.
 * A card is taken off in a handler that outlives the render it was built in,
 * and the board it should act on is the one there by then.
 */
export function useBoardCards({ latestBoard, picked, focused, persist, onFocus }: {
  latestBoard: RefObject<Board | undefined>
  /** The card a reader has picked, which is the one a key acts on. */
  picked: string | undefined
  focused: boolean
  persist: (board: Board) => void
  onFocus: (focused: boolean) => void
}): BoardCards {
  const [putting, setPutting] = useState(false)

  /**
   * Take one card off this board.
   * The node stays in the graph and on every other board,
   * so this narrows one reading rather than losing anything.
   */
  const takeOff = useCallback((nodeId: string) => {
    const current = latestBoard.current
    if (current === undefined)
      return
    persist(withoutCard(current, nodeId))
    onFocus(false)
  }, [latestBoard, persist, onFocus])

  const actsOn = useCallback((nodeId: string): readonly CardAct[] => [
    {
      id: 'focus',
      // What it will do rather than what it is.
      // A reader opens a menu to find the thing they want done,
      // and not to be told which way round they already are.
      label: focused ? 'Show all' : 'Focus',
      icon: GLYPHS.focus,
      onUse: () => onFocus(!focused),
    },
    {
      id: 'takeOff',
      // Remove rather than delete.
      // Delete would say the node is gone, and it is not.
      // It stays in the graph and on every other board,
      // so what a reader removes is this board's claim to be about it.
      label: 'Remove',
      icon: GLYPHS.takeOff,
      removes: true,
      key: '⌫',
      onUse: () => takeOff(nodeId),
    },
  ], [focused, takeOff, onFocus])

  /**
   * Backspace takes the picked card off.
   * It is what a canvas has taught everyone to reach for,
   * and what a menu a reader has to open cannot teach anybody.
   *
   * Not while a reader is typing.
   * A board's name, a section's name, and what is being searched for,
   * are all fields, and a key pressed in one of them belongs to the field,
   * rather than to the board behind it.
   */
  useEffect(() => {
    function pressed(event: KeyboardEvent): void {
      if (event.key !== 'Backspace' && event.key !== 'Delete')
        return
      const at = event.target as HTMLElement | null
      if (at?.tagName === 'INPUT' || at?.tagName === 'TEXTAREA' || at?.isContentEditable === true)
        return
      if (picked === undefined)
        return
      event.preventDefault()
      takeOff(picked)
    }
    document.addEventListener('keydown', pressed)
    return () => document.removeEventListener('keydown', pressed)
  }, [picked, takeOff])

  return { putting, setPutting, actsOn }
}
