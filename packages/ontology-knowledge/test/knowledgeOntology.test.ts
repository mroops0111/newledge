import { OntologyTypeValidator, StructuralValidator, validateEvidence } from '@braidhq/core'
import type {
  EdgeId,
  EdgeTypeId,
  ModelSnapshot,
  NodeId,
  NodeStatus,
  NodeTypeId,
  SourceId,
  SourceRole,
} from '@braidhq/schema'
import { describe, expect, it } from 'vitest'
import { knowledgeOntology } from '../src/index.js'

// The plugin auto-attaches these; construct fresh instances bound to it for clarity.
const typeValidator = new OntologyTypeValidator(knowledgeOntology)
const structuralValidator = new StructuralValidator(knowledgeOntology)

const draft = 'draft' as NodeStatus

type Node = ModelSnapshot['nodes'][number]
type Edge = ModelSnapshot['edges'][number]

function node(id: string, type: string, metadata: Partial<Node['metadata']> = {}): Node {
  return { id: id as NodeId, type: type as NodeTypeId, name: id, status: draft, metadata: { sourceReferences: [], ...metadata } }
}

function edge(id: string, type: string, from: string, to: string): Edge {
  return { id: id as EdgeId, type: type as EdgeTypeId, fromNodeId: from as NodeId, toNodeId: to as NodeId, metadata: { sourceReferences: [] } }
}

function snapshot(nodes: Node[], edges: Edge[] = []): ModelSnapshot {
  return { nodes, edges }
}

describe('knowledge ontology configuration', () => {
  it('declares the knowledge ontology id', () => {
    expect(knowledgeOntology.ontologyId).toBe('knowledge')
  })

  it('declares the Concept, Claim, Source, and Topic node types', () => {
    expect(knowledgeOntology.nodeTypes.map(n => n.id)).toEqual(['Concept', 'Claim', 'Source', 'Topic'])
  })

  it('declares the concept-structure and evidence edge types', () => {
    expect(knowledgeOntology.edgeTypes.map(e => e.id)).toEqual(['extends', 'instantiates', 'contains', 'uses', 'relatesTo', 'belongsTo', 'introduces', 'supports', 'contradicts'])
  })

  it('declares feed and stance, with feed as the only unit-bearing role and neither required', () => {
    expect(knowledgeOntology.sourceRoles.map(r => r.id)).toEqual(['feed', 'stance'])
    expect(knowledgeOntology.sourceRoles.filter(r => r.unitBearing).map(r => r.id)).toEqual(['feed'])
    expect(knowledgeOntology.sourceRoles.filter(r => r.required)).toEqual([])
  })
})

describe('knowledge ontology validation', () => {
  it('accepts well-typed, correctly-directed edges', async () => {
    const snap = snapshot(
      [node('c1', 'Concept'), node('c2', 'Concept'), node('s1', 'Source'), node('t1', 'Topic')],
      [
        edge('e1', 'introduces', 's1', 'c1'),
        edge('e2', 'extends', 'c1', 'c2'),
        edge('e3', 'belongsTo', 'c1', 't1'),
      ],
    )
    expect(await typeValidator.validate(snap)).toEqual([])
    expect(await structuralValidator.validate(snap)).toEqual([])
  })

  it('rejects an unknown node type', async () => {
    const issues = await typeValidator.validate(snapshot([node('n1', 'Question')]))
    expect(issues[0]).toMatchObject({ code: 'ontology.unknown-node-type', severity: 'error', nodeId: 'n1' })
  })

  it('rejects a reversed introduces edge', async () => {
    const issues = await structuralValidator.validate(snapshot(
      [node('c1', 'Concept'), node('s1', 'Source')],
      [edge('e1', 'introduces', 'c1', 's1')],
    ))
    expect(issues.map(i => i.code)).toEqual(['structural.endpoint-type-from', 'structural.endpoint-type-to'])
  })

  it('accepts supports and contradicts between two claims, and rejects a mistyped endpoint', async () => {
    const good = snapshot(
      [node('cl1', 'Claim'), node('cl2', 'Claim')],
      [edge('e1', 'supports', 'cl1', 'cl2'), edge('e2', 'contradicts', 'cl2', 'cl1')],
    )
    expect(await structuralValidator.validate(good)).toEqual([])

    const bad = snapshot(
      [node('c1', 'Concept'), node('cl1', 'Claim')],
      [edge('e1', 'contradicts', 'c1', 'cl1')],
    )
    expect((await structuralValidator.validate(bad)).map(i => i.code)).toContain('structural.endpoint-type-from')
  })

  it('accepts concept-structure edges plus topic membership and nesting', async () => {
    const snap = snapshot(
      [node('c1', 'Concept'), node('c2', 'Concept'), node('cl1', 'Claim'), node('t1', 'Topic'), node('t2', 'Topic')],
      [
        edge('e1', 'uses', 'c1', 'c2'),
        edge('e2', 'contains', 'c1', 'c2'),
        edge('e3', 'instantiates', 'c1', 'c2'),
        edge('e4', 'relatesTo', 'c1', 'c2'),
        edge('e5', 'belongsTo', 'cl1', 't1'), // a claim filed under a topic
        edge('e6', 'belongsTo', 't2', 't1'), // a topic nested under a topic
      ],
    )
    expect(await typeValidator.validate(snap)).toEqual([])
    expect(await structuralValidator.validate(snap)).toEqual([])

    // `belongsTo` only targets a Topic — a concept as the target is rejected.
    const bad = snapshot(
      [node('c1', 'Concept'), node('c2', 'Concept')],
      [edge('e1', 'belongsTo', 'c1', 'c2')],
    )
    expect((await structuralValidator.validate(bad)).map(i => i.code)).toContain('structural.endpoint-type-to')
  })

  it('validates missing source roles against the declared set', async () => {
    expect(await typeValidator.validate(snapshot([node('n1', 'Concept', { missingRoles: ['stance' as SourceRole] })]))).toEqual([])
    const issues = await typeValidator.validate(snapshot([node('n2', 'Concept', { missingRoles: ['bogus' as SourceRole] })]))
    expect(issues[0]).toMatchObject({ code: 'ontology.unknown-source-role', nodeId: 'n2' })
  })

  it('rejects a traceless node via the evidence gate', () => {
    const issues = validateEvidence(snapshot([node('n1', 'Concept')]))
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ code: 'evidence.no-source-or-missing-roles', nodeId: 'n1' })
  })

  it('accepts a node that carries a source reference, or declares a still-missing role', () => {
    const cited = node('cl1', 'Claim', { sourceReferences: [{ sourceId: 's-a' as SourceId, location: { uri: 'https://example.com/a' } }] })
    expect(validateEvidence(snapshot([cited]))).toEqual([])
    const pending = node('c1', 'Concept', { missingRoles: ['stance' as SourceRole] })
    expect(validateEvidence(snapshot([pending]))).toEqual([])
  })
})
