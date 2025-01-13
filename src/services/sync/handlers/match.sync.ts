import { SportmonksMatch } from '../../sportmonks/client/types'
import { createMatchesEndpoint } from '../../sportmonks/client/endpoints/matches'
import { transformMatch } from '../../sportmonks/transformers/match.transformer'
import { createSyncService } from '../base.sync'
import { SportmonksConfig } from '../../sportmonks/client/types'

export function createMatchSync(config: SportmonksConfig) {
  const matchesEndpoint = createMatchesEndpoint(config)

  return createSyncService<SportmonksMatch>({
    collection: 'matches',
    fetchData: () => matchesEndpoint.getAll(),
    transformData: transformMatch,
    batchSize: 10,
  })
}
