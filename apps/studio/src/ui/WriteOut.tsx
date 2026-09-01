import { useEffect, useRef, useState } from 'react'
import type { Ask, Form, ViewClient } from '../lib/views.js'
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
 * Every form is written out of a board, so this stands on one,
 * and a reader is offered all of them rather than a subset that fits.
 *
 * A form is picked before it is asked about,
 * because what an exam asks and what a presentation asks have nothing in common,
 * and offering both at once asks a reader to ignore half of it.
 *
 * Writing takes a minute or so,
 * which is long enough that a reader will look away,
 * so finishing has to be said rather than merely happening.
 */
export function WriteOut({ client, boardId, onWritten }: {
  client: ViewClient
  /** The board a form is written out of. */
  boardId: string
  /** Take the reader to what was written, once there is something to read. */
  onWritten: () => void
}): React.JSX.Element {
  const [doing, setDoing] = useState<Doing>({ at: 'idle' })
  const [picked, setPicked] = useState<Form | undefined>(undefined)
  const [asked, setAsked] = useState<Record<string, string>>({})

  useEffect(() => {
    setDoing({ at: 'idle' })
    setPicked(undefined)
  }, [boardId])

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

  function begin(form: Form): void {
    setPicked(undefined)
    setDoing({ at: 'writing', form })
    void client.write(form, boardId, asked)
      .then(runId => setDoing({ at: 'writing', runId, form }))
      .catch((cause: unknown) => setDoing({
        at: 'failed',
        why: cause instanceof Error ? cause.message : String(cause),
      }))
  }

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
        <Panel
          picked={picked}
          asked={asked}
          onPick={(form) => {
            setPicked(form)
            setAsked(Object.fromEntries(form.asks.map(ask => [ask.id, ask.fallback])))
          }}
          onAnswer={(ask, choice) => setAsked(was => ({ ...was, [ask]: choice }))}
          onWrite={begin}
        />
      )
    default: {
      const exhaustive: never = doing
      throw new Error(`Unhandled state: ${JSON.stringify(exhaustive)}`)
    }
  }
}

/**
 * The forms a reader may write out, and what the one they picked asks.
 *
 * It opens rather than sitting in the header,
 * because four forms carrying their own questions is more than a toolbar holds,
 * and a reader arranging a board is not choosing a form at the same time.
 */
function Panel({ picked, asked, onPick, onAnswer, onWrite }: {
  picked: Form | undefined
  asked: Readonly<Record<string, string>>
  onPick: (form: Form) => void
  onAnswer: (ask: string, choice: string) => void
  onWrite: (form: Form) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const held = useRef<HTMLDivElement>(null)

  // Clicking away is how a reader closes something they opened by mistake,
  // and is the only way out that does not need a control of its own.
  useEffect(() => {
    if (!open)
      return
    function away(event: MouseEvent): void {
      if (!held.current?.contains(event.target as Node))
        setOpen(false)
    }
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [open])

  return (
    <div ref={held} className="relative">
      {/*
        Named for what a reader leaves with rather than for the act.
        Write out said what the machinery does, and a reader pressing this
        wants one of the four things under it, which are the handouts.
      */}
      <button type="button" onClick={() => setOpen(one => !one)} className={ACTION} aria-expanded={open}>
        New handout
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-1 w-80 rounded-card border border-line bg-surface py-2 shadow-lifted">
          <ul>
            {FORMS.map(form => (
              <li key={form.id}>
                <Offered
                  form={form}
                  picked={picked?.id === form.id}
                  asked={asked}
                  onPick={() => onPick(form)}
                  onAnswer={onAnswer}
                  onWrite={() => { setOpen(false); onWrite(form) }}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/**
 * One form a reader may pick, and what it asks once they have.
 *
 * What it asks is shown under it rather than beside it,
 * because what an exam asks and what a presentation asks share nothing,
 * and a reader who has picked one is not choosing for the other.
 */
function Offered({ form, picked, asked, onPick, onAnswer, onWrite }: {
  form: Form
  picked: boolean
  asked: Readonly<Record<string, string>>
  onPick: () => void
  onAnswer: (ask: string, choice: string) => void
  onWrite: () => void
}): React.JSX.Element {
  return (
    <>
      <button
        type="button"
        onClick={onPick}
        aria-pressed={picked}
        className={`w-full px-3 py-2 text-left transition-colors ${picked ? 'bg-raised' : 'hover:bg-raised'}`}
      >
        <span className="block font-ui text-prose-sm font-semibold text-ink">{form.label}</span>
        <span className="block font-reading text-prose-sm text-ink-subtle">{form.purpose}</span>
      </button>

      {picked && (
        <div className="border-t border-line px-3 pb-1 pt-2">
          {form.asks.map(ask => (
            <Asked
              key={ask.id}
              ask={ask}
              answered={asked[ask.id]}
              onAnswer={choice => onAnswer(ask.id, choice)}
            />
          ))}
          <button
            type="button"
            onClick={onWrite}
            className="mb-1 mt-1 w-full rounded-control bg-ink px-2 py-1.5 font-ui text-label text-canvas transition-opacity hover:opacity-85"
          >
            {`Write the ${form.label.toLowerCase()}`}
          </button>
        </div>
      )}
    </>
  )
}

/** One thing a form asks, and the answers a reader may give it. */
function Asked({ ask, answered, onAnswer }: {
  ask: Ask
  answered: string | undefined
  onAnswer: (choice: string) => void
}): React.JSX.Element {
  return (
    <div className="mb-2">
      <p className="font-ui text-label uppercase tracking-wide text-ink-subtle">{ask.label}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {ask.choices.map(choice => (
          <button
            key={choice.id}
            type="button"
            // What picking it gets them, since a word alone does not say.
            title={choice.why}
            onClick={() => onAnswer(choice.id)}
            aria-pressed={answered === choice.id}
            className={`rounded-full border px-2 py-0.5 font-ui text-label transition-colors ${answered === choice.id
              ? 'border-ink bg-ink text-canvas'
              : 'border-line-strong text-ink-muted hover:bg-raised'}`}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </div>
  )
}

const ACTION = 'rounded-control px-2.5 py-1 font-ui text-label text-ink-subtle transition-colors hover:bg-raised hover:text-ink'

function Said({ children }: { children: string }): React.JSX.Element {
  return <span className="px-2.5 py-1 font-ui text-label text-ink-subtle">{children}</span>
}
