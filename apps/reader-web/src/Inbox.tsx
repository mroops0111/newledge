import { useCallback, useEffect, useState } from 'react'
import type { InboxClient } from './client.js'
import type { ProposalCard } from './proposal.js'
import { toCard } from './proposal.js'
import { Card } from './Card.js'

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

  if (loading)
    return <p className="p-8 text-slate-500">Opening your inbox</p>

  return (
    <main className="mx-auto max-w-3xl p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Reading inbox</h1>
        <p className="mt-1 text-slate-600">
          {cards.length === 0
            ? 'Nothing waiting. Your graph holds only what you have absorbed.'
            : `${cards.length} ${cards.length === 1 ? 'reading' : 'readings'} waiting. Absorb one to let it into your graph.`}
        </p>
      </header>

      {error !== undefined && (
        <p className="mb-6 rounded border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>
      )}

      <div className="space-y-6">
        {cards.map(card => (
          <Card
            key={card.id}
            card={card}
            onAbsorb={() => act(client.absorb(card.id))}
            onDiscard={() => act(client.discard(card.id, 'Not worth keeping'))}
          />
        ))}
      </div>
    </main>
  )
}
