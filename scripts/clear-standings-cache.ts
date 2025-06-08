import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'

async function clearStandingsCache() {
  const payload = await getPayload({ config })
  
  console.log('Clearing standings cache...\n')
  
  try {
    // Clear the cache for Danish Superliga
    await payload.update({
      collection: 'leagues',
      id: 271,
      data: {
        current_standings: {
          table: [],
          season_id: null,
          last_calculated: null,
          expires_at: new Date(0).toISOString(), // Force expiry
          total_teams: 0
        }
      }
    })
    
    console.log('✅ Standings cache cleared for league 271')
    
  } catch (error) {
    console.error('Error clearing cache:', error)
  } finally {
    process.exit(0)
  }
}

clearStandingsCache()