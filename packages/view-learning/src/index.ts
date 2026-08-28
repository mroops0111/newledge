import type { ViewGeneratorPlugin } from '@braidhq/core'
import type { Board, BoardState } from '@newledge/board'
import { defineViewGeneratorPlugin } from '@braidhq/sdk'
import { z } from 'zod'
import type { Reading } from './skeleton.js'
import { skeletonOf } from './skeleton.js'

export type { Held, Reading, Skeleton } from './skeleton.js'
export { missingFrom, skeletonOf } from './skeleton.js'

export const VIEW_KIND = 'learning' as const

/**
 * Where the boards are, asked for rather than reached for.
 * A board is Newledge's own view state and does not live in the model,
 * so the plugin is handed a way to read one and a test can hand it a fake,
 * the same way the source loader is handed its provider.
 */
export type BoardSource = (workspaceId: string) => Promise<BoardState>

const Config = z.object({
  workspaceId: z.string().min(1),
  boardId: z.string().min(1),
})

/**
 * The material a learning view is written from, and nothing about the writing.
 *
 * The two halves of a view split along what each is good at.
 * This half is a function, so what a claim is, which term it sits under,
 * what argues with it, and where it came from come out the same every run,
 * because they are facts about the graph rather than choices about wording.
 *
 * The other half is a skill, and it is deliberately given no template.
 * A generator that dictates the shape of an explanation,
 * gets a document that obeys the shape and teaches nobody.
 * What the skill is handed is the material, in the reader's own order,
 * and what it owes back is an explanation.
 */
export function createLearningViewPlugin(boards: BoardSource): ViewGeneratorPlugin {
  return defineViewGeneratorPlugin({
    viewKind: VIEW_KIND,
    configSchema: Config,
    render: async (config, input) => {
      const state = await boards(config.workspaceId)
      const board = state.boards.find(one => one.id === config.boardId)
      if (board === undefined)
        throw new Error(`Board "${config.boardId}" is not one this workspace holds`)

      return {
        kind: VIEW_KIND,
        format: 'json',
        files: [{
          path: `views/learning/${board.id}.json`,
          text: `${JSON.stringify(skeletonOf(board, input.model as unknown as Reading), null, 2)}\n`,
        }],
      } as Awaited<ReturnType<ViewGeneratorPlugin['render']>>
    },
  })
}

export type { Board }
