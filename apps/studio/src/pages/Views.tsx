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
  const page = useMemo(() => {
    const body = pageOf(written)
    return body === undefined ? undefined : `<!doctype html><meta charset="utf-8">${STYLE}<body>${body}</body>`
  }, [written])

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

/**
 * How a written page is set, given to the frame rather than inherited.
 * A sandboxed frame is its own document and shares no stylesheet with this one,
 * so a page arriving with no style of its own is set here or set by nobody.
 */
const STYLE = `<style>
  :root { color-scheme: light }
  body {
    margin: 0 auto; padding: 3rem 2.5rem; max-width: 46rem;
    font: 15px/1.65 ui-serif, Georgia, serif; color: #1c1917; background: #fff;
  }
  h1, h2, h3, h4 { font-family: ui-sans-serif, system-ui, sans-serif; line-height: 1.25; }
  h1 { font-size: 1.6rem; margin: 0 0 1.5rem }
  h2 { font-size: 1.2rem; margin: 2.2rem 0 .6rem }
  h3, h4 { font-size: 1rem; margin: 1.6rem 0 .4rem }
  blockquote { margin: 1rem 0; padding-left: 1rem; border-left: 2px solid #e7e3dd; color: #57534e }
  table { border-collapse: collapse; width: 100%; font-size: .9em; margin: 1rem 0 }
  th, td { border: 1px solid #e7e3dd; padding: .4rem .6rem; text-align: left }
  code { font: .9em ui-monospace, monospace; background: #f5f3f0; padding: .1em .3em; border-radius: 3px }
  hr { border: 0; border-top: 1px solid #e7e3dd; margin: 2rem 0 }
  a { color: #1c1917 }
</style>`
