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
    <span className="flex items-center gap-1.5 font-ui text-xs text-ink-muted">
      <span className={`size-1.5 rounded-full ${colour}`} />
      <span className="tabular-nums text-ink">{count}</span>
      {label}
    </span>
  )
}

function NodeList({ label, nodes }: { label: string, nodes: readonly GraphNodePayload[] }): React.JSX.Element | null {
  if (nodes.length === 0)
    return null
  return (
    <section className="mt-7">
      <GroupLabel>{label}</GroupLabel>
      <ul className="mt-4 space-y-4">
        {nodes.map(node => (
          <li key={node.id} className={`border-l-2 pl-5 ${TYPE_ACCENTS[label] ?? 'border-l-line-strong'}`}>
            <p className="font-ui text-sm font-semibold text-ink">{node.name ?? node.id}</p>
            {node.description !== undefined && (
              <p className="mt-1.5 font-reading text-prose-sm text-ink-muted">{node.description}</p>
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
    <Surface>
      <p className="font-reading text-prose text-ink">{card.rationale}</p>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
        <Tally colour="bg-concept" count={card.concepts.length} label="concepts" />
        <Tally colour="bg-claim" count={card.claims.length} label="claims" />
        <Tally colour="bg-topic" count={card.topics.length} label="topics" />
        <Tally colour="bg-line-strong" count={card.edges.length} label="links" />
        <span className="ml-auto flex flex-wrap gap-1.5">
          {card.citations.map(url => (
            <SourceLink key={url} href={url}>{hostOf(url)}</SourceLink>
          ))}
        </span>
      </div>

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

      <footer className="mt-8 flex gap-2 border-t border-line pt-6">
        <Button tone="primary" disabled={busy} onClick={run(onAbsorb)}>Absorb into my graph</Button>
        <Button tone="quiet" disabled={busy} onClick={run(onDiscard)}>Discard</Button>
      </footer>
    </Surface>
  )
}
