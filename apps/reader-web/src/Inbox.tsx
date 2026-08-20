import { useCallback, useEffect, useState } from 'react'
import { Card } from './Card.js'
import type { InboxClient } from './client.js'
import type { ProposalCard } from './proposal.js'
import { toCard } from './proposal.js'

function Shell({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <main className="mx-auto max-w-reading px-6 py-16">{children}</main>
}

export function Inbox({ client }: { client: InboxClient }): React.JSX.Element {
  const [cards, setCards] = useState<readonly ProposalCard[]>([])
  const [error, setError] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setCards((await client.pending()).map(toCard))
      setError(undefined)
    }
    catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
    finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => { void refresh() }, [refresh])

  const act = async (action: Promise<void>): Promise<void> => {
    await action
    await refresh()
  }

  if (loading) {
    return (
      <Shell>
        <p className="font-ui text-sm text-ink-subtle">Opening your inbox</p>
      </Shell>
    )
  }

  return (
    <Shell>
      <header className="mb-10">
        <h1 className="font-ui text-xl font-semibold tracking-tight text-ink">Reading inbox</h1>
        <p className="mt-2 font-reading text-prose-sm text-ink-muted">
          {cards.length === 0
            ? 'Nothing waiting. Your graph holds only what you have absorbed.'
            : `${cards.length} ${cards.length === 1 ? 'reading' : 'readings'} waiting. Absorb one to let it into your graph.`}
        </p>
      </header>

      {error !== undefined && (
        <p className="mb-8 rounded-card border border-claim/20 bg-claim/5 px-4 py-3 font-ui text-sm text-claim">
          {error}
        </p>
      )}

      <div className="space-y-5">
        {cards.map(card => (
          <Card
            key={card.id}
            card={card}
            onAbsorb={() => act(client.absorb(card.id))}
            onDiscard={() => act(client.discard(card.id, 'Not worth keeping'))}
          />
        ))}
      </div>
    </Shell>
  )
}
