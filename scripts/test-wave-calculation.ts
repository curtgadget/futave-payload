import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { WaveScoreCalculator } from '../src/services/waveDetector/calculator'

async function testWaveCalculation() {
  const payload = await getPayload({ config })
  const calculator = new WaveScoreCalculator(payload)
  
  console.log('Testing wave score calculation on existing matches...\n')
  
  try {
    // Get some recent matches to test with
    const matches = await payload.find({
      collection: 'matches',
      limit: 10,
      sort: '-starting_at',
      where: {
        // Only matches with participants
        'participants.0': { exists: true }
      }
    })
    
    console.log(`Found ${matches.docs.length} matches to test with\n`)
    
    if (matches.docs.length === 0) {
      console.log('No matches found. Please run sync-last-month.ts first.')
      process.exit(1)
    }
    
    // Calculate wave scores for these matches
    const results = []
    
    for (const match of matches.docs) {
      const participants = match.participants as any[]
      const homeParticipant = participants?.find(p => p.meta?.location === 'home')
      const awayParticipant = participants?.find(p => p.meta?.location === 'away')
      
      if (!homeParticipant || !awayParticipant) continue
      
      // Check if teams exist
      const [homeTeamResult, awayTeamResult] = await Promise.all([
        payload.find({
          collection: 'teams',
          where: { id: { equals: homeParticipant.id } },
          limit: 1
        }),
        payload.find({
          collection: 'teams',
          where: { id: { equals: awayParticipant.id } },
          limit: 1
        })
      ])
      
      if (homeTeamResult.docs.length === 0 || awayTeamResult.docs.length === 0) {
        console.log(`Teams not found for ${homeParticipant.name} vs ${awayParticipant.name}`)
        console.log('You may need to sync teams first: pnpm tsx scripts/sync-teams.ts')
        continue
      }
      
      const homeTeam = homeTeamResult.docs[0]
      const awayTeam = awayTeamResult.docs[0]
      
      try {
        // Calculate wave score
        const waveScore = await calculator.calculatePreMatchScore(match, homeTeam, awayTeam)
        
        // Update the match
        await payload.update({
          collection: 'matches',
          id: match.id,
          data: {
            wave_score: {
              ...waveScore,
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // Fake future expiry
            }
          }
        })
        
        results.push({
          match: `${homeTeam.name} vs ${awayTeam.name}`,
          date: new Date(match.starting_at).toLocaleDateString(),
          score: waveScore.total,
          tier: waveScore.tier,
          factors: waveScore.factors
        })
        
        console.log(`✅ Calculated: ${homeTeam.name} vs ${awayTeam.name}`)
        console.log(`   Score: ${waveScore.total} (${waveScore.tier})`)
        console.log(`   Factors: Rivalry=${waveScore.factors.rivalry}, Position=${waveScore.factors.position}, Zone=${waveScore.factors.zone}`)
        console.log('')
        
      } catch (error) {
        console.error(`Error calculating wave score for match:`, error)
      }
    }
    
    if (results.length > 0) {
      // Sort by score and show top matches
      results.sort((a, b) => b.score - a.score)
      
      console.log('\n=== TOP WAVE MATCHES ===')
      results.slice(0, 5).forEach((result, index) => {
        console.log(`${index + 1}. ${result.match} (${result.date})`)
        console.log(`   Score: ${result.score} (${result.tier})`)
        console.log(`   Breakdown:`)
        console.log(`   - Rivalry: ${result.factors.rivalry}/30`)
        console.log(`   - Position: ${result.factors.position}/20`)
        console.log(`   - Zone: ${result.factors.zone}/20`)
        console.log(`   - Form: ${result.factors.form}/15`)
        console.log(`   - H2H: ${result.factors.h2h}/10`)
        console.log(`   - Timing: ${result.factors.timing}/5`)
        console.log('')
      })
      
      console.log('\nYou can now test the API:')
      console.log('curl http://localhost:3000/api/v1/matches/waves')
      console.log('\nOr with filters:')
      console.log('curl "http://localhost:3000/api/v1/matches/waves?min_score=40"')
      console.log('curl "http://localhost:3000/api/v1/matches/waves?limit=10"')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    process.exit(0)
  }
}

// Run the test
testWaveCalculation()