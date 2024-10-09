/**
 * `cite` completions based on reference keys in the project
 */
import { CompletionContext } from '@codemirror/autocomplete'
import { Completions } from './types'
import { metadataState } from '../../../extensions/language'
import { extendRequiredParameter } from './apply'

export function buildReferenceCompletions(
  completions: Completions,
  context: CompletionContext
) {
  const metadata = context.state.field(metadataState, false)

  if (!metadata) {
    return
  }

  for (const referenceKey of metadata.referenceKeys) {
    completions.references.push({
      type: 'reference',
      label: referenceKey,
      extend: extendRequiredParameter,
      deduplicate: {
        key: referenceKey,
        priority: 1,
      },
    })
  }
}
