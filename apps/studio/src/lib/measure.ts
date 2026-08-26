import { nodeStyle } from './boardStyle.js'
import type { GraphNode } from './graph.js'

/**
 * The height of every card, whatever it holds.
 *
 * A card is put on the grid by its corner,
 * but a card as tall as its words lands the places a line may meet it,
 * between the grid lines, since those sit at a quarter, a half,
 * and three quarters of a side.
 * Two cards standing side by side then offer no pair of places,
 * that a straight run could join, however carefully either is moved,
 * and the line has to bend to cross a few pixels.
 *
 * One height for every card settles that. It divides four ways by the grid,
 * the way the width does, so every place stands on a grid line,
 * and two cards the layout put in line are in line by their places as well.
 *
 * Tall enough for the longest card the ontology can produce,
 * which is a concept with its definition clamped to six lines,
 * and two lineages under it. The room left under a shorter card,
 * is the price of the board reading as though it were ruled.
 */
export const CARD_HEIGHT = 288

/**
 * How big a card is, which is one size for all of them.
 * A layout has to know a size to place anything,
 * and a size that waited on the browser would be known too late,
 * so nothing here reads the words on a card.
 */
export function cardExtent(node: GraphNode): { width: number, height: number } {
  return { width: nodeStyle(node.type).cardWidth, height: CARD_HEIGHT }
}
