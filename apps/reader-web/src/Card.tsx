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

function NodeList({ label, nodes }: { label: string, nodes: readonly GraphNodePayload[] }): React.JSX.Element | null {
  if (nodes.length === 0)
    return null
  return (
    <section className="mt-7">
      <GroupLabel>{label}</GroupLabel>
      <ul className="mt-4 space-y-5">
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
  const [showReasoning, setShowReasoning] = useState(false)
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

  const source = card.sources[0]

  return (
    <Surface>
      <header className="border-b border-line pb-5">
        <h2 className="font-ui text-base font-semibold leading-snug text-ink">
          {source?.name ?? 'Untitled reading'}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 font-ui text-xs text-ink-subtle">
          {card.citations.map(url => (
            <SourceLink key={url} href={url}>{hostOf(url)}</SourceLink>
          ))}
          <span>
            {card.concepts.length} concepts, {card.claims.length} claims, {card.edges.length} links
          </span>
        </div>
      </header>

      <NodeList label="Concepts" nodes={card.concepts} />
      <NodeList label="Claims" nodes={card.claims} />
      <NodeList label="Topics" nodes={card.topics} />

      <div className="mt-8 border-t border-line pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button tone="primary" disabled={busy} onClick={run(onAbsorb)}>Absorb into my graph</Button>
          <Button tone="quiet" disabled={busy} onClick={run(onDiscard)}>Discard</Button>
          <button
            type="button"
            onClick={() => setShowReasoning(!showReasoning)}
            className="ml-auto font-ui text-xs text-ink-subtle underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink-muted"
          >
            {showReasoning ? 'Hide how this was read' : 'How this was read'}
          </button>
        </div>

        {showReasoning && (
          <p className="mt-4 font-reading text-prose-sm text-ink-subtle">{card.rationale}</p>
        )}
      </div>
    </Surface>
  )
}
