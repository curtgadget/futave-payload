import { SportmonksPlayer } from '../../sportmonks/client/types'
import { createPlayerEndpoint } from '../../sportmonks/client/endpoints/player'
import { transformPlayer } from '../../sportmonks/transformers/player.transformer'
import { createSyncService } from '../base.sync'
import { SportmonksConfig } from '../../sportmonks/client/types'

export function createPlayerSync(config: SportmonksConfig) {
  const playerEndpoint = createPlayerEndpoint(config)

  return createSyncService<SportmonksPlayer>({
    collection: 'players',
    fetchData: () => playerEndpoint.getAll(),
    transformData: transformPlayer,
  })
}
