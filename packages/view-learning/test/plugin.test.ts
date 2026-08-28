import type { BoardState } from '@newledge/board'
import { describe, expect, it } from 'vitest'
import type { BoardSource } from '../src/index.js'
import { createLearningViewPlugin, VIEW_KIND } from '../src/index.js'

const state: BoardState = {
  boards: [{
    id: 'b',
    name: 'Retrieval',
    cards: [{ nodeId: 'rag', x: 0, y: 0 }],
    sections: [],
  }],
}

const boards: BoardSource = async () => state

const model = {
  nodes: [{ id: 'rag', type: 'Concept', name: 'RAG', description: 'RAG explained' }],
  edges: [],
}

function render(config: unknown): ReturnType<ReturnType<typeof createLearningViewPlugin>['render']> {
  return createLearningViewPlugin(boards).render({ model, config } as never)
}

describe('createLearningViewPlugin', () => {
  it('registers on the view axis rather than as part of the ontology', () => {
    const plugin = createLearningViewPlugin(boards)
    expect(plugin.type).toBe('view-generator')
    expect(plugin.viewKind).toBe(VIEW_KIND)
  })

  it('writes one file per board, named after the board', async () => {
    const artifact = await render({ workspaceId: 'w', boardId: 'b' })
    expect(artifact.files.map(one => one.path)).toEqual(['views/learning/b.json'])
  })

  it('hands on the material rather than a document', async () => {
    const artifact = await render({ workspaceId: 'w', boardId: 'b' })
    const held = JSON.parse(artifact.files[0]!.text) as { title: string, held: { name: string }[] }
    expect(held.title).toBe('Retrieval')
    expect(held.held.map(one => one.name)).toEqual(['RAG'])
  })

  it('says so plainly when asked for a board this workspace does not hold', async () => {
    await expect(render({ workspaceId: 'w', boardId: 'gone' })).rejects.toThrow('not one this workspace holds')
  })

  it('refuses a config that names no board', async () => {
    await expect(render({ workspaceId: 'w' })).rejects.toThrow()
  })
})
