import type { SkillId, WorkspaceId } from '@braidhq/schema'
import { ValidationError } from '@braidhq/core'
import type { AppDependencies } from '@braidhq/server'
import type { OpenAPIHono } from '@hono/zod-openapi'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { SkillId as SkillIdSchema, ViewKind, WorkspaceId as WorkspaceIdSchema } from '@braidhq/schema'
import { VIEW_KIND } from '@newledge/view-generator-handout'
import type { Form } from '@newledge/view-generator-handout/forms'
import { argumentsFor, askedOf, FORMS, formOfId } from '@newledge/view-generator-handout/forms'
import { z } from 'zod'

/**
 * What a reader asked for, which is a form and whatever that form asks.
 *
 * The options are read loosely here and settled against the form afterwards,
 * because which options exist depends on which form was named,
 * and a schema cannot know that until it has one.
 */
const Asked = z.object({
  form: z.string().min(1),
  asked: z.record(z.string(), z.string()).optional(),
})

/**
 * Project a board into the material a view is written from.
 *
 * The half that is a function,
 * and the half a test can reach without an agent installed,
 * which is why it is named rather than folded into the route.
 *
 * braid declares a view generator and never calls one,
 * so this is what calls it. The plugin projects the board into material,
 * which is a function and comes out the same every time,
 * and a skill then writes the page from it.
 *
 * Both halves are here rather than in the skill,
 * because a skill is a subprocess and cannot call a plugin.
 * Something has to stand between them, and this is it.
 */
export async function projectBoard(
  deps: AppDependencies,
  workspaceId: WorkspaceId,
  boardId: string,
): Promise<string> {
  const workspace = await deps.workspaceService.findById(workspaceId)
  const generator = deps.pluginRegistry.requireViewGenerator(ViewKind.parse(VIEW_KIND))
  const model = await deps.modelService.getSnapshot(workspaceId)
  const artifact = await generator.render({ model, config: { workspaceId, boardId } })

  const written = await Promise.all(artifact.files.map(async (file) => {
    const path = join(workspace.rootPath, 'artifacts', file.path)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, file.text, 'utf-8')
    // The skill is handed a path it can resolve against the workspace root,
    // which is the one directory it is told about.
    return join('artifacts', file.path)
  }))

  const [first] = written
  if (first === undefined)
    throw new Error(`Nothing was projected out of board "${boardId}"`)
  return first
}

/** The skill that writes this form, under the namespace the plugin declares. */
function skillFor(form: string): SkillId {
  return SkillIdSchema.parse(`${VIEW_KIND}:${form}`)
}

/** The forms a reader may name, said the way a refusal has to say them. */
function named(): string {
  return FORMS.map(one => one.id).join(', ')
}

/**
 * What a form needs from the deployment, and what it was actually given.
 *
 * Read off the running process, since these are settings of a deployment,
 * rather than anything a reader chose or a board holds.
 * The form names what it needs, so a fifth one needing something else,
 * is a line in the form list rather than another branch here.
 *
 * braid takes one positional argument and that one carries the material,
 * so a setting travels as environment,
 * which is the channel braid keeps for when the argument is taken.
 */
export function settingsFor(form: Form): Record<string, string> {
  const given: Record<string, string> = {}
  for (const name of form.requires ?? [])
    given[name] = process.env[name] ?? ''
  return given
}

/**
 * Which of those nobody set, read from one snapshot rather than the environment.
 *
 * An empty value counts as unset,
 * because a variable exported as nothing is a reader who meant to set it,
 * and handing that on gives a skill a path to a directory that is not there.
 */
export function unsetIn(given: Readonly<Record<string, string>>): readonly string[] {
  return Object.entries(given).filter(([, value]) => value === '').map(([name]) => name)
}

/**
 * Mount the route a reader asks for a view through.
 *
 * A view of a board is created rather than commanded,
 * so it is a POST to the board's own views. Writing takes a minute or so,
 * so the run is handed back for the caller to watch rather than waited on.
 */
export function mountBoardViews(app: OpenAPIHono, deps: AppDependencies): void {
  app.post('/workspaces/:workspaceId/boards/:boardId/views', async (context) => {
    const workspaceId = WorkspaceIdSchema.parse(context.req.param('workspaceId'))
    const boardId = context.req.param('boardId') ?? ''
    const body = Asked.safeParse(await context.req.json())
    if (!body.success)
      throw new ValidationError(`A view is written in one of ${named()}`)

    const form = formOfId(body.data.form)
    if (form === undefined)
      throw new ValidationError(`A view is written in one of ${named()}`)

    // Settled against the form rather than trusted,
    // so a skill is never handed a choice that is not in its vocabulary,
    // which it has no way to tell from one it has not implemented.
    const asked = askedOf(form, body.data.asked ?? {})

    const runner = deps.skillRunner
    if (runner === undefined)
      return context.json({ title: 'ConflictError', detail: 'No agent is configured to write a view' }, 409)

    const settings = settingsFor(form)
    const unset = unsetIn(settings)
    if (unset.length > 0) {
      return context.json({
        title: 'ConflictError',
        detail: `Writing a ${form.label.toLowerCase()} needs ${unset.join(' and ')} set.`,
      }, 409)
    }

    const material = await projectBoard(deps, workspaceId, boardId)
    const workspace = await deps.workspaceService.findById(workspaceId)
    const runId = await runner.start(
      workspace,
      skillFor(form.id),
      argumentsFor(material, asked),
      { extraEnv: settings },
    )

    return context.json({ runId, form: form.id, asked, material }, 202)
  })
}
