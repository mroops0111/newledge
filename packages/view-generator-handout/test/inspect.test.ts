import { describe, expect, it } from 'vitest'
import { problemsIn } from '../src/inspect.js'

const said = (html: string): string[] => problemsIn(html).map(one => one.said)

const whole = `
<section class="chapter">
  <h2>A chapter with enough in it to be a step rather than a heading alone</h2>
  <div class="question" data-level="recall">
    <p class="ask">Which of these is it?</p>
    <ol class="choices">
      <li class="choice" data-correct>The one the material supports.</li>
      <li class="choice">One a reader might believe instead.</li>
    </ol>
    <div class="answer">
      <p>Why the first is right.</p>
      <p class="source"><a href="https://example.org">example.org</a></p>
    </div>
  </div>
</section>`

describe('a page that holds together', () => {
  it('is reported as nothing to fix', () => {
    expect(problemsIn(whole)).toEqual([])
  })

  it('asks nothing of a page that asks nothing, which is what a reference is', () => {
    expect(problemsIn('<section class="term"><h2>A</h2><p>What it is.</p></section>')).toEqual([])
  })
})

describe('what an agent promises and does not do', () => {
  it('catches a question with no answer behind it', () => {
    // The checklist item saying every answer is there is the agent's belief,
    // and this is the thing that has actually looked.
    const said = problemsIn('<div class="question" data-level="recall"><p class="ask">Why?</p></div>')
    expect(said.map(one => one.said).join(' ')).toContain('no answer behind this')
  })

  it('catches an answer left empty', () => {
    expect(said('<div class="question" data-level="recall"><p class="ask">Why?</p><div class="answer"></div></div>'))
      .toContain('The answer is empty.')
  })

  it('catches an ask left empty', () => {
    expect(said('<div class="question" data-level="recall"><p class="ask"> </p><div class="answer">Because.</div></div>'))
      .toContain('The ask is empty.')
  })

  it('reads a paragraph of markup with no words as empty', () => {
    // A question that is a span inside a strong inside a paragraph,
    // and no text, reads as written until something strips the tags.
    expect(said('<div class="question" data-level="recall"><p class="ask"><strong><span></span></strong></p><div class="answer">Because.</div></div>'))
      .toContain('The ask is empty.')
  })

  it('catches a question that says nothing about what it tests', () => {
    expect(said('<div class="question"><p class="ask">Why?</p><div class="answer">Because.</div></div>').join(' '))
      .toContain('data-level')
  })

  it('catches a level nobody offered', () => {
    expect(said('<div class="question" data-level="hard"><p class="ask">Why?</p><div class="answer">Because.</div></div>').join(' '))
      .toContain('"hard" is not a level')
  })
})

describe('options that are not a choice', () => {
  const around = (choices: string): string =>
    `<div class="question" data-level="recall"><p class="ask">Which?</p><ol class="choices">${choices}</ol><div class="answer">Because.</div></div>`

  it('catches none of them being right', () => {
    expect(said(around('<li class="choice">A</li><li class="choice">B</li>')).join(' '))
      .toContain('No option is marked correct')
  })

  it('catches more than one being right', () => {
    expect(said(around('<li class="choice" data-correct>A</li><li class="choice" data-correct>B</li>')).join(' '))
      .toContain('2 options are marked correct')
  })

  it('catches a single option offered as a choice', () => {
    expect(said(around('<li class="choice" data-correct>A</li>')).join(' '))
      .toContain('One option is not a choice')
  })

  it('catches an option with nothing in it', () => {
    expect(said(around('<li class="choice" data-correct>A</li><li class="choice"></li>')))
      .toContain('An option is empty.')
  })
})

describe('the contract about what a page may carry', () => {
  it('catches a whole document where a fragment was asked for', () => {
    expect(said('<!doctype html><html><body>hi</body></html>').join(' ')).toContain('whole document')
  })

  it('catches a page that styles itself', () => {
    expect(said(`${whole}<style>p{color:red}</style>`).join(' ')).toContain('style block')
  })

  it('catches a page that scripts itself', () => {
    expect(said(`${whole}<script>alert(1)</script>`).join(' ')).toContain('script is here')
  })

  it('catches a generator reaching for its own disclosure control', () => {
    expect(said(`${whole}<details><summary>Answer</summary>x</details>`).join(' ')).toContain('details element')
  })

  it('catches a page with nothing on it at all', () => {
    expect(said('   \n  ')).toContain('Nothing was written.')
  })
})

describe('a chapter that is a heading and not a step', () => {
  it('catches one holding almost nothing', () => {
    expect(said('<section class="chapter"><h2>Later</h2></section>').join(' '))
      .toContain('holding almost nothing')
  })

  it('catches one a reader could not pick out of a list', () => {
    expect(said('<section class="chapter"><p>A paragraph long enough to count as a real step in the sequence.</p></section>').join(' '))
      .toContain('opens with an h2')
  })
})

describe('a source a reader cannot follow', () => {
  it('catches one carrying no link', () => {
    expect(said(`${whole}<p class="source">somewhere</p>`).join(' ')).toContain('carries a link')
  })
})

describe('what a reader can learn from the shape of a page', () => {
  const asked = (correctAt: number, extra = ''): string =>
    `<div class="question" data-level="recall"><p class="ask">Which?</p><ol class="choices">${
      [0, 1, 2].map(at => `<li class="choice"${at === correctAt ? ' data-correct' : ''}>Option ${at}${at === correctAt ? extra : ''}</li>`).join('')
    }</ol><div class="answer">Because.</div></div>`

  it('catches every right answer sitting in the same place', () => {
    // A page like this gives full marks to a reader who knows nothing,
    // and they read scoring well as knowing it.
    const page = [asked(0), asked(0), asked(0)].join('')
    expect(said(page).join(' ')).toContain('Every right answer is option 1')
  })

  it('says nothing when they are moved about', () => {
    expect(problemsIn([asked(0), asked(1), asked(2)].join(''))).toEqual([])
  })

  it('holds off until there are enough questions to see a pattern in', () => {
    // Two questions sharing a position is a coincidence, not a tell.
    expect(problemsIn([asked(0), asked(0)].join(''))).toEqual([])
  })

  it('catches the right answer being the longest one nearly every time', () => {
    const long = ' with all of the qualifications that the true statement needs'
    const page = [0, 1, 2, 0, 1, 2].map((at, i) => asked(at, i < 5 ? long : '')).join('')
    expect(said(page).join(' ')).toContain('longest option in 5 of 6')
  })

  it('lets a few of them be longest, since some answers are simply longer', () => {
    const long = ' with rather more said about it than the others carry'
    const page = [0, 1, 2, 0, 1, 2].map((at, i) => asked(at, i < 2 ? long : '')).join('')
    expect(problemsIn(page)).toEqual([])
  })
})
