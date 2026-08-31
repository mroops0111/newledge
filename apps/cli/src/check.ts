import { readFile } from 'node:fs/promises'
import { problemsIn } from '@newledge/view-generator-handout'

/**
 * Report what is wrong with a written page, for whoever wrote it.
 *
 * A skill checks its own work against a list it was given,
 * and an agent that wrote a question with no answer behind it,
 * ticks the box saying every answer is there, because it believes it.
 * So the same contract is checked here, by something that has read the file,
 * and the skill is told to run this and fix what it says until it says nothing.
 *
 * The exit code is what makes that loop terminate rather than the wording,
 * so a page with nothing wrong exits zero and says so in one line.
 */
export async function check(path: string | undefined): Promise<number> {
  if (path === undefined) {
    console.error('newledge check: give it the path of a written page')
    return 2
  }

  const html = await readFile(path, 'utf-8').catch(() => undefined)
  if (html === undefined) {
    console.error(`newledge check: nothing to read at "${path}"`)
    return 2
  }

  const problems = problemsIn(html)
  if (problems.length === 0) {
    console.log(`newledge check: ${path} holds together`)
    return 0
  }

  console.error(`newledge check: ${problems.length} to fix in ${path}`)
  for (const problem of problems)
    console.error(`  ${problem.at}: ${problem.said}`)
  return 1
}
