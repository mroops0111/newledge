import { useEffect, useState } from 'react'
import type { Form, ViewClient } from '../lib/views.js'
import { FORMS } from '../lib/views.js'

/** How often a run is asked whether it is over, while one is going. */
const ASK_EVERY = 3000

/**
 * Writing begins when a reader asks, not when the runtime agrees.
 * Starting a generator takes a second or two to be accepted,
 * and a control that says nothing for that long has been pressed twice.
 * So the run is carried once there is one, and is absent until then.
 */
type Doing =
  | { readonly at: 'idle' }
  | { readonly at: 'writing', readonly runId?: string, readonly form: Form }
  | { readonly at: 'written', readonly form: Form }
  | { readonly at: 'failed', readonly why: string }

/**
 * Set a generator going over whatever is selected, and say when it is done.
 *
 * The forms a reader is offered are the ones taking the kind they have picked,
 * so a control appears where its input is, rather than everywhere and refusing.
 * A form whose input is a board does not belong on a survey.
 *
 * Writing takes a minute or so,
 * which is long enough that a reader will look away,
 * so finishing has to be said rather than merely happening.
 */
export function WriteOut({ client, about, kind, onWritten }: {
  client: ViewClient
  /** What is selected, which is what a generator would be given. */
  about: string | undefined
  /** What kind that is, which decides what can be written from it. */
  kind: string | undefined
  /** Take the reader to what was written, once there is something to read. */
  onWritten: () => void
}): React.JSX.Element | null {
  const [doing, setDoing] = useState<Doing>({ at: 'idle' })
  const offered = FORMS.filter(form => form.about === kind)

  useEffect(() => {
    setDoing({ at: 'idle' })
  }, [about])

  useEffect(() => {
    if (doing.at !== 'writing' || doing.runId === undefined)
      return
    const runId = doing.runId
    const timer = setInterval(() => {
      void client.finished(runId).then((over) => {
        if (over)
          setDoing({ at: 'written', form: doing.form })
      })
    }, ASK_EVERY)
    return () => clearInterval(timer)
  }, [client, doing])

  if (about === undefined || offered.length === 0)
    return null

  switch (doing.at) {
    case 'writing':
      return <Said>{`Writing the ${doing.form.label.toLowerCase()}`}</Said>
    case 'failed':
      return <Said>{doing.why}</Said>
    case 'written':
      return (
        <button type="button" onClick={onWritten} className={ACTION}>
          {`Read the ${doing.form.label.toLowerCase()}`}
        </button>
      )
    case 'idle':
      return (
        <>
          {offered.map(form => (
            <button
              key={form.id}
              type="button"
              title={form.purpose}
              className={ACTION}
              onClick={() => {
                setDoing({ at: 'writing', form })
                void client.write(form, about)
                  .then(runId => setDoing({ at: 'writing', runId, form }))
                  .catch((cause: unknown) => setDoing({
                    at: 'failed',
                    why: cause instanceof Error ? cause.message : String(cause),
                  }))
              }}
            >
              {`Write the ${form.label.toLowerCase()}`}
            </button>
          ))}
        </>
      )
    default: {
      const exhaustive: never = doing
      throw new Error(`Unhandled state: ${JSON.stringify(exhaustive)}`)
    }
  }
}

const ACTION = 'rounded-control px-2.5 py-1 font-ui text-label text-ink-subtle transition-colors hover:bg-raised hover:text-ink'

function Said({ children }: { children: string }): React.JSX.Element {
  return <span className="px-2.5 py-1 font-ui text-label text-ink-subtle">{children}</span>
}
