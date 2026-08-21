import { useState } from 'react'
import type { CitedNode, ConceptReading, ProposalCard, SourceLink, TopicGroup } from './proposal.js'
import { Button } from './ui/Button.js'
import { GroupLabel, Surface } from './ui/Card.js'

type NodeKind = 'concept' | 'claim' | 'topic'

// The accent is keyed by kind, not by the heading text,
// so translating a heading cannot silently drop its colour.
const KIND_ACCENT: Record<NodeKind, string> = {
  concept: 'border-l-concept',
  claim: 'border-l-claim',
  topic: 'border-l-topic',
}

/** The anchor an outline entry jumps to. */
export function conceptAnchor(cardId: string, conceptId: string): string {
  return `${cardId}--${conceptId}`
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

/**
 * The sources a node traces to, numbered against the card's own list.
 * Provenance is what makes a claim checkable rather than merely stated,
 * so it rides beside the text instead of collecting at the top of the card.
 */
function Cites({ cites }: { cites: readonly SourceLink[] }): React.JSX.Element | null {
  if (cites.length === 0)
    return null
  return (
    <span className="ml-1.5 inline-flex gap-1 align-super">
      {cites.map(source => (
        <a
          key={source.id}
          href={source.url}
          target="_blank"
          rel="noreferrer"
          title={source.title}
          className="font-ui text-[0.625rem] tabular-nums text-ink-subtle transition-colors hover:text-concept"
        >
          {source.index}
        </a>
      ))}
    </span>
  )
}

function ClaimLine({ claim }: { claim: CitedNode }): React.JSX.Element {
  return (
    <li className={`border-l-2 pl-4 ${KIND_ACCENT.claim}`}>
      <p className="font-reading text-prose-sm text-ink">
        {claim.node.name ?? claim.node.id}
        <Cites cites={claim.cites} />
      </p>
      {claim.node.description !== undefined && (
        <p className="mt-1 font-reading text-prose-sm text-ink-muted">{claim.node.description}</p>
      )}
    </li>
  )
}

/**
 * A concept leads with what it is, and its claims stay folded until asked for.
 * A well-covered concept carries many assertions,
 * and unfolding them all at once buries the definition the reader came for.
 */
function Reading({ anchor, reading }: { anchor: string, reading: ConceptReading }): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const { concept, claims } = reading
  return (
    <li id={anchor} className={`scroll-mt-6 border-l-2 pl-5 ${KIND_ACCENT.concept}`}>
      <p className="font-ui text-sm font-semibold text-ink">
        {concept.name ?? concept.id}
        <Cites cites={reading.cites} />
      </p>
      {concept.description !== undefined && (
        <p className="mt-1.5 font-reading text-prose-sm text-ink-muted">{concept.description}</p>
      )}

      {claims.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="mt-2 font-ui text-xs text-ink-subtle underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink-muted"
          >
            {open ? 'Hide claims' : `${claims.length} ${claims.length === 1 ? 'claim' : 'claims'}`}
          </button>
          {open && (
            <ul className="mt-3 space-y-2.5">
              {claims.map(claim => <ClaimLine key={claim.node.id} claim={claim} />)}
            </ul>
          )}
        </>
      )}
    </li>
  )
}

function Theme({ cardId, group }: { cardId: string, group: TopicGroup }): React.JSX.Element {
  return (
    <section className="mt-7">
      <GroupLabel>{group.title}</GroupLabel>
      <ul className="mt-4 space-y-6">
        {group.readings.map(reading => (
          <Reading
            key={reading.concept.id}
            anchor={conceptAnchor(cardId, reading.concept.id)}
            reading={reading}
          />
        ))}
      </ul>
    </section>
  )
}

/**
 * The pages a reading came from, listed the way a paper lists its references.
 * A filled row reads as a control rather than a citation,
 * so the number carries the structure and the title stays a plain link.
 */
function Sources({ sources }: { sources: readonly SourceLink[] }): React.JSX.Element {
  return (
    <ol className="mt-4 space-y-1.5">
      {sources.map((source, index) => (
        <li key={source.id} className="flex gap-3 font-ui text-xs leading-relaxed">
          <span className="w-4 shrink-0 text-right tabular-nums text-ink-subtle">{index + 1}</span>
          {source.url === undefined
            ? <span className="text-ink-muted">{source.title}</span>
            : (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ink-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink"
                >
                  {source.title}
                </a>
              )}
        </li>
      ))}
    </ol>
  )
}

function LooseClaims({ claims }: { claims: readonly CitedNode[] }): React.JSX.Element | null {
  if (claims.length === 0)
    return null
  return (
    <section className="mt-7">
      <GroupLabel>Claims about nothing here</GroupLabel>
      <ul className="mt-4 space-y-4">
        {claims.map(claim => <ClaimLine key={claim.node.id} claim={claim} />)}
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
  const [showSources, setShowSources] = useState(false)
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
      <header className="border-b border-line pb-5">
        <h2 className="font-ui text-base font-semibold leading-snug text-ink">
          {card.sources.length === 1
            ? card.sources[0]!.title
            : `${card.sources.length} readings on this search`}
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <Tally colour="bg-concept" count={card.conceptCount} label="concepts" />
          <Tally colour="bg-claim" count={card.claimCount} label="claims" />
          {card.sources.length > 1 && (
            <button
              type="button"
              onClick={() => setShowSources(!showSources)}
              className="font-ui text-xs text-ink-subtle underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink-muted"
            >
              {showSources ? 'Hide sources' : `${card.sources.length} sources`}
            </button>
          )}
        </div>
        {showSources && <Sources sources={card.sources} />}
      </header>

      {card.groups.map(group => <Theme key={group.id} cardId={card.id} group={group} />)}
      <LooseClaims claims={card.looseClaims} />

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
