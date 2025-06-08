import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'

async function debugScores() {
  const payload = await getPayload({ config })
  
  console.log('Debugging score extraction...\n')
  
  try {
    // Get a specific match to examine its scores
    const matches = await payload.find({
      collection: 'matches',
      where: {
        and: [
          { 'league_id.id': { equals: 271 } },
          { season_id: { equals: 23584 } },
          { state_id: { equals: 5 } }
        ]
      },
      limit: 3
    })
    
    if (matches.docs.length === 0) {
      console.log('No matches found')
      return
    }
    
    const match = matches.docs[0]
    const participants = match.participants as any[]
    const scores = match.scores as any[]
    
    console.log(`Match: ${match.id}`)
    console.log(`Participants:`, participants?.map(p => ({ id: p.id, name: p.name, location: p.meta?.location })))
    console.log(`\nScores array:`)
    console.log(JSON.stringify(scores, null, 2))
    
    // Test the exact logic from getFinalScore
    if (Array.isArray(scores)) {
      console.log(`\nChecking ${scores.length} score entries...`)
      
      scores.forEach((score, index) => {
        console.log(`\nScore ${index + 1}:`)
        console.log(`  Type: ${score.type?.name || 'no type'}`)
        console.log(`  Is final type?: ${['CURRENT', 'FT', 'AET', 'LIVE'].includes(score.type?.name)}`)
        console.log(`  Scores:`, score.scores)
        
        if (score.scores && participants) {
          score.scores.forEach((s: any, i: number) => {
            const participant = participants.find(p => p.id === s.participant_id)
            console.log(`    Participant ${i + 1}: ${participant?.name || 'Unknown'} (ID: ${s.participant_id}) - Goals: ${s.score?.goals}`)
          })
        }
      })
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    process.exit(0)
  }
}

debugScores()