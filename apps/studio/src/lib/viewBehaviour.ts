import { LEVELS } from '@newledge/view-generator-handout/forms'

/**
 * How every written view works, whatever wrote it.
 *
 * The same argument that took styling off a generator takes behaviour off one.
 * A generator writing its own controls gives two exams of one board,
 * two different ways of answering a question,
 * and a page that scores differently depending on which run produced it.
 * So a generator writes what a question is,
 * and the marking, the paging, and the tally are given here,
 * which is also what keeps them consistent with the surface reading them.
 *
 * The markup this reads is documented for a generator,
 * in the plugin's own reference, at `skills/shared/style.md`.
 *
 * This runs inside a frame granted scripts and nothing else,
 * so it has no origin, no storage, and no way to reach the session that opened it.
 * Nothing it holds outlives the frame, which is the point.
 * What a reader got right is theirs for this sitting,
 * and what they understand belongs in the graph rather than in a page.
 */

/** What each level is called where a reader sees it, rather than in markup. */
const NAMED_LEVELS = JSON.stringify(
  Object.fromEntries(LEVELS.map(level => [level.id, level.label])),
)

/**
 * The behaviour a view is given, which is one script for every form.
 *
 * Written against the classes the reference offers and nothing else,
 * so a page that uses none of them is left exactly as it arrived,
 * which is what a reference wants and why it opts in by writing no chapter.
 */
export const VIEW_BEHAVIOUR: string = `<script>
(function () {
  var LEVELS = ${NAMED_LEVELS}
  var questions = [].slice.call(document.querySelectorAll('.question'))
  var chapters = [].slice.call(document.querySelectorAll('section.chapter'))
  var wanted = 'all'
  var marked = 0
  var right = 0

  function make(tag, className, text) {
    var node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
  }

  function asked(within) {
    return [].slice.call(within.querySelectorAll('.question'))
  }

  // A question says what it tests in markup,
  // and the reader is told in words, since the attribute is not for them.
  function nameLevel(question) {
    var level = LEVELS[question.getAttribute('data-level')]
    if (!level) return
    question.insertBefore(make('span', 'v-level', level), question.firstChild)
  }

  function reveal(question) {
    var answer = question.querySelector('.answer')
    if (answer) answer.classList.add('shown')
    question.classList.add('done')
  }

  // Picking is final. A question that can be answered twice,
  // measures how long a reader kept guessing rather than what they knew.
  function mark(question, choices) {
    choices.forEach(function (choice) {
      choice.addEventListener('click', function () {
        if (question.classList.contains('done')) return
        var correct = choice.hasAttribute('data-correct')
        marked += 1
        if (correct) right += 1
        choices.forEach(function (one) {
          if (one.hasAttribute('data-correct')) one.classList.add('correct')
        })
        choice.classList.add(correct ? 'picked' : 'wrong')
        reveal(question)
        tally()
      })
    })
  }

  // A reader who opens the answer without having tried,
  // finds it familiar and reads that as knowing it.
  // Somewhere to write is what makes the attempt happen.
  function askFirst(question) {
    var written = make('textarea', 'v-write')
    written.rows = 3
    written.placeholder = 'Answer it before you open it'
    var open = make('button', 'v-reveal', 'Show the answer')
    open.type = 'button'
    open.addEventListener('click', function () {
      written.disabled = true
      open.remove()
      reveal(question)
    })
    var answer = question.querySelector('.answer')
    question.insertBefore(written, answer)
    question.insertBefore(open, answer)
  }

  var count = make('span', 'v-tally')
  function tally() {
    count.textContent = marked === 0
      ? 'Nothing marked yet'
      : right + ' of ' + marked + ' right'
  }

  questions.forEach(function (question) {
    nameLevel(question)
    var choices = [].slice.call(question.querySelectorAll('.choice'))
    if (choices.length > 0) mark(question, choices)
    else if (question.querySelector('.answer')) askFirst(question)
  })

  function fits(question) {
    return wanted === 'all' || question.getAttribute('data-level') === wanted
  }

  // A chapter that asks nothing is prose, and prose is never narrowed away.
  // Narrowing is for choosing among questions, not for hiding what teaches.
  function keeps(chapter) {
    var held = asked(chapter)
    return held.length === 0 || held.some(fits)
  }

  function standing() {
    return chapters.filter(keeps)
  }

  var at = 0
  var where = make('span', 'v-where')
  var back = make('button', 'v-step', 'Back')
  var on = make('button', 'v-step', 'Next')
  back.type = 'button'
  on.type = 'button'
  var dots = make('div', 'v-dots')
  var paging = chapters.length > 1

  function draw() {
    var shown = standing()
    at = Math.max(0, Math.min(shown.length - 1, at))
    chapters.forEach(function (chapter) {
      var index = shown.indexOf(chapter)
      chapter.classList.toggle('away', index === -1)
      chapter.classList.toggle('offstage', paging && index !== -1 && index !== at)
    })
    if (!paging) return

    // The dots stand for the chapters a reader can still reach,
    // so narrowing shortens the row rather than leaving gaps in it.
    dots.textContent = ''
    shown.forEach(function (chapter, index) {
      var dot = make('button', 'v-dot')
      dot.type = 'button'
      // A heading is what a reader recognises a chapter by,
      // so it is what the dot is called rather than a number.
      var heading = chapter.querySelector('h2')
      dot.title = heading ? heading.textContent : 'Chapter ' + (index + 1)
      if (index === at) dot.classList.add('on')
      if (index < at) dot.classList.add('behind')
      dot.addEventListener('click', function () { go(index) })
      dots.appendChild(dot)
    })
    where.textContent = shown.length === 0
      ? 'Nothing at that level'
      : (at + 1) + ' of ' + shown.length
    back.disabled = at === 0
    on.disabled = at >= shown.length - 1
  }

  function go(next) {
    at = next
    draw()
    window.scrollTo(0, 0)
  }

  // Narrowing takes the reader to the first thing that survived it.
  // A control whose effect is a chapter below the fold has none a reader sees.
  function narrow(to) {
    wanted = to
    questions.forEach(function (question) {
      question.classList.toggle('away', !fits(question))
    })
    go(0)
  }

  // Narrowing is offered only where there is something to narrow to.
  // One level on every question is not a choice, it is a label.
  function levels() {
    var seen = []
    questions.forEach(function (question) {
      var level = question.getAttribute('data-level')
      if (level && LEVELS[level] && seen.indexOf(level) === -1) seen.push(level)
    })
    return seen
  }

  var top = make('div', 'v-top')
  var showing = levels()
  if (showing.length > 1) {
    var chips = make('div', 'v-chips')
    chips.appendChild(make('span', 'v-asks', 'Ask me'))
    var all = [{ id: 'all', label: 'Everything' }].concat(showing.map(function (id) {
      return { id: id, label: LEVELS[id] }
    }))
    all.forEach(function (one, index) {
      var chip = make('button', 'v-chip', one.label)
      chip.type = 'button'
      if (index === 0) chip.classList.add('on')
      chip.addEventListener('click', function () {
        var others = [].slice.call(chips.querySelectorAll('.v-chip'))
        others.forEach(function (other) { other.classList.remove('on') })
        chip.classList.add('on')
        narrow(one.id)
      })
      chips.appendChild(chip)
    })
    top.appendChild(chips)
  }
  if (questions.some(function (question) { return question.querySelector('.choice') })) {
    tally()
    top.appendChild(count)
  }
  if (top.children.length > 0) {
    document.body.insertBefore(top, document.body.firstChild)
    document.body.classList.add('has-top')
  }

  // One chapter is a page, not a sequence, so nothing is drawn to walk it.
  if (!paging) return

  back.addEventListener('click', function () { go(at - 1) })
  on.addEventListener('click', function () { go(at + 1) })

  var foot = make('div', 'v-foot')
  foot.appendChild(back)
  foot.appendChild(dots)
  foot.appendChild(where)
  foot.appendChild(on)
  document.body.appendChild(foot)
  document.body.classList.add('has-foot')

  // An arrow key while a reader is writing an answer belongs to the answer.
  document.addEventListener('keydown', function (event) {
    if (event.target && event.target.tagName === 'TEXTAREA') return
    if (event.key === 'ArrowRight') go(at + 1)
    if (event.key === 'ArrowLeft') go(at - 1)
  })

  go(0)
})()
</script>`
