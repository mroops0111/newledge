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

/**
 * What each level is called where a reader sees it, rather than in markup,
 * and what it means, for the reader who does not already know the word.
 */
const NAMED_LEVELS = JSON.stringify(
  Object.fromEntries(LEVELS.map(level => [level.id, [level.label, level.why]])),
)

/**
 * The behaviour a view is given, which is one script for every form.
 *
 * Written against the classes the reference offers and nothing else,
 * so a page that uses none of them is left exactly as it arrived,
 * which is what a handbook wants and why it opts in by writing no chapter.
 */
export const VIEW_BEHAVIOUR: string = `<script>
(function () {
  var LEVELS = ${NAMED_LEVELS}
  var questions = [].slice.call(document.querySelectorAll('.question'))
  var chapters = [].slice.call(document.querySelectorAll('section.chapter'))
  var marked = 0
  var right = 0

  function make(tag, className, text) {
    var node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
  }

  // A question says what it tests in markup,
  // and the reader is told in words, since the attribute is not for them.
  function nameLevel(question) {
    var level = LEVELS[question.getAttribute('data-level')]
    if (!level) return
    var badge = make('span', 'v-level', level[0])
    badge.title = level[1]
    question.insertBefore(badge, question.firstChild)
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

  // A score is drawn once there is one.
  // A counter reading "nothing yet" tells a reader who has answered nothing,
  // that they have answered nothing, in a corner they have to work out first.
  var count = make('span', 'v-tally')
  var top = make('div', 'v-top')
  function tally() {
    if (marked === 0) return
    count.textContent = right + ' of ' + marked + ' right'
    if (count.parentNode === null) {
      top.appendChild(count)
      document.body.insertBefore(top, document.body.firstChild)
      document.body.classList.add('has-top')
    }
  }

  questions.forEach(function (question) {
    nameLevel(question)
    var choices = [].slice.call(question.querySelectorAll('.choice'))
    if (choices.length > 0) mark(question, choices)
    else if (question.querySelector('.answer')) askFirst(question)
  })

  var at = 0
  var where = make('span', 'v-where')
  var back = make('button', 'v-step', 'Back')
  var on = make('button', 'v-step', 'Next')
  back.type = 'button'
  on.type = 'button'
  var dots = make('div', 'v-dots')
  var paging = chapters.length > 1

  function draw() {
    var shown = chapters
    at = Math.max(0, Math.min(shown.length - 1, at))
    chapters.forEach(function (chapter) {
      var index = shown.indexOf(chapter)
      chapter.classList.toggle('offstage', paging && index !== at)
    })
    if (!paging) return

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
    where.textContent = (at + 1) + ' of ' + shown.length
    back.disabled = at === 0
    on.disabled = at >= shown.length - 1
  }

  function go(next) {
    at = next
    draw()
    window.scrollTo(0, 0)
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
