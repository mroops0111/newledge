// @newledge/source-loader-web — braid source loader (bucket B).
//
// Scaffold placeholder. The real loader lands in issue #8: it implements braid's
// SourceLoaderPlugin, and its sync() calls the Python web_search agent (retrieval)
// and writes the fetched pages as markdown files into `destination`.
//
// Contract: a loader is a pure provisioner. It MUST NOT touch the Knowledge Graph —
// it only writes files. Knowledge extraction happens later in the extract skill (#9),
// which is the step that can see the existing graph and dedupe against it.

export const SOURCE_LOADER_ID = 'web' as const
