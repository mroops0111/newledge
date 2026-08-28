import { NotFoundError } from '@braidhq/core'
import type { BoardState } from '@newledge/board'
import { describe, expect, it } from 'vitest'
import type { BoardSource } from '../src/index.js'
import { createHandoutViewPlugin, VIEW_KIND } from '../src/index.js'

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

function render(config: unknown): ReturnType<ReturnType<typeof createHandoutViewPlugin>['render']> {
  return createHandoutViewPlugin(boards).render({ model, config } as never)
}

describe('createHandoutViewPlugin', () => {
  it('registers on the view axis rather than as part of the ontology', () => {
    const plugin = createHandoutViewPlugin(boards)
    expect(plugin.type).toBe('view-generator')
    expect(plugin.viewKind).toBe(VIEW_KIND)
  })

  it('puts the material beside the views rather than among them', async () => {
    // A reader offered this among the views would be offered the machinery,
    // rather than a page.
    const artifact = await render({ workspaceId: 'w', boardId: 'b' })
    expect(artifact.files.map(one => one.path)).toEqual(['material/handout/b.json'])
  })

  it('hands on the material rather than a document', async () => {
    const artifact = await render({ workspaceId: 'w', boardId: 'b' })
    const held = JSON.parse(artifact.files[0]!.text) as { title: string, held: { name: string }[] }
    expect(held.title).toBe('Retrieval')
    expect(held.held.map(one => one.name)).toEqual(['RAG'])
  })

  it('says the board is missing in the words a route can answer with', async () => {
    // A braid error rather than a plain one,
    // so a caller serving this answers a reader with what went wrong.
    await expect(render({ workspaceId: 'w', boardId: 'gone' })).rejects.toThrow(NotFoundError)
  })

  it('refuses a config that names no board', async () => {
    await expect(render({ workspaceId: 'w' })).rejects.toThrow()
  })
})
