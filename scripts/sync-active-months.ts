import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { createMatchSyncByRange } from '../src/services/sync/handlers/match.sync'

async function syncActiveMonths() {
  const payload = await getPayload({ config })
  
  const apiConfig = {
    apiKey: process.env.SPORTMONKS_API_KEY || '',
    baseUrl: process.env.SPORTMONKS_BASE_URL,
  }
  
  // Try multiple months that typically have matches
  const monthsToTry = [
    { name: 'May 2025', start: '2025-05-01', end: '2025-05-31' },
    { name: 'April 2025', start: '2025-04-01', end: '2025-04-30' },
    { name: 'March 2025', start: '2025-03-01', end: '2025-03-31' },
    { name: 'February 2025', start: '2025-02-01', end: '2025-02-28' },
  ]
  
  let totalCreated = 0
  let totalUpdated = 0
  
  for (const month of monthsToTry) {
    console.log(`\nTrying ${month.name}...`)
    
    const matchSync = createMatchSyncByRange(apiConfig, month.start, month.end)
    
    try {
      const result = await matchSync.sync()
      
      console.log(`${month.name} results:`)
      console.log(`- Created: ${result.stats.created}`)
      console.log(`- Updated: ${result.stats.updated}`)
      
      totalCreated += result.stats.created
      totalUpdated += result.stats.updated
      
      // If we found matches, show some examples
      if (result.stats.created > 0) {
        const matches = await payload.find({
          collection: 'matches',
          where: {
            starting_at: {
              greater_than_equal: month.start + 'T00:00:00.000Z',
              less_than_equal: month.end + 'T23:59:59.999Z'
            }
          },
          limit: 3,
          sort: '-starting_at'
        })
        
        if (matches.docs.length > 0) {
          console.log(`Sample matches from ${month.name}:`)
          matches.docs.forEach((match: any) => {
            const participants = match.participants as any[]
            const home = participants?.find(p => p.meta?.location === 'home')
            const away = participants?.find(p => p.meta?.location === 'away')
            const date = new Date(match.starting_at).toLocaleDateString()
            console.log(`  - ${home?.name || 'TBD'} vs ${away?.name || 'TBD'} on ${date}`)
          })
        }
        
        // If we found enough matches, we can stop
        if (totalCreated >= 50) {
          console.log('\nFound sufficient matches for testing!')
          break
        }
      }
    } catch (error) {
      console.error(`Error syncing ${month.name}:`, error)
    }
  }
  
  console.log('\n=== FINAL SUMMARY ===')
  console.log(`Total matches created: ${totalCreated}`)
  console.log(`Total matches updated: ${totalUpdated}`)
  
  if (totalCreated > 0) {
    // Now let's manually calculate wave scores for some recent matches as a demo
    console.log('\n\nCalculating demo wave scores for testing...')
    
    const matches = await payload.find({
      collection: 'matches',
      limit: 10,
      sort: '-starting_at'
    })
    
    console.log(`\nTotal matches in database: ${matches.totalDocs}`)
    console.log('You can now test the wave API at: http://localhost:3000/api/v1/matches/waves')
  } else {
    console.log('\nNo matches were synced. Possible reasons:')
    console.log('1. These months might be in the off-season')
    console.log('2. Your API subscription might have limitations')
    console.log('3. Try syncing from an earlier season (2024-25 or 2023-24)')
  }
  
  process.exit(0)
}

// Run the sync
syncActiveMonths()