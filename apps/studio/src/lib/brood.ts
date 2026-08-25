/**
 * A whole and its parts, laid out as one block wherever the board puts them.
 * The id is the whole's own with a mark on it,
 * so a block can be told from a section at a glance,
 * and the whole can be read back out of it.
 */
const BROOD = 'brood-'

/** The id a card's parts are kept together under. */
export function broodOf(nodeId: string): string {
  return `${BROOD}${nodeId}`
}

/** Whether a group holds a whole and its parts rather than a topic's cards. */
export function isBrood(groupId: string): boolean {
  return groupId.startsWith(BROOD)
}

/** The whole a block was built around. */
export function rootOf(broodId: string): string {
  return broodId.slice(BROOD.length)
}
