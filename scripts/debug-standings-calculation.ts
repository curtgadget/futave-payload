import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'

async function debugStandingsCalculation() {
  const payload = await getPayload({ config })
  
  console.log('Debugging standings calculation...\n')
  
  try {
    // Get the match details
    const matches = await payload.find({
      collection: 'matches',
      limit: 1,
      where: {
        'wave_score.total': { greater_than: 30 }
      }
    })
    
    const match = matches.docs[0]
    const leagueId = typeof match.league_id === 'object' ? match.league_id.id : match.league_id
    
    console.log(`Match details:`)
    console.log(`- League ID type: ${typeof match.league_id}`)
    console.log(`- League ID value: ${JSON.stringify(match.league_id)}`)
    console.log(`- Resolved league ID: ${leagueId}`)
    console.log(`- Season ID: ${match.season_id}`)
    console.log(`- State ID: ${match.state_id}`)
    
    // Check what leagues exist
    console.log('\n=== AVAILABLE LEAGUES ===')
    const leagues = await payload.find({
      collection: 'leagues',
      where: {
        id: { equals: leagueId }
      },
      limit: 1
    })
    
    if (leagues.docs.length > 0) {
      const league = leagues.docs[0]
      console.log(`✅ League found: ${league.name} (ID: ${league.id})`)
      
      // Check current season
      if (league.currentseason) {
        const currentSeason = league.currentseason as any
        console.log(`Current season: ${currentSeason.name} (ID: ${currentSeason.id})`)
      } else {
        console.log('❌ No current season found')
      }
    } else {
      console.log(`❌ League ${leagueId} not found`)
      return
    }
    
    // Check matches for this league/season
    console.log('\n=== MATCHES QUERY ===')
    console.log(`Looking for matches with:`)
    console.log(`- league_id: ${leagueId}`)
    console.log(`- season_id: ${match.season_id}`)
    console.log(`- state_id in [5, 7] (finished matches)`)
    
    const allMatches = await payload.find({
      collection: 'matches',
      where: {
        and: [
          { league_id: { equals: leagueId } },
          { season_id: { equals: match.season_id } }
        ]
      },
      limit: 10
    })
    
    console.log(`\nTotal matches for league/season: ${allMatches.totalDocs}`)
    
    if (allMatches.docs.length > 0) {
      console.log('\nFirst few matches:')
      allMatches.docs.slice(0, 5).forEach((m, index) => {
        const participants = m.participants as any[]
        const home = participants?.find(p => p.meta?.location === 'home')
        const away = participants?.find(p => p.meta?.location === 'away')
        console.log(`${index + 1}. ${home?.name || 'TBD'} vs ${away?.name || 'TBD'} - State: ${m.state_id}`)
      })
      
      // Check finished matches specifically
      const finishedMatches = await payload.find({
        collection: 'matches',
        where: {
          and: [
            { league_id: { equals: leagueId } },
            { season_id: { equals: match.season_id } },
            { state_id: { in: [5, 7] } }
          ]
        },
        limit: 10
      })
      
      console.log(`\nFinished matches (state 5 or 7): ${finishedMatches.totalDocs}`)
      
      if (finishedMatches.docs.length > 0) {
        console.log('Sample finished matches:')
        finishedMatches.docs.slice(0, 3).forEach((m, index) => {
          const participants = m.participants as any[]
          const home = participants?.find(p => p.meta?.location === 'home')
          const away = participants?.find(p => p.meta?.location === 'away')
          const scores = m.scores as any[]
          console.log(`${index + 1}. ${home?.name} vs ${away?.name} - State: ${m.state_id}`)
          console.log(`   Scores available: ${scores?.length || 0}`)
        })
      } else {
        console.log('❌ No finished matches found!')
        console.log('\nPossible reasons:')
        console.log('1. All matches are upcoming (state_id not 5 or 7)')
        console.log('2. Season has ended and matches have different state')
        console.log('3. Different league/season combination needed')
        
        // Check what states are actually used
        console.log('\nActual state IDs in use:')
        const statesUsed = new Set()
        allMatches.docs.forEach(m => statesUsed.add(m.state_id))
        console.log(Array.from(statesUsed).sort())
      }
    } else {
      console.log('❌ No matches found for this league/season combination')
    }
    
    // Suggest solutions
    console.log('\n=== SOLUTIONS ===')
    console.log('1. If all matches are upcoming, the wave calculator should still work')
    console.log('2. If matches have different states, update the standings calculator')
    console.log('3. If this is the wrong league, check match.league data')
    console.log('4. Try a different league that has completed matches')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    process.exit(0)
  }
}

debugStandingsCalculation()