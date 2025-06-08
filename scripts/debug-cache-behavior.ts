import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { StandingsCalculator } from '../src/services/standings/calculator'

async function debugCacheBehavior() {
  const payload = await getPayload({ config })
  const standingsCalculator = new StandingsCalculator(payload)
  
  console.log('Debugging cache behavior...\n')
  
  try {
    // Check if there's any cached data in the league
    const league = await payload.findByID({
      collection: 'leagues',
      id: 271
    })
    
    console.log('League cached standings:')
    if (league.current_standings) {
      console.log(`- Season ID: ${league.current_standings.season_id}`)
      console.log(`- Last calculated: ${league.current_standings.last_calculated}`)
      console.log(`- Expires at: ${league.current_standings.expires_at}`)
      console.log(`- Total teams: ${league.current_standings.total_teams}`)
      console.log(`- Cache expired: ${new Date(league.current_standings.expires_at) < new Date()}`)
    } else {
      console.log('- No cached standings found')
    }
    
    // Test getCurrentTable
    console.log('\nTesting getCurrentTable...')
    const table = await standingsCalculator.getCurrentTable(271, 23584)
    
    if (table) {
      console.log(`✅ Got table with ${table.standings.length} teams`)
      console.log(`Season: ${table.season_id}`)
      console.log('Top 3 teams:')
      table.standings.slice(0, 3).forEach(team => {
        console.log(`  ${team.position}. ${team.team_name} - ${team.points}pts`)
      })
    } else {
      console.log('❌ No table returned')
    }
    
    // Test getTeamPosition for known teams
    console.log('\nTesting getTeamPosition...')
    const agfPosition = await standingsCalculator.getTeamPosition(2905, 271, 23584) // AGF
    const brondbyPosition = await standingsCalculator.getTeamPosition(293, 271, 23584) // Brøndby
    
    console.log('AGF position:', agfPosition)
    console.log('Brøndby position:', brondbyPosition)
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    process.exit(0)
  }
}

debugCacheBehavior()