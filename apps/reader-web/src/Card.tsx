import { useState } from 'react'
import type { GraphNodePayload, ProposalCard } from './proposal.js'

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
    <section className="mt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</h3>
      <ul className="mt-2 space-y-2">
        {nodes.map(node => (
          <li key={node.id} className="rounded border border-slate-200 p-3">
            <p className="font-medium text-slate-900">{node.name ?? node.id}</p>
            {node.description !== undefined && (
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{node.description}</p>
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
    <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-slate-800">{card.rationale}</p>

      <p className="mt-3 text-sm text-slate-500">
        {card.concepts.length} concepts, {card.claims.length} claims, {card.edges.length} links
      </p>

      {card.citations.length > 0 && (
        <p className="mt-2 flex flex-wrap gap-2 text-sm">
          {card.citations.map(url => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-blue-700 underline underline-offset-2"
            >
              {hostOf(url)}
            </a>
          ))}
        </p>
      )}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mt-4 text-sm font-medium text-slate-700 underline underline-offset-2"
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

      <footer className="mt-6 flex gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={run(onAbsorb)}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Absorb into my graph
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={run(onDiscard)}
          className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
        >
          Discard
        </button>
      </footer>
    </article>
  )
}
