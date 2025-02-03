import { SportmonksMetadataType } from '../../sportmonks/client/types'
import { createMetadataTypesEndpoint } from '../../sportmonks/client/endpoints/metadataTypes'
import { transformMetadataType } from '../../sportmonks/transformers/metadataType.transformer'
import { createSyncService } from '../base.sync'
import { SportmonksConfig } from '../../sportmonks/client/types'

export function createMetadataTypeSync(config: SportmonksConfig) {
  const metadataTypesEndpoint = createMetadataTypesEndpoint(config)

  return createSyncService<SportmonksMetadataType>({
    collection: 'metadata-types',
    fetchData: () => metadataTypesEndpoint.getAll(),
    transformData: transformMetadataType,
  })
}
