import { SportmonksPlayer } from '../../sportmonks/client/types'
import { createPlayerEndpoint } from '../../sportmonks/client/endpoints/player'
import { transformPlayer } from '../../sportmonks/transformers/player.transformer'
import { createSyncService } from '../base.sync'
import { SportmonksConfig } from '../../sportmonks/client/types'

export function createPlayerSync(config: SportmonksConfig) {
  const playerEndpoint = createPlayerEndpoint(config)

  // Fetch all players with debugging
  async function fetchAllPlayers() {
    console.log('Starting player fetch with pagination debugging enabled')

    // Sportmonks API returns 25 players per page regardless of per_page parameter
    const players = await playerEndpoint.getAll()
    console.log(`Total players fetched: ${players.length}`)

    return players
  }

  return createSyncService<SportmonksPlayer>({
    collection: 'players',
    fetchData: fetchAllPlayers,
    transformData: transformPlayer,
    batchSize: 100,
    concurrency: 10,
  })
}
