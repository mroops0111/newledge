import { nodeStyle } from './boardStyle.js'
import type { NodeForm } from './boardStyle.js'
import type { GraphNode } from './graph.js'

const LINE = 18
const TITLE_ROW = 34
const PADDING = 20
const DEFINITION_LINES = 3
const CLAIM_LINES = { least: 2, most: 8 }
// A card 240 wide with 12px of padding either side fits about this many
// characters of reading text per line, which is close enough to lay out with.
const PER_LINE = 34

/**
 * How tall a card will be before it has been drawn.
 * A layout has to know a size to place anything, and the real one is only
 * known once the browser has laid the text out, so this is the estimate the
 * arrangement is built from. A reader moving a card afterwards uses the real
 * one, since by then the card is on screen.
 */
export function cardExtent(node: GraphNode): { width: number, height: number } {
  const style = nodeStyle(node.type)
  return { width: style.width, height: heightOf(node, style.form) }
}

function heightOf(node: GraphNode, form: NodeForm): number {
  switch (form) {
    // The title carries the identity, so the definition under it is clamped
    // and a long one costs no more room than a short one.
    case 'concept': {
      const lines = node.description === undefined ? 0 : Math.min(linesFor(node.description), DEFINITION_LINES)
      return TITLE_ROW + lines * LINE + (lines === 0 ? 0 : PADDING)
    }
    // A claim is the sentence, so clipping it destroys the thing itself,
    // and the card is as tall as saying it takes.
    case 'claim': {
      const lines = Math.min(Math.max(linesFor(node.name), CLAIM_LINES.least), CLAIM_LINES.most)
      return PADDING + lines * LINE
    }
    case 'source':
      return TITLE_ROW + LINE * 2
    case 'topic':
      return TITLE_ROW
    default: {
      const exhaustive: never = form
      throw new Error(`Unhandled node form: ${JSON.stringify(exhaustive)}`)
    }
  }
}

function linesFor(text: string): number {
  return Math.max(1, Math.ceil(text.length / PER_LINE))
}
