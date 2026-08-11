/**
 * The web source loader id.
 *
 * A scaffold placeholder. The loader is a pure provisioner: its `sync()` runs
 * the web search and writes the fetched pages as files, and it never touches the
 * Knowledge Graph. Turning those files into typed, deduped knowledge is a
 * separate concern handled downstream by an extract skill that can read the
 * existing graph and dedupe against it.
 */
export const SOURCE_LOADER_ID = 'web' as const
