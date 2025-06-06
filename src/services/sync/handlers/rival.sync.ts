import { SportmonksRival } from '../../sportmonks/client/types'
import { createRivalsEndpoint } from '../../sportmonks/client/endpoints/rivals'
import { transformRival } from '../../sportmonks/transformers/rival.transformer'
import { createSyncService } from '../base.sync'
import { SportmonksConfig } from '../../sportmonks/client/types'

export function createRivalSync(config: SportmonksConfig) {
  const rivalsEndpoint = createRivalsEndpoint(config)

  async function fetchRivals(): Promise<SportmonksRival[]> {
    return rivalsEndpoint.getAll()
  }

  return createSyncService<SportmonksRival>({
    collection: 'rivals',
    fetchData: fetchRivals,
    transformData: transformRival,
  })
}