import { getPayload } from 'payload'
import config from '../src/payload.config'

async function testPlayerTeamNames() {
  const payload = await getPayload({ config })

  try {
    // Find a player with statistics
    const player = await payload.db.findOne({
      collection: 'players',
      where: {
        'statistics.0': { exists: true }
      }
    })

    if (!player) {
      console.log('No players with statistics found in the database')
      return
    }

    console.log('Found player:', player.name)
    console.log('Player ID:', player._id || player.id)
    
    if (player.statistics && player.statistics.length > 0) {
      const recentStat = player.statistics[0]
      console.log('\nStatistics team_id:', recentStat.team_id)
      
      // Try to fetch the team
      const team = await payload.db.findOne({
        collection: 'teams',
        where: { _id: { equals: recentStat.team_id } }
      })
      
      if (team) {
        console.log('Team found:', team.name)
        console.log('Team ID:', team._id || team.id)
      } else {
        console.log('Team not found for team_id:', recentStat.team_id)
        
        // Try with id field instead
        const teamById = await payload.db.findOne({
          collection: 'teams',
          where: { id: { equals: recentStat.team_id } }
        })
        
        if (teamById) {
          console.log('Team found using id field:', teamById.name)
        }
      }
    }
    
    // Test the API endpoint
    console.log('\n--- Testing API endpoint ---')
    const apiUrl = `http://localhost:3001/api/v1/players/${player._id || player.id}`
    console.log('Fetching:', apiUrl)
    
    const response = await fetch(apiUrl)
    if (response.ok) {
      const data = await response.json()
      console.log('\nCurrent team stats:', JSON.stringify(data.current_team_stats, null, 2))
    } else {
      console.log('API Error:', response.status, response.statusText)
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    process.exit(0)
  }
}

testPlayerTeamNames()