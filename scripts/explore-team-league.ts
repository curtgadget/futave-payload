import { getPayload } from 'payload'
import config from '../src/payload.config'

async function exploreTeamLeague() {
  const payload = await getPayload({ config })

  try {
    // Find a team with seasons data
    const team = await payload.db.findOne({
      collection: 'teams',
      where: {
        seasons: { exists: true }
      }
    })

    if (team) {
      console.log('Team:', team.name)
      console.log('Team ID:', team.id)
      
      if (team.seasons && Array.isArray(team.seasons)) {
        console.log('\nSeasons count:', team.seasons.length)
        console.log('First season:', JSON.stringify(team.seasons[0], null, 2))
      }
      
      if (team.activeseasons && Array.isArray(team.activeseasons)) {
        console.log('\nActive seasons count:', team.activeseasons.length)
        console.log('First active season:', JSON.stringify(team.activeseasons[0], null, 2))
      }
      
      if (team.season_map) {
        console.log('\nSeason map:', JSON.stringify(team.season_map, null, 2))
      }
    } else {
      console.log('No team found with seasons data')
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    process.exit(0)
  }
}

exploreTeamLeague()