import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { createMatchSyncByRange } from '../src/services/sync/handlers/match.sync'
import { createMatchSyncWithWaveScore } from '../src/services/sync/handlers/matchWithWaveScore.sync'

async function syncLastMonth() {
  const payload = await getPayload({ config })
  
  // Get last month's date range (May 2025)
  const startDate = '2025-05-01'
  const endDate = '2025-05-31'
  
  console.log(`Syncing matches from ${startDate} to ${endDate}...`)
  
  const apiConfig = {
    apiKey: process.env.SPORTMONKS_API_KEY || '',
    baseUrl: process.env.SPORTMONKS_BASE_URL,
  }
  
  // Use regular sync for past matches (no wave scores needed for past matches)
  const matchSync = createMatchSyncByRange(apiConfig, startDate, endDate)
  
  try {
    console.log('Starting match sync for May 2025...')
    const result = await matchSync.sync()
    
    console.log('\nSync completed!')
    console.log(`Created: ${result.stats.created}`)
    console.log(`Updated: ${result.stats.updated}`)
    console.log(`Failed: ${result.stats.failed}`)
    
    if (result.stats.errors && result.stats.errors.length > 0) {
      console.log('\nErrors:')
      result.stats.errors.forEach((error: any) => console.log(error))
    }
    
    // Check what we got
    if (result.stats.created > 0 || result.stats.updated > 0) {
      console.log('\nChecking synced matches...')
      const matches = await payload.find({
        collection: 'matches',
        where: {
          starting_at: {
            greater_than_equal: startDate + 'T00:00:00.000Z',
            less_than_equal: endDate + 'T23:59:59.999Z'
          }
        },
        sort: '-starting_at',
        limit: 10
      })
      
      console.log(`\nFound ${matches.totalDocs} matches in May 2025`)
      
      if (matches.docs.length > 0) {
        console.log('\nSample matches:')
        matches.docs.forEach((match: any) => {
          const participants = match.participants as any[]
          const home = participants?.find(p => p.meta?.location === 'home')
          const away = participants?.find(p => p.meta?.location === 'away')
          const date = new Date(match.starting_at).toLocaleDateString()
          console.log(`- ${home?.name || 'TBD'} vs ${away?.name || 'TBD'} on ${date}`)
        })
        
        // Now let's sync any upcoming matches with wave scores
        console.log('\n\nChecking for upcoming matches to calculate wave scores...')
        const today = new Date().toISOString().split('T')[0]
        const futureEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        
        const waveSync = createMatchSyncWithWaveScore(
          apiConfig,
          payload,
          today,
          futureEnd,
          {
            calculateWaveScores: true,
            onlyFutureMatches: true,
            maxDaysAhead: 30
          }
        )
        
        const waveResult = await waveSync.sync()
        console.log(`\nWave scores calculated for ${waveResult.stats.updated} future matches`)
      }
    } else {
      console.log('\nNo matches found for May 2025. This could mean:')
      console.log('1. The season has ended (May is typically end of season)')
      console.log('2. The API subscription might not include this data')
      console.log('3. Try a different month (e.g., April 2025 or March 2025)')
    }
    
  } catch (error) {
    console.error('Sync failed:', error)
  } finally {
    process.exit(0)
  }
}

// Run the sync
syncLastMonth()