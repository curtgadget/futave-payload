import { getPayload } from 'payload'
import config from '../src/payload.config'

async function investigatePlayerStats() {
  const payload = await getPayload({ config })

  try {
    // Fetch player 758
    const player = await payload.db.findOne({
      collection: 'players',
      where: { _id: { equals: 758 } }
    })

    if (!player) {
      console.log('Player 758 not found')
      return
    }

    console.log('Player:', player.name)
    console.log('Player ID:', player._id || player.id)
    
    if (player.statistics && player.statistics.length > 0) {
      console.log('\n=== Player Statistics ===')
      console.log('Number of season records:', player.statistics.length)
      
      // Get the most recent season
      const recentStat = player.statistics.sort((a: any, b: any) => b.season_id - a.season_id)[0]
      console.log('\nMost recent season:', recentStat.season_id)
      console.log('Team ID:', recentStat.team_id)
      console.log('Jersey number:', recentStat.jersey_number)
      
      console.log('\n=== Available Statistics (type_id : value) ===')
      recentStat.details.forEach((detail: any) => {
        console.log(`Type ID ${detail.type_id}: ${JSON.stringify(detail.value)}`)
      })
      
      // Look for different appearance-related stats
      const appearanceRelated = recentStat.details.filter((detail: any) => 
        detail.type_id >= 320 && detail.type_id <= 330
      )
      
      console.log('\n=== Appearance-related stats (320-330) ===')
      appearanceRelated.forEach((detail: any) => {
        console.log(`Type ID ${detail.type_id}: ${JSON.stringify(detail.value)}`)
      })
      
      // Look specifically at the 322 stat we're using
      const appearanceStat = recentStat.details.find((detail: any) => detail.type_id === 322)
      if (appearanceStat) {
        console.log('\n=== Current Appearances Stat (type_id 322) ===')
        console.log('Raw value:', JSON.stringify(appearanceStat.value, null, 2))
        console.log('Total appearances we use:', appearanceStat.value?.total || 0)
      }
      
      // Check if there are substitution-related stats
      const allStats = recentStat.details.map((detail: any) => ({
        type_id: detail.type_id,
        value: detail.value
      }))
      
      console.log('\n=== All Statistics ===')
      allStats.forEach((stat: any) => {
        console.log(`${stat.type_id}: ${JSON.stringify(stat.value)}`)
      })
      
    } else {
      console.log('No statistics found for this player')
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    process.exit(0)
  }
}

investigatePlayerStats()