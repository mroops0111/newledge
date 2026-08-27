/**
 * How a machine's own strings are set for someone to read.
 * A type id and a URL are both written for a program first,
 * so what a reader sees of either is decided here rather than at each place
 * one of them happens to be drawn.
 */

/**
 * A type's name set as words rather than as the identifier it is written as.
 *
 * A name here is read rather than typed,
 * and `relatesTo` read in capitals is one word nobody can see the seam in.
 * The capital that marked the seam goes with it,
 * since it was there to be seen in code and says nothing in a sentence,
 * and a caller wanting these in capitals sets them in capitals itself.
 * A name that begins with one keeps it, because that one is not a seam.
 */
export function worded(id: string): string {
  return id.replace(/(?<=[a-z])([A-Z])/g, (_, seam: string) => ` ${seam.toLowerCase()}`)
}

/**
 * Where a link points, which is the only part of a URL worth drawing.
 * What a reader wants off a source is who published it,
 * and the rest of a URL is machinery they did not ask to see.
 * Anything that will not parse is handed back as it stands,
 * since a string that cannot be read as a URL is all there is to show.
 */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  }
  catch {
    return url
  }
}
