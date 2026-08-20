import { useState } from 'react'
import type { GraphNodePayload, ProposalCard } from './proposal.js'
import { Button } from './ui/Button.js'
import { GroupLabel, SourceLink, Surface } from './ui/Card.js'

const TYPE_ACCENTS: Record<string, string> = {
  Concepts: 'border-l-concept',
  Claims: 'border-l-claim',
  Topics: 'border-l-topic',
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  }
  catch {
    return url
  }
}

function Tally({ colour, count, label }: { colour: string, count: number, label: string }): React.JSX.Element {
  return (
    <li className="flex items-baseline gap-2">
      <span className={`size-1.5 shrink-0 rounded-full ${colour}`} />
      <span className="font-ui text-xs text-ink-muted">
        <span className="tabular-nums text-ink">{count}</span> {label}
      </span>
    </li>
  )
}

function NodeList({ label, nodes }: { label: string, nodes: readonly GraphNodePayload[] }): React.JSX.Element | null {
  if (nodes.length === 0)
    return null
  return (
    <section className="mt-6">
      <GroupLabel>{label}</GroupLabel>
      <ul className="mt-3 space-y-3">
        {nodes.map(node => (
          <li key={node.id} className={`border-l-2 pl-4 ${TYPE_ACCENTS[label] ?? 'border-l-line-strong'}`}>
            <p className="font-ui text-sm font-semibold text-ink">{node.name ?? node.id}</p>
            {node.description !== undefined && (
              <p className="mt-1 font-reading text-prose-sm text-ink-muted">{node.description}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

export function Card({ card, onAbsorb, onDiscard }: {
  card: ProposalCard
  onAbsorb: () => Promise<void>
  onDiscard: () => Promise<void>
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const run = (action: () => Promise<void>) => async (): Promise<void> => {
    setBusy(true)
    try {
      await action()
    }
    finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-start gap-6">
      <div className="min-w-0 flex-1">
        <Surface>
          <p className="font-reading text-prose text-ink">{card.rationale}</p>

          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="mt-5 font-ui text-sm font-medium text-ink-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink"
          >
            {open ? 'Hide what it holds' : 'Read what it holds'}
          </button>

          {open && (
            <div>
              <NodeList label="Concepts" nodes={card.concepts} />
              <NodeList label="Claims" nodes={card.claims} />
              <NodeList label="Topics" nodes={card.topics} />
            </div>
          )}

          <footer className="mt-7 flex gap-2 border-t border-line pt-5">
            <Button tone="primary" disabled={busy} onClick={run(onAbsorb)}>Absorb into my graph</Button>
            <Button tone="quiet" disabled={busy} onClick={run(onDiscard)}>Discard</Button>
          </footer>
        </Surface>
      </div>

      {/* What the reading is made of, kept beside the prose so the column
          it sits in stays one uninterrupted measure. */}
      <aside className="hidden w-rail shrink-0 pt-7 lg:block">
        <GroupLabel>Holds</GroupLabel>
        <ul className="mt-3 space-y-1.5">
          <Tally colour="bg-concept" count={card.concepts.length} label="concepts" />
          <Tally colour="bg-claim" count={card.claims.length} label="claims" />
          <Tally colour="bg-topic" count={card.topics.length} label="topics" />
          <Tally colour="bg-line-strong" count={card.edges.length} label="links" />
        </ul>

        {card.citations.length > 0 && (
          <>
            <div className="mt-6">
              <GroupLabel>Traces to</GroupLabel>
            </div>
            <ul className="mt-3 space-y-1.5">
              {card.citations.map(url => (
                <li key={url}>
                  <SourceLink href={url}>{hostOf(url)}</SourceLink>
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>
    </div>
  )
}
