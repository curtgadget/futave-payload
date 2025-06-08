import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'

async function testMatchQuery() {
  const payload = await getPayload({ config })
  
  console.log('Testing match query...\n')
  
  try {
    // Test the exact query the standings calculator uses
    const matches = await payload.find({
      collection: 'matches',
      where: {
        and: [
          { 'league_id.id': { equals: 271 } },
          { season_id: { equals: 23584 } },
          { state_id: { equals: 5 } }
        ]
      },
      limit: 5
    })
    
    console.log(`Found ${matches.totalDocs} matches`)
    
    if (matches.docs.length > 0) {
      console.log('\nSample matches:')
      matches.docs.forEach((match, index) => {
        const participants = match.participants as any[]
        const home = participants?.find(p => p.meta?.location === 'home')
        const away = participants?.find(p => p.meta?.location === 'away')
        const scores = match.scores as any[]
        
        console.log(`${index + 1}. ${home?.name || 'TBD'} vs ${away?.name || 'TBD'}`)
        console.log(`   League ID: ${typeof match.league_id === 'object' ? match.league_id.id : match.league_id}`)
        console.log(`   Season ID: ${match.season_id}`)
        console.log(`   State ID: ${match.state_id}`)
        console.log(`   Scores count: ${scores?.length || 0}`)
        
        if (scores && scores.length > 0) {
          const currentScore = scores.find((score: any) => 
            ['CURRENT', 'FT', 'AET', 'LIVE'].includes(score.type?.name)
          )
          if (currentScore) {
            console.log(`   Final score type: ${currentScore.type?.name}`)
            if (currentScore.scores) {
              const homeScore = currentScore.scores.find((s: any) => s.participant_id === home?.id)?.score?.goals
              const awayScore = currentScore.scores.find((s: any) => s.participant_id === away?.id)?.score?.goals
              console.log(`   Final score: ${homeScore ?? '?'} - ${awayScore ?? '?'}`)
            }
          }
        }
        console.log('')
      })
    } else {
      console.log('❌ No matches found with the query')
      
      // Try without league_id.id syntax
      console.log('\nTrying alternative query (league_id direct)...')
      const altMatches = await payload.find({
        collection: 'matches',
        where: {
          and: [
            { league_id: { equals: 271 } },
            { season_id: { equals: 23584 } },
            { state_id: { equals: 5 } }
          ]
        },
        limit: 5
      })
      
      console.log(`Alternative query found ${altMatches.totalDocs} matches`)
      
      if (altMatches.docs.length > 0) {
        console.log('✅ Alternative query works! The issue is the league_id.id syntax')
      }
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    process.exit(0)
  }
}

testMatchQuery()