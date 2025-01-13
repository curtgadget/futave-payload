import { SportmonksLeague } from '../../sportmonks/client/types'
import { createLeaguesEndpoint } from '../../sportmonks/client/endpoints/leagues'
import { transformLeague } from '../../sportmonks/transformers/league.transformer'
import { createSyncService } from '../base.sync'
import { SportmonksConfig } from '../../sportmonks/client/types'

export function createLeagueSync(config: SportmonksConfig) {
  const leaguesEndpoint = createLeaguesEndpoint(config)

  return createSyncService<SportmonksLeague>({
    collection: 'leagues',
    fetchData: () => leaguesEndpoint.getAll(),
    transformData: transformLeague,
    batchSize: 10,
  })
}
