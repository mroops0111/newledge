import { useEffect, useMemo, useState } from 'react'
import type { BoardClient } from '../lib/boards.js'
import type { Listed, Made, ViewClient, Written } from '../lib/views.js'
import { madeFrom, pageOf, titleOf } from '../lib/views.js'
import { paletteOf } from '../lib/viewStyle.js'
import type { Nav } from '../ui/AppShell.js'
import { AppShell } from '../ui/AppShell.js'
import { GroupLabel } from '../ui/Surface.js'

/**
 * The handouts a reader has written out of what they understand.
 *
 * A handout is derived rather than authored,
 * so there is nothing to edit here and no arrangement to keep.
 * What a reader does is pick one and read it,
 * which is why the whole surface is a list beside a page.
 *
 * They are gathered under whatever each was written out of,
 * because that is what a reader thinks of one by.
 * A flat list of files makes them read a path,
 * to work out what they are looking at.
 */
export function Views({ client, boards, nav }: {
  client: ViewClient
  /** So a handout of a board is named as the reader named the board. */
  boards: BoardClient
  nav: Nav
}): React.JSX.Element {
  const [listed, setListed] = useState<readonly Listed[] | undefined>(undefined)
  const [named, setNamed] = useState<ReadonlyMap<string, string>>(new Map())
  const [openPath, setOpenPath] = useState<string | undefined>(undefined)
  const [open, setOpen] = useState<Written | undefined>(undefined)
  // Failing to list is the surface failing, since nothing is left to stand on.
  // Failing to read one is that one failing,
  // and it is said where that one would have been drawn,
  // so one unreadable file does not take the list of the rest with it.
  const [lost, setLost] = useState<string | undefined>(undefined)
  const [unreadable, setUnreadable] = useState<string | undefined>(undefined)

  useEffect(() => {
    void client.list()
      .then((items) => {
        setListed(items)
        setOpenPath(items[0]?.path)
      })
      .catch((cause: unknown) => setLost(said(cause)))
    // A board since renamed or dropped falls back to the name the file carries,
    // so this failing is not the surface failing.
    void boards.read()
      .then(state => setNamed(new Map(state.boards.map(one => [one.id, one.name]))))
      .catch(() => undefined)
  }, [client, boards])

  useEffect(() => {
    if (openPath === undefined)
      return
    setOpen(undefined)
    setUnreadable(undefined)
    void client.read(openPath)
      .then(setOpen)
      .catch((cause: unknown) => setUnreadable(said(cause)))
  }, [client, openPath])

  const made = useMemo(
    () => madeFrom(listed ?? [], subject => named.get(subject)),
    [listed, named],
  )

  if (lost !== undefined)
    return <AppShell {...nav}><p className="p-10 font-ui text-sm text-claim">{lost}</p></AppShell>

  return (
    <AppShell {...nav}>
      <div className="flex h-screen">
        <aside className="w-72 shrink-0 overflow-y-auto border-r border-line bg-surface py-5">
          <div className="px-4"><GroupLabel>Handouts</GroupLabel></div>
          {listed?.length === 0 && (
            <p className="mt-3 px-4 font-reading text-prose-sm text-ink-subtle">
              Nothing written out yet. Open a board and write one.
            </p>
          )}
          <ul className="mt-3 space-y-5">
            {made.map(one => (
              <li key={one.name}>
                <Subject made={one} openPath={openPath} onOpen={setOpenPath} />
              </li>
            ))}
          </ul>
        </aside>
        <div className="min-w-0 flex-1 overflow-hidden bg-canvas">
          {unreadable !== undefined
            ? <p className="p-10 font-ui text-sm text-claim">{unreadable}</p>
            : open === undefined
              ? <p className="p-10 font-ui text-sm text-ink-subtle">Reading</p>
              : <Page written={open} />}
        </div>
      </div>
    </AppShell>
  )
}

/** What went wrong, in the words it came with. */
function said(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}

/**
 * One thing a reader made handouts of, and the forms they have of it.
 * The subject leads because it is what a reader is looking for,
 * and the forms sit under it,
 * because which one they want is the second question.
 */
function Subject({ made, openPath, onOpen }: {
  made: Made
  openPath: string | undefined
  onOpen: (path: string) => void
}): React.JSX.Element {
  return (
    <div>
      <p className="truncate px-4 font-ui text-prose-sm font-semibold text-ink">{made.name}</p>
      <ul className="mt-1">
        {made.of.map(one => (
          <li key={one.view.path}>
            <button
              type="button"
              onClick={() => onOpen(one.view.path)}
              aria-pressed={one.view.path === openPath}
              className={`w-full px-4 py-1 text-left font-ui text-prose-sm transition-colors ${one.view.path === openPath
                ? 'bg-raised text-ink'
                : 'text-ink-muted hover:bg-raised'}`}
            >
              {one.form}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * What a generator wrote, drawn inside a frame of its own.
 *
 * Everything a reader reads here is drawn as a page,
 * and markdown becomes one on the way in,
 * so there is one way this surface renders and one place it is made safe.
 *
 * A view is written by an agent, so it is not this application's own markup,
 * and is never treated as such.
 * The frame is granted scripts and nothing else,
 * so the marking and the paging run while the document keeps no origin,
 * no storage, and no way to reach the session that opened it.
 * Everything running in there was written here rather than by a generator,
 * which is a rule the reference states and this surface does not enforce.
 */
function Page({ written }: { written: Written }): React.JSX.Element {
  // Read off this application at the moment the view is drawn,
  // so a written page is set in the colours the surface reading it is set in.
  const page = useMemo(() => pageOf(written, paletteOf(document.documentElement)), [written])

  if (page === undefined)
    return <Source written={written} />

  return (
    <iframe
      key={written.path}
      title={titleOf(written.path)}
      srcDoc={page}
      sandbox="allow-scripts"
      className="h-full w-full border-0 bg-surface"
    />
  )
}

/**
 * A view this surface cannot draw, shown as what it is.
 *
 * A deck is played full screen by its own runtime rather than read in a panel,
 * so there is nothing to render here and the file itself is the honest answer.
 * Where it is said, because a path a reader cannot find is a file they lost.
 */
function Source({ written }: { written: Written }): React.JSX.Element {
  return (
    <div className="flex h-full flex-col">
      <p className="border-b border-line px-8 py-4 font-reading text-prose-sm text-ink-muted">
        Written to
        {' '}
        <code className="font-mono text-ink">{written.path}</code>
        , under this workspace. Point an open-slide workspace at that directory to play it.
      </p>
      <pre className="min-h-0 flex-1 overflow-auto p-8 font-mono text-prose-sm text-ink-muted">
        {written.text}
      </pre>
    </div>
  )
}
