/** A board as the list needs it, which is a name and something to open. */
export interface Listed {
  readonly id: string
  readonly name: string
}

/**
 * Every board a reader has, under the surface they all belong to.
 * A board is a thought a reader is holding rather than a document they opened,
 * so the ones they are not looking at stay in view beside the one they are,
 * and moving between them costs a glance rather than a trip somewhere else.
 */
export function BoardList({ boards, openId, onOpen, onAdd }: {
  boards: readonly Listed[]
  openId: string | undefined
  onOpen: (boardId: string) => void
  onAdd: () => void
}): React.JSX.Element {
  return (
    <ul className="mt-1 space-y-px border-l border-line pl-3">
      {boards.map(board => (
        <li key={board.id}>
          <Entry onClick={() => onOpen(board.id)} open={board.id === openId}>
            {board.name}
          </Entry>
        </li>
      ))}
      <li>
        <Entry onClick={onAdd} open={false}>+ New board</Entry>
      </li>
    </ul>
  )
}

/**
 * One row of the list, whether it opens a board or makes one.
 * Making a board is another way of arriving at one,
 * so it is worn the same as the boards it sits under rather than as a control.
 */
function Entry({ children, onClick, open }: {
  children: React.ReactNode
  onClick: () => void
  open: boolean
}): React.JSX.Element {
  const worn = open
    ? 'bg-raised font-semibold text-ink'
    : 'text-ink-subtle hover:bg-raised/60 hover:text-ink-muted'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full truncate rounded-control px-2.5 py-1.5 text-left font-ui text-label transition-colors ${worn}`}
    >
      {children}
    </button>
  )
}
