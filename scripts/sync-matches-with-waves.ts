import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { createMatchSyncWithWaveScore } from '../src/services/sync/handlers/matchWithWaveScore.sync'

async function syncMatchesWithWaves() {
  const payload = await getPayload({ config })
  
  // Get date range (next 14 days)
  const startDate = new Date().toISOString().split('T')[0]
  const endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  
  console.log(`Syncing matches from ${startDate} to ${endDate} with wave scores...`)
  
  const apiConfig = {
    apiKey: process.env.SPORTMONKS_API_KEY || '',
    baseUrl: process.env.SPORTMONKS_BASE_URL,
  }
  
  const matchSync = createMatchSyncWithWaveScore(
    apiConfig,
    payload,
    startDate,
    endDate,
    {
      calculateWaveScores: true,
      onlyFutureMatches: true,
      maxDaysAhead: 14
    }
  )
  
  try {
    const result = await matchSync.sync()
    console.log('\nSync completed!')
    console.log(`Created: ${result.stats.created}`)
    console.log(`Updated: ${result.stats.updated}`)
    console.log(`Failed: ${result.stats.failed}`)
    if (result.stats.errors.length > 0) {
      console.log('\nErrors:')
      result.stats.errors.forEach(error => console.log(error))
    }
  } catch (error) {
    console.error('Sync failed:', error)
  } finally {
    process.exit(0)
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
if (args.includes('--help')) {
  console.log(`
Usage: pnpm tsx scripts/sync-matches-with-waves.ts

This script syncs matches for the next 14 days and calculates wave scores for each match.

Options:
  --help    Show this help message
`)
  process.exit(0)
}

// Run the sync
syncMatchesWithWaves()