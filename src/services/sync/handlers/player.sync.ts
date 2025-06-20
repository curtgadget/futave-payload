import { SportmonksPlayer } from '../../sportmonks/client/types'
import { createPlayerEndpoint } from '../../sportmonks/client/endpoints/player'
import { transformPlayer } from '../../sportmonks/transformers/player.transformer'
import { createSyncService } from '../base.sync'
import { SportmonksConfig } from '../../sportmonks/client/types'
import { getPayload } from 'payload'
import config from '@/payload.config'

export type PlayerSyncOptions = {
  incremental?: boolean // Enable incremental sync based on updated_at
  lastSyncHours?: number // Hours to look back for incremental sync (default: 24)
}

export function createPlayerSync(sportmonksConfig: SportmonksConfig, options: PlayerSyncOptions = {}) {
  const playerEndpoint = createPlayerEndpoint(sportmonksConfig)

  // Fetch players with optional incremental sync
  async function fetchPlayers() {
    const isIncremental = options.incremental && options.lastSyncHours
    
    if (isIncremental) {
      console.log(`Starting incremental player fetch (last ${options.lastSyncHours} hours)`)
      
      // Calculate date filter for incremental sync
      const cutoffDate = new Date()
      cutoffDate.setHours(cutoffDate.getHours() - (options.lastSyncHours || 24))
      const dateFilter = cutoffDate.toISOString().split('T')[0] // YYYY-MM-DD format
      
      console.log(`Fetching players updated since: ${dateFilter}`)
      
      // Note: Sportmonks may not support updated_at filtering for players
      // This is a placeholder for when/if they add this feature
      try {
        const players = await playerEndpoint.getAll({
          filters: {
            updated_at: `>=${dateFilter}`
          }
        })
        console.log(`Total players fetched (incremental): ${players.length}`)
        return players
      } catch (error) {
        console.warn('Incremental sync failed, falling back to full sync:', error)
        return fetchAllPlayers()
      }
    } else {
      return fetchAllPlayers()
    }
  }

  // Fetch all players with debugging (full sync)
  async function fetchAllPlayers() {
    console.log('Starting full player fetch with pagination debugging enabled')
    console.log('Fetching all players with optimized pagination')
    console.log('Using up to 1000 results per page to minimize API calls')

    // Fetch all players using optimized pagination
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
    fetchData: fetchPlayers, // Use the new function that supports incremental sync
    transformData: transformPlayer,
    batchSize: 100, // Optimized batch size for database operations
    concurrency: 10,
  })
}
