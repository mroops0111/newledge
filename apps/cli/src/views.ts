import type { WorkspaceId } from '@braidhq/schema'
import type { AppDependencies } from '@braidhq/server'
import type { OpenAPIHono } from '@hono/zod-openapi'
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { WorkspaceId as WorkspaceIdSchema } from '@braidhq/schema'
import { DECK_WORKSPACE } from '@newledge/view-generator-handout/forms'
import { readBoards } from './boards.js'

const VIEWS_DIR = join('artifacts', 'views')

/**
 * Where the runtime that plays decks is serving, and what it serves by default.
 *
 * A deck is not read here, so a reader needs somewhere to be sent,
 * and where that runtime listens is a setting rather than a fact.
 * The fallback is open-slide's own default port,
 * which is what a reader has until they change it,
 * so the common case needs nothing set at all.
 */
const DECK_URL = 'NEWLEDGE_DECK_URL'
const DECK_URL_FALLBACK = 'http://localhost:5173'

/** Where decks sit inside the workspace that plays them. */
const SLIDES_DIR = 'slides'

/**
 * What a surface is told about one generated view.
 *
 * The format is taken off the name rather than declared,
 * because nothing that writes a view here declares one.
 * braid has a field for it and nothing fills it in,
 * so a reader of this route would be told a promise rather than a fact.
 * The extension is what is actually true.
 */
export interface View {
  /** Path under the views directory, which is also how one is asked for. */
  readonly path: string
  readonly format: string
  readonly bytes: number
  readonly writtenAt: string
  /**
   * Where this is seen, for a view that is not read from here.
   *
   * A page is read back through this route,
   * and a deck is played by its own runtime somewhere else,
   * so one carries an address and the other does not.
   * A surface offering both looks for this rather than for a form,
   * which is what lets a fifth kind arrive without teaching it a name.
   */
  readonly seenAt?: string
}

/**
 * Where the generated views are, which is beside the knowledge they are of.
 * The same directory braid's own doc skill writes into,
 * so anything that writes a view is found here without being told to.
 */
async function viewsRoot(deps: AppDependencies, id: WorkspaceId): Promise<string> {
  const workspace = await deps.workspaceService.findById(id)
  return join(workspace.rootPath, VIEWS_DIR)
}

/**
 * Every file under the views directory, however deeply it is nested.
 *
 * A name beginning with a dot is passed over.
 * Nothing that writes a view names one that way,
 * so anything found under one belongs to the operating system,
 * and a reader offered it would be offered a file nobody made for them.
 */
async function walk(root: string, at: string = root): Promise<readonly string[]> {
  const entries = await readdir(at, { withFileTypes: true }).catch(() => [])
  const found = await Promise.all(entries.map(async (entry) => {
    if (entry.name.startsWith('.'))
      return []
    const here = join(at, entry.name)
    return entry.isDirectory() ? walk(root, here) : [here]
  }))
  return found.flat()
}

/**
 * The decks the workspace that plays them is holding.
 *
 * They are listed beside the pages rather than apart from them,
 * because a reader thinks of all four as things they wrote out of a board,
 * and a list that quietly drops one is a list they cannot trust.
 *
 * Their path is spelled the way the pages under this route are,
 * so whatever gathers views by subject gathers these under the same one.
 *
 * Only the decks of boards held here are listed.
 * That workspace is the reader's own and holds decks they wrote by hand,
 * and a handout list that swept those in,
 * would be offering them things this workspace never wrote.
 */
async function decksHeld(deps: AppDependencies, id: WorkspaceId): Promise<readonly View[]> {
  const workspace = process.env[DECK_WORKSPACE] ?? ''
  if (workspace === '')
    return []

  const boards = new Set((await readBoards(deps, id)).boards.map(one => one.id))
  const root = join(workspace, SLIDES_DIR)
  const served = (process.env[DECK_URL] ?? DECK_URL_FALLBACK).replace(/\/+$/, '')
  const entries = await readdir(root, { withFileTypes: true }).catch(() => [])

  const found = await Promise.all(entries.map(async (entry): Promise<readonly View[]> => {
    if (!entry.isDirectory() || !boards.has(entry.name))
      return []
    const deck = join(root, entry.name, 'index.tsx')
    const stamped = await stat(deck).catch(() => undefined)
    if (stamped === undefined)
      return []
    return [{
      path: `presentation/${entry.name}/index.tsx`,
      format: 'tsx',
      bytes: stamped.size,
      writtenAt: stamped.mtime.toISOString(),
      seenAt: `${served}/s/${encodeURIComponent(entry.name)}`,
    }]
  }))
  return found.flat()
}

function formatOf(path: string): string {
  const dot = path.lastIndexOf('.')
  return dot === -1 ? 'unknown' : path.slice(dot + 1).toLowerCase()
}

/**
 * A path a reader asked for, resolved under the views directory or refused.
 *
 * A path is a string a caller chose,
 * so one that climbs out of the directory would read any file it can reach.
 * Resolving first and checking the result,
 * is what makes a name that walks upwards fail rather than escape.
 */
function within(root: string, asked: string): string | undefined {
  const full = join(root, asked)
  const inside = relative(root, full)
  return inside.startsWith('..') || inside.startsWith(sep) ? undefined : full
}

/**
 * Mount the routes a surface reads generated views through.
 *
 * Reading only. A view is written by whatever generated it, a skill today,
 * and is derived from the graph rather than authored,
 * so nothing a reader does here should be able to change one.
 */
export function mountViews(app: OpenAPIHono, deps: AppDependencies): void {
  app.get('/workspaces/:workspaceId/views', async (context) => {
    const id = WorkspaceIdSchema.parse(context.req.param('workspaceId'))
    const root = await viewsRoot(deps, id)
    const items = await Promise.all((await walk(root)).map(async (path): Promise<View> => {
      const found = await stat(path)
      return {
        path: relative(root, path).split(sep).join('/'),
        format: formatOf(path),
        bytes: found.size,
        writtenAt: found.mtime.toISOString(),
      }
    }))
    const all = [...items, ...await decksHeld(deps, id)]
    return context.json({ items: all.sort((one, other) => one.path.localeCompare(other.path)) })
  })

  app.get('/workspaces/:workspaceId/views/*', async (context) => {
    const id = WorkspaceIdSchema.parse(context.req.param('workspaceId'))
    const root = await viewsRoot(deps, id)
    const asked = decodeURIComponent(context.req.path.split('/views/')[1] ?? '')
    const path = within(root, asked)
    if (path === undefined)
      return context.json({ title: 'NotFoundError', detail: `No view at "${asked}"` }, 404)

    const text = await readFile(path, 'utf-8').catch(() => undefined)
    if (text === undefined)
      return context.json({ title: 'NotFoundError', detail: `No view at "${asked}"` }, 404)

    return context.json({ path: asked, format: formatOf(asked), text })
  })
}
