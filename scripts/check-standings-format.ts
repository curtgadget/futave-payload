import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'

async function checkStandingsFormat() {
  const payload = await getPayload({ config })
  
  console.log('Checking standings data format...\n')
  
  try {
    // Get a team with standings
    const teams = await payload.find({
      collection: 'teams',
      where: {
        'standings': { exists: true }
      },
      limit: 3
    })
    
    if (teams.docs.length === 0) {
      console.log('No teams with standings found!')
      process.exit(1)
    }
    
    teams.docs.forEach((team, index) => {
      console.log(`=== TEAM ${index + 1}: ${team.name} ===`)
      console.log('Standings data structure:')
      console.log('Type:', typeof team.standings)
      console.log('Is Array:', Array.isArray(team.standings))
      
      if (team.standings) {
        console.log('Full standings object:')
        console.log(JSON.stringify(team.standings, null, 2))
        
        // Try to extract position data
        let standingData: any
        if (Array.isArray(team.standings)) {
          standingData = team.standings[0]
        } else {
          standingData = team.standings
        }
        
        if (standingData) {
          console.log('\nExtracted data:')
          console.log('- Position:', standingData.position || 'N/A')
          console.log('- Form:', standingData.form || 'N/A')
          console.log('- Points:', standingData.points || 'N/A')
          console.log('- Total teams:', standingData.total || 'N/A')
        }
      }
      console.log('\n' + '='.repeat(50) + '\n')
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    process.exit(0)
  }
}

checkStandingsFormat()