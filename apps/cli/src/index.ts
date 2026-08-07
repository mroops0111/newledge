import { ONTOLOGY_ID } from '@newledge/ontology-knowledge'
import { SOURCE_LOADER_ID } from '@newledge/source-loader-web'

// M0 CLI scaffold. Issue #10 fills this in: compose the braid server via
// composeApp() with both plugins registered, scaffold one workspace under
// ontologyId 'knowledge', run one web-search sync -> extract -> apply, and
// print the resulting graph.
function main(): void {
  console.log(`newledge cli (scaffold) — ontology=${ONTOLOGY_ID} loader=${SOURCE_LOADER_ID}`)
}

main()
