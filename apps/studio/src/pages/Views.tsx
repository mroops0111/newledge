import { useEffect, useMemo, useState } from 'react'
import type { Listed, ViewClient, Written } from '../lib/views.js'
import { formOf, pageOf, titleOf } from '../lib/views.js'
import type { Nav } from '../ui/AppShell.js'
import { AppShell } from '../ui/AppShell.js'
import { GroupLabel } from '../ui/Surface.js'

/**
 * Everything a generator has written out of this graph.
 *
 * A view is derived rather than authored,
 * so there is nothing to edit here and no arrangement to keep.
 * What a reader does is pick one and read it,
 * which is why the whole surface is a list beside a page.
 */
export function Views({ client, nav }: { client: ViewClient, nav: Nav }): React.JSX.Element {
  const [listed, setListed] = useState<readonly Listed[] | undefined>(undefined)
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
  }, [client])

  useEffect(() => {
    if (openPath === undefined)
      return
    setOpen(undefined)
    setUnreadable(undefined)
    void client.read(openPath)
      .then(setOpen)
      .catch((cause: unknown) => setUnreadable(said(cause)))
  }, [client, openPath])

  if (lost !== undefined)
    return <AppShell {...nav}><p className="p-10 font-ui text-sm text-claim">{lost}</p></AppShell>

  return (
    <AppShell {...nav}>
      <div className="flex h-screen">
        <aside className="w-72 shrink-0 overflow-y-auto border-r border-line bg-surface py-5">
          <div className="px-4"><GroupLabel>Written out</GroupLabel></div>
          {listed?.length === 0 && (
            <p className="mt-3 px-4 font-reading text-prose-sm text-ink-subtle">
              Nothing has been written out of this graph yet.
            </p>
          )}
          <ul className="mt-2">
            {(listed ?? []).map(one => (
              <li key={one.path}>
                <Row one={one} on={one.path === openPath} onOpen={() => setOpenPath(one.path)} />
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

function Row({ one, on, onOpen }: { one: Listed, on: boolean, onOpen: () => void }): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-pressed={on}
      className={`flex w-full flex-col items-start gap-0.5 px-4 py-2 text-left transition-colors ${on
        ? 'bg-raised'
        : 'hover:bg-raised'}`}
    >
      <span className={`truncate font-ui text-prose-sm ${on ? 'text-ink' : 'text-ink-muted'}`}>
        {titleOf(one.path)}
      </span>
      <span className="font-ui text-label uppercase tracking-wide text-ink-subtle">
        {formOf(one.path)}
      </span>
    </button>
  )
}

/**
 * What a generator wrote, drawn inside a frame of its own.
 *
 * Everything is drawn as a page, and markdown becomes one on the way in,
 * so there is one way this surface renders and one place it is made safe.
 *
 * A view is written by an agent, so it is not this application's own markup,
 * and is never treated as such.
 * It goes into a sandboxed frame with nothing granted,
 * which is what stops a document from reaching the session that opened it.
 */
function Page({ written }: { written: Written }): React.JSX.Element {
  const page = useMemo(() => pageOf(written), [written])

  if (page === undefined) {
    return (
      <pre className="h-full overflow-auto p-8 font-mono text-prose-sm text-ink-muted">
        {written.text}
      </pre>
    )
  }

  return (
    <iframe
      key={written.path}
      title={titleOf(written.path)}
      srcDoc={page}
      sandbox=""
      className="h-full w-full border-0 bg-surface"
    />
  )
}
