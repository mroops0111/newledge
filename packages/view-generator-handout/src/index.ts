import type { ViewGeneratorPlugin } from '@braidhq/core'
import { NotFoundError } from '@braidhq/core'
import type { Board, BoardState } from '@newledge/board'
import { ViewArtifactFormat, ViewKind } from '@braidhq/schema'
import { defineViewGeneratorPlugin } from '@braidhq/sdk'
import { z } from 'zod'
import { FORMS } from './forms.js'
import { skeletonOf } from './skeleton.js'

export type { Ask, Choice, Form } from './forms.js'
export { argumentsFor, askedOf, FORMS, formOfId } from './forms.js'
export type { Problem } from './inspect.js'
export { problemsIn } from './inspect.js'
export type { Held, Reading, Skeleton } from './skeleton.js'
export { missingFrom, skeletonOf } from './skeleton.js'

export const VIEW_KIND = ViewKind.parse('handout')

/**
 * What the material is written as, which is data rather than prose.
 * A skill reads it and writes the page, so what leaves here is structured.
 */
const SKELETON_FORMAT = ViewArtifactFormat.parse('json')

/**
 * Where the material lands, which is beside the views rather than among them.
 *
 * This is what a skill reads to write a page,
 * so a reader offered it among the views would be offered the machinery.
 * braid's artifact type calls this a view,
 * because it is the only shape it has for a plugin's output,
 * and the plugin's output here is only half of one.
 */
const MATERIAL_DIR = 'material'

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
 * The material a handout is written from, and nothing about the writing.
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
export function createHandoutViewPlugin(boards: BoardSource): ViewGeneratorPlugin {
  // The builder takes skills and offers neither the namespace,
  // that the registry demands the moment any are declared,
  // nor the reference every one of them reads.
  // Both are on the base plugin interface, so both are set here.
  // Reported upstream, and two added fields remove this.
  return {
    ...plugin(boards),
    skillNamespace: VIEW_KIND,
    referenceDir: new URL('../skills/shared', import.meta.url),
  }
}

function plugin(boards: BoardSource): ViewGeneratorPlugin {
  return defineViewGeneratorPlugin({
    viewKind: VIEW_KIND,
    configSchema: Config,
    // One skeleton, four ways of writing it out.
    // Looking a subject up, learning it, being asked about it,
    // and teaching it to a room need the same material,
    // and differ only in what is done with it.
    skills: FORMS.map(form => ({
      directory: new URL(`../skills/${form.id}`, import.meta.url),
    })),
    render: async (config, input) => {
      const state = await boards(config.workspaceId)
      const board = state.boards.find(one => one.id === config.boardId)
      // A braid error rather than a plain one,
      // so a route serving this answers a reader with what went wrong,
      // rather than with a failure.
      if (board === undefined)
        throw new NotFoundError(`Board "${config.boardId}" is not one this workspace holds`)

      return {
        kind: VIEW_KIND,
        format: SKELETON_FORMAT,
        files: [{
          path: `${MATERIAL_DIR}/${VIEW_KIND}/${board.id}.json`,
          text: `${JSON.stringify(skeletonOf(board, input.model), null, 2)}\n`,
        }],
      }
    },
  })
}

export type { Board }
