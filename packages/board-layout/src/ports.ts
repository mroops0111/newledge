export interface Point {
  readonly x: number
  readonly y: number
}

export interface Extent {
  readonly width: number
  readonly height: number
}

export type Box = Point & Extent

/** A card as a layout sees it, which is a size, a kind, and where it is filed. */
export interface LayoutNode extends Extent {
  readonly id: string
  readonly type: string
  readonly groupId?: string
  /**
   * Whether the relations inside this group settle the order of its members.
   * A group holding a whole and its parts is a hierarchy however few it holds,
   * and has to be laid out as one, or the parts come back above the whole and
   * a reader has to work out which way round it goes from the arrow heads.
   */
  readonly ranked?: boolean
}

export interface LayoutEdge {
  readonly id: string
  readonly type: string
  readonly from: string
  readonly to: string
}

/** A section, which is drawn from what it holds rather than given a size. */
export interface LayoutGroup {
  readonly id: string
  /** Room at the top of a group that its contents must not be placed in. */
  readonly inset?: Extent
  /**
   * The group this one sits inside.
   * A group within a group is how part-of is kept true, since a layout that is
   * only told which cards are parts is free to scatter them.
   */
  readonly groupId?: string
  /**
   * Whether the relations inside this group settle the order of its members.
   * A group holding a whole and its parts is a hierarchy however few it holds,
   * and has to be laid out as one, or the parts come back above the whole and
   * a reader has to work out which way round it goes from the arrow heads.
   */
  readonly ranked?: boolean
}

export interface PlacementRequest {
  readonly nodes: readonly LayoutNode[]
  readonly edges: readonly LayoutEdge[]
  readonly groups: readonly LayoutGroup[]
}

export interface Placed {
  readonly nodes: ReadonlyMap<string, Point>
  readonly groups: ReadonlyMap<string, Box>
  /**
   * Some placements work out the lines while they work out the positions,
   * and throwing that away only to ask a router for it again would be waste.
   */
  readonly edges?: ReadonlyMap<string, readonly Point[]>
}

/**
 * Where things go on a board.
 * A reader owns where their cards are, so this runs once to open a board and
 * then only when a reader asks for it again, never behind their back.
 */
export interface Placement {
  readonly id: string
  readonly place: (request: PlacementRequest) => Promise<Placed>
}

/** Something a line has to reckon with, either by ending on it or by avoiding it. */
export interface Obstacle extends Box {
  readonly id: string
  /**
   * Whether a line may run over this rather than round it.
   * A group is ground, drawn under everything, so a line crossing one is in no
   * danger of being hidden by it and gains nothing by going round. Told to
   * avoid one, a line on a board whose groups fill it finds no way through at
   * all and falls back to running straight over everything.
   */
  readonly ground?: boolean
}

export interface RoutingRequest {
  /** Everything a line has to get around, and everything it can end on. */
  readonly obstacles: readonly Obstacle[]
  readonly edges: readonly LayoutEdge[]
  /**
   * Places on a card that lines drawn some other way already end at.
   * A board may draw some of its relations itself, and those ends are as taken
   * as any the router placed. Left unsaid, a routed line lands on one of them
   * and the two run along together as one.
   */
  readonly spoken?: readonly Point[]
}

/** Where each line bends, from the edge of one card to the edge of another. */
export interface Routed {
  readonly edges: ReadonlyMap<string, readonly Point[]>
}

/**
 * How lines get from one card to another without crossing a third.
 * This runs every time a reader moves something, which is why it is separate
 * from placement, a gesture must not relay out the board around it.
 */
export interface Routing {
  readonly id: string
  readonly route: (request: RoutingRequest) => Promise<Routed>
}
