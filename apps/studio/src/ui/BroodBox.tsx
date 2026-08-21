export interface BroodBoxData {
  readonly width: number
  readonly height: number
  readonly colour: string
  [key: string]: unknown
}

/**
 * A bracket round what a card contains.
 * A part sits inside the whole rather than being a kind of it, so containment
 * is drawn as enclosure. That is what tells it apart from a family tree at a
 * glance, without a reader having to compare two arrow heads.
 */
export function BroodBox({ data }: { data: BroodBoxData }): React.JSX.Element {
  return (
    <div
      className="rounded-card border-2 border-dashed bg-transparent"
      style={{ width: data.width, height: data.height, borderColor: data.colour }}
    />
  )
}
