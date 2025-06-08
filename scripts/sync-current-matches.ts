import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { createMatchSyncWithWaveScore } from '../src/services/sync/handlers/matchWithWaveScore.sync'

async function syncCurrentMatches() {
  const payload = await getPayload({ config })
  
  // Let's try to fetch matches from 30 days ago to 30 days ahead
  // This should capture current/recent matches
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const thirtyDaysAhead = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  
  const startDate = thirtyDaysAgo.toISOString().split('T')[0]
  const endDate = thirtyDaysAhead.toISOString().split('T')[0]
  
  console.log(`Syncing matches from ${startDate} to ${endDate}...`)
  console.log('This covers 30 days in the past and 30 days in the future')
  
  const apiConfig = {
    apiKey: process.env.SPORTMONKS_API_KEY || '',
    baseUrl: process.env.SPORTMONKS_BASE_URL,
  }
  
  // First, let's sync without wave scores to get the matches
  console.log('\nPhase 1: Syncing match data...')
  const matchSync = createMatchSyncWithWaveScore(
    apiConfig,
    payload,
    startDate,
    endDate,
    {
      calculateWaveScores: false, // First pass without wave scores
      onlyFutureMatches: false,
      maxDaysAhead: 30
    }
  )
  
  try {
    const result = await matchSync.sync()
    console.log('\nSync completed!')
    console.log(`Created: ${result.stats.created}`)
    console.log(`Updated: ${result.stats.updated}`)
    console.log(`Failed: ${result.stats.failed}`)
    
    if (result.stats.created > 0 || result.stats.updated > 0) {
      console.log('\nPhase 2: Calculating wave scores for future matches...')
      
      // Now calculate wave scores for future matches only
      const waveSync = createMatchSyncWithWaveScore(
        apiConfig,
        payload,
        new Date().toISOString().split('T')[0], // From today
        endDate,
        {
          calculateWaveScores: true,
          onlyFutureMatches: true,
          maxDaysAhead: 30
        }
      )
      
      const waveResult = await waveSync.sync()
      console.log('\nWave score calculation completed!')
      console.log(`Updated with wave scores: ${waveResult.stats.updated}`)
    }
    
    // Test the wave API
    console.log('\nTesting Wave API...')
    const matches = await payload.find({
      collection: 'matches',
      where: {
        'wave_score.total': { exists: true }
      },
      sort: '-wave_score.total',
      limit: 5
    })
    
    if (matches.docs.length > 0) {
      console.log(`\nTop ${matches.docs.length} matches by wave score:`)
      matches.docs.forEach((match: any, index: number) => {
        const participants = match.participants as any[]
        const home = participants?.find(p => p.meta?.location === 'home')
        const away = participants?.find(p => p.meta?.location === 'away')
        console.log(`${index + 1}. ${home?.name || 'TBD'} vs ${away?.name || 'TBD'} - Score: ${match.wave_score.total} (${match.wave_score.tier})`)
      })
    } else {
      console.log('\nNo matches with wave scores found.')
    }
    
  } catch (error) {
    console.error('Sync failed:', error)
  } finally {
    process.exit(0)
  }
}

// Run the sync
syncCurrentMatches()