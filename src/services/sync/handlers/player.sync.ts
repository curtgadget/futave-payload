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
    console.log('NOTE: Increased pagination limit to 1000 pages (up from 100)')
    console.log('This allows fetching up to 25,000 players (25 per page × 1000 pages)')

    // Sportmonks API returns 25 players per page regardless of per_page parameter
    const players = await playerEndpoint.getAll()
    console.log(`Total players fetched: ${players.length}`)

    if (players.length === 2500) {
      console.warn(
        'EXACTLY 2500 players fetched - this might indicate we hit the old pagination limit',
      )
      console.warn('Check if the increased pagination limit is working correctly')
    }

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
