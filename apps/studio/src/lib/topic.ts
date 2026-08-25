/**
 * A topic, drawn as the ground its cards stand on rather than as a card.
 * The section's id is the topic's own with a mark on it,
 * so a section standing for a topic can be told from one a reader drew,
 * and the topic can be read back out of it.
 */
const TOPIC = 'topic-'

/** The id of the section a topic is drawn as. */
export function sectionOf(topicId: string): string {
  return `${TOPIC}${topicId}`
}

/** The topic a section stands for, or nothing when it stands for none. */
export function topicOf(sectionId: string): string | undefined {
  return sectionId.startsWith(TOPIC) ? sectionId.slice(TOPIC.length) : undefined
}
