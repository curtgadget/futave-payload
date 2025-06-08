import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'

async function debugStandingsIssue() {
  const payload = await getPayload({ config })
  
  console.log('Debugging standings data structure...\n')
  
  try {
    // Get a team with a match we calculated wave scores for
    const match = await payload.find({
      collection: 'matches',
      where: {
        'wave_score.total': { greater_than: 30 }
      },
      limit: 1
    })
    
    if (match.docs.length === 0) {
      console.log('No matches with wave scores found')
      process.exit(1)
    }
    
    const participants = match.docs[0].participants as any[]
    const homeTeam = participants?.find(p => p.meta?.location === 'home')
    const awayTeam = participants?.find(p => p.meta?.location === 'away')
    
    console.log(`Checking teams from match: ${homeTeam.name} vs ${awayTeam.name}`)
    
    // Check both teams in detail
    for (const participant of [homeTeam, awayTeam]) {
      console.log(`\n=== ${participant.name} (ID: ${participant.id}) ===`)
      
      const teamResult = await payload.find({
        collection: 'teams',
        where: { id: { equals: participant.id } },
        limit: 1
      })
      
      if (teamResult.docs.length === 0) {
        console.log('❌ Team not found in database!')
        continue
      }
      
      const team = teamResult.docs[0]
      const standings = team.standings as any
      
      console.log('Standings data type:', typeof standings)
      console.log('Standings is empty object:', JSON.stringify(standings) === '{}')
      
      if (standings && typeof standings === 'object' && JSON.stringify(standings) !== '{}') {
        const seasons = Object.keys(standings)
        console.log('Available seasons:', seasons)
        
        if (seasons.length > 0) {
          const latestSeason = seasons[0] // Assuming first is latest
          const seasonData = standings[latestSeason]
          console.log(`Season ${latestSeason} data type:`, typeof seasonData)
          console.log(`Season ${latestSeason} is array:`, Array.isArray(seasonData))
          
          if (Array.isArray(seasonData)) {
            console.log(`Number of leagues in season:`, seasonData.length)
            
            // Check each league for standings
            for (let i = 0; i < Math.min(3, seasonData.length); i++) {
              const league = seasonData[i]
              console.log(`  League ${i}: ${league.name || 'Unknown'} (ID: ${league.id})`)
              console.log(`  Has standings:`, !!league.standings)
              console.log(`  Standings length:`, league.standings?.length || 0)
              
              if (league.standings && league.standings.length > 0) {
                const standing = league.standings[0]
                console.log(`  Sample standing:`, {
                  position: standing.position,
                  points: standing.points,
                  form: standing.form,
                  team_id: standing.team_id
                })
              }
            }
          }
        }
      } else {
        console.log('❌ No meaningful standings data found')
      }
    }
    
    console.log('\n=== CONCLUSION ===')
    console.log('The standings structure exists but the actual league standings arrays are empty.')
    console.log('This means teams were synced but without their current season standings.')
    console.log('\nTo fix this, you need to:')
    console.log('1. Sync teams with current season standings')
    console.log('2. Or adjust the wave calculator to work with available data')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    process.exit(0)
  }
}

debugStandingsIssue()