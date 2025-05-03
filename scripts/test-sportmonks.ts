import { createSportmonksClient } from '../src/services/sportmonks/client'
import { SPORTMONKS_FOOTBALL_BASE_URL } from '../src/constants/api'
import { SportmonksPlayer } from '../src/services/sportmonks/client/types'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

async function testPagination() {
  console.log('Starting Sportmonks API test...')

  const apiKey = process.env.SPORTMONKS_API_KEY || ''
  if (!apiKey) {
    console.error('No API key found. Please set SPORTMONKS_API_KEY environment variable.')
    process.exit(1)
  }

  const client = createSportmonksClient({
    apiKey,
    baseUrl: process.env.SPORTMONKS_BASE_URL || SPORTMONKS_FOOTBALL_BASE_URL,
  })

  console.log('Fetching players with pagination...')
  try {
    const allPlayers = await client.fetchAllPages<SportmonksPlayer>('/players', {
      include: 'teams;nationality;position',
    })

    console.log('-------------------------------------------')
    console.log(`✅ Total players fetched: ${allPlayers.length}`)
    console.log('-------------------------------------------')

    // Show a sample of the first few players
    if (allPlayers.length > 0) {
      console.log('Sample player data:')
      const sample = allPlayers.slice(0, 3)
      sample.forEach((player: SportmonksPlayer, index) => {
        console.log(`Player ${index + 1}:`, {
          id: player.id,
          name: player.name,
        })
      })
    }

    // Log unique player IDs to ensure we're not getting duplicates
    const uniqueIds = new Set(allPlayers.map((p: SportmonksPlayer) => p.id))
    console.log(`Unique player IDs count: ${uniqueIds.size}`)

    if (uniqueIds.size !== allPlayers.length) {
      console.warn('⚠️ Warning: Duplicate player IDs found in the results!')
    }
  } catch (error) {
    console.error('Error testing Sportmonks API:', error)
  }
}

// Run the test
testPagination()
  .then(() => console.log('Test completed.'))
  .catch((err) => console.error('Error in test:', err))
  .finally(() => process.exit(0))
