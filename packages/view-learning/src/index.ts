import type { ViewGeneratorPlugin } from '@braidhq/core'
import type { Board, BoardState } from '@newledge/board'
import { ViewArtifactFormat, ViewKind } from '@braidhq/schema'
import { defineViewGeneratorPlugin } from '@braidhq/sdk'
import { z } from 'zod'
import { skeletonOf } from './skeleton.js'

export type { Held, Reading, Skeleton } from './skeleton.js'
export { missingFrom, skeletonOf } from './skeleton.js'

export const VIEW_KIND = ViewKind.parse('learning')

/**
 * What the material is written as, which is data rather than prose.
 * A skill reads it and writes the page, so what leaves here is structured.
 */
const SKELETON_FORMAT = ViewArtifactFormat.parse('json')

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
  // The builder takes skills and offers no way to name the namespace,
  // that the registry demands the moment any are declared, so it is set here.
  // Reported upstream, and one added field removes this.
  return {
    ...plugin(boards),
    skillNamespace: VIEW_KIND,
  }
}

function plugin(boards: BoardSource): ViewGeneratorPlugin {
  return defineViewGeneratorPlugin({
    viewKind: VIEW_KIND,
    configSchema: Config,
    // One skeleton, two ways of writing it out.
    // Explaining a subject and asking about it need the same material,
    // and differ only in what is done with it.
    skills: [
      { directory: new URL('../skills/tutorial', import.meta.url) },
      { directory: new URL('../skills/exam', import.meta.url) },
    ],
    render: async (config, input) => {
      const state = await boards(config.workspaceId)
      const board = state.boards.find(one => one.id === config.boardId)
      if (board === undefined)
        throw new Error(`Board "${config.boardId}" is not one this workspace holds`)

      return {
        kind: VIEW_KIND,
        format: SKELETON_FORMAT,
        files: [{
          path: `views/${VIEW_KIND}/${board.id}.json`,
          text: `${JSON.stringify(skeletonOf(board, input.model), null, 2)}\n`,
        }],
      }
    },
  })
}

export type { Board }
