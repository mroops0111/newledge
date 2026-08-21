import { useCallback, useEffect, useState } from 'react'
import { Card } from '../components/ReadingCard.js'
import type { InboxClient } from '../lib/client.js'
import type { ProposalCard } from '../lib/proposal.js'
import { toCard } from '../lib/proposal.js'
import { conceptAnchor } from '../components/ReadingCard.js'
import { AppShell } from '../ui/AppShell.js'
import type { OutlineSection } from '../ui/Outline.js'
import { Outline } from '../ui/Outline.js'

// The outline mirrors the cards, so a theme is where a reader steers from,
// which is the only place topics surface at all.
function outlineOf(cards: readonly ProposalCard[]): readonly OutlineSection[] {
  return cards.flatMap(card => card.groups.map(group => ({
    id: `${card.id}--${group.id}`,
    title: group.title,
    entries: group.readings.map(reading => ({
      anchor: conceptAnchor(card.id, reading.concept.id),
      label: reading.concept.name ?? reading.concept.id,
    })),
  })))
}

function Shell({ count, outline, children }: {
  count?: number
  outline?: readonly OutlineSection[]
  children: React.ReactNode
}): React.JSX.Element {
  const panel = outline === undefined || outline.length === 0
    ? undefined
    : <Outline sections={outline} />
  return (
    <AppShell title="Reading inbox" count={count} panel={panel}>
      {children}
    </AppShell>
  )
}

function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
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
      setError(messageOf(cause))
    }
    finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => { void refresh() }, [refresh])

  // A failed absorb leaves the reading where it is,
  // so the queue is only reread once the action landed.
  const act = async (action: Promise<void>): Promise<void> => {
    try {
      await action
    }
    catch (cause) {
      setError(messageOf(cause))
      return
    }
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
    <Shell count={cards.length} outline={outlineOf(cards)}>
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
            onDiscard={() => act(client.discard(card.id))}
          />
        ))}
      </div>
    </Shell>
  )
}
