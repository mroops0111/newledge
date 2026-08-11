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

describe('knowledge ontology', () => {
  it('accepts well-typed, correctly-directed edges', async () => {
    const snap = snapshot(
      [node('c1', 'Concept'), node('cl1', 'Claim'), node('s1', 'Source')],
      [edge('e1', 'introducedBy', 'c1', 's1'), edge('e2', 'cites', 'cl1', 's1')],
    )
    expect(await typeValidator.validate(snap)).toEqual([])
    expect(await structuralValidator.validate(snap)).toEqual([])
  })

  it('rejects an unknown node type', async () => {
    const issues = await typeValidator.validate(snapshot([node('n1', 'Topic')]))
    expect(issues[0]).toMatchObject({ code: 'ontology.unknown-node-type', severity: 'error', nodeId: 'n1' })
  })

  it('rejects a reversed introducedBy edge', async () => {
    const issues = await structuralValidator.validate(snapshot(
      [node('c1', 'Concept'), node('s1', 'Source')],
      [edge('e1', 'introducedBy', 's1', 'c1')],
    ))
    expect(issues.map(i => i.code)).toEqual(['structural.endpoint-type-from', 'structural.endpoint-type-to'])
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

  it('accepts a node that cites a source, or declares a still-missing role', () => {
    const cited = node('cl1', 'Claim', { sourceReferences: [{ sourceId: 's-a' as SourceId, location: { uri: 'https://example.com/a' } }] })
    expect(validateEvidence(snapshot([cited]))).toEqual([])
    const pending = node('c1', 'Concept', { missingRoles: ['stance' as SourceRole] })
    expect(validateEvidence(snapshot([pending]))).toEqual([])
  })
})
