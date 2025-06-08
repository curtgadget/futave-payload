import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'

async function quickStandingsTest() {
  const payload = await getPayload({ config })
  
  console.log('Quick standings test...\n')
  
  try {
    // Check what state IDs exist in matches
    console.log('=== CHECKING MATCH STATES ===')
    
    // Get all matches and manually aggregate state IDs
    const allMatches = await payload.find({
      collection: 'matches',
      limit: 10000 // Get many matches to see all states
    })
    
    const stateCount = new Map<number, number>()
    allMatches.docs.forEach(match => {
      const stateId = match.state_id
      stateCount.set(stateId, (stateCount.get(stateId) || 0) + 1)
    })
    
    const sortedStates = Array.from(stateCount.entries()).sort((a, b) => b[1] - a[1])
    
    console.log('Match states in database:')
    sortedStates.forEach(([stateId, count]) => console.log(`State ${stateId}: ${count} matches`))
    
    // Let's try with the most common finished state
    const mostCommonFinishedState = sortedStates.find(([stateId, count]) => stateId === 5 || stateId === 7)
    if (mostCommonFinishedState) {
      console.log(`\nUsing state ${mostCommonFinishedState[0]} for finished matches`)
      
      // Check Danish Superliga matches with this state
      const danishMatches = await payload.find({
        collection: 'matches',
        where: {
          and: [
            { league_id: { equals: 271 } },
            { season_id: { equals: 23584 } },
            { state_id: { equals: mostCommonFinishedState[0] } }
          ]
        },
        limit: 5
      })
      
      console.log(`Found ${danishMatches.totalDocs} finished Danish matches`)
      
      if (danishMatches.docs.length > 0) {
        console.log('\nSample finished matches:')
        danishMatches.docs.forEach((m, i) => {
          const participants = m.participants as any[]
          const home = participants?.find(p => p.meta?.location === 'home')
          const away = participants?.find(p => p.meta?.location === 'away')
          const scores = m.scores as any[]
          console.log(`${i + 1}. ${home?.name} vs ${away?.name}`)
          
          // Check scores
          if (scores && scores.length > 0) {
            const finalScore = scores.find(s => s.type?.name === 'FT' || s.type?.name === 'CURRENT')
            if (finalScore && finalScore.scores) {
              const homeGoals = finalScore.scores.find((s: any) => s.participant_id === home?.id)?.score?.goals
              const awayGoals = finalScore.scores.find((s: any) => s.participant_id === away?.id)?.score?.goals
              console.log(`   Score: ${homeGoals ?? '?'} - ${awayGoals ?? '?'}`)
            }
          }
        })
        
        console.log('\n✅ Found finished matches with scores! Standings calculation should work.')
      }
    } else {
      console.log('\nNo common finished states found. Checking any completed matches...')
      
      // Try any matches with scores
      const matchesWithScores = await payload.find({
        collection: 'matches',
        where: {
          and: [
            { league_id: { equals: 271 } },
            { season_id: { equals: 23584 } },
            { 'scores.0': { exists: true } }
          ]
        },
        limit: 5
      })
      
      console.log(`Found ${matchesWithScores.totalDocs} matches with scores`)
      
      if (matchesWithScores.docs.length > 0) {
        console.log('These matches have scores, we can use them for standings!')
        
        // Update the standings calculator to use any match with scores
        console.log('\n💡 RECOMMENDATION:')
        console.log('Update the standings calculator to use matches with scores instead of specific state_id')
      }
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    process.exit(0)
  }
}

quickStandingsTest()