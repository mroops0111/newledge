import { ONTOLOGY_ID } from '@newledge/ontology-knowledge'
import { SOURCE_LOADER_ID } from '@newledge/source-loader-web'

// Scaffold entry point. Will compose the braid server via composeApp() with both
// plugins registered, then run one web-search sync, extract, apply, and print the
// resulting graph.
function main(): void {
  console.log(`newledge cli (scaffold) — ontology=${ONTOLOGY_ID} loader=${SOURCE_LOADER_ID}`)
}

main()
