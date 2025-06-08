import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { WaveScoreCalculator } from '../src/services/waveDetector/calculator'

async function testWaveScores() {
  const payload = await getPayload({ config })
  const calculator = new WaveScoreCalculator(payload)

  try {
    console.log('Testing Wave Score Calculation...\n')

    // Get some upcoming matches
    const now = new Date()
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    const matches = await payload.find({
      collection: 'matches',
      where: {
        starting_at: {
          greater_than: now.toISOString(),
          less_than: weekFromNow.toISOString()
        }
      },
      limit: 5
    })

    console.log(`Found ${matches.docs.length} upcoming matches\n`)

    for (const match of matches.docs) {
      const participants = match.participants as any[]
      if (!participants || participants.length < 2) continue

      const homeParticipant = participants.find(p => p.meta?.location === 'home')
      const awayParticipant = participants.find(p => p.meta?.location === 'away')
      
      if (!homeParticipant || !awayParticipant) continue

      // Fetch teams
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
        console.log(`Teams not found for match ${match.id}`)
        continue
      }

      const homeTeam = homeTeamResult.docs[0]
      const awayTeam = awayTeamResult.docs[0]

      console.log(`\n${homeTeam.name} vs ${awayTeam.name}`)
      console.log(`Match Date: ${new Date(match.starting_at).toLocaleString()}`)

      // Calculate wave score
      const waveScore = await calculator.calculatePreMatchScore(match, homeTeam, awayTeam)
      
      console.log(`Wave Score: ${waveScore.total} (${waveScore.tier})`)
      console.log('Factor Breakdown:')
      console.log(`  - Rivalry: ${waveScore.factors.rivalry}/30`)
      console.log(`  - Position: ${waveScore.factors.position}/20`)
      console.log(`  - Zone: ${waveScore.factors.zone}/20`)
      console.log(`  - Form: ${waveScore.factors.form}/15`)
      console.log(`  - H2H: ${waveScore.factors.h2h}/10`)
      console.log(`  - Timing: ${waveScore.factors.timing}/5`)
      console.log('-'.repeat(50))
    }

    // Test API endpoint
    console.log('\nTesting Wave API Endpoint...')
    const response = await fetch('http://localhost:3000/api/v1/matches/waves?limit=5')
    if (response.ok) {
      const data = await response.json()
      console.log(`API returned ${data.matches.length} matches`)
      if (data.matches.length > 0) {
        console.log('\nTop 3 Wave Matches:')
        data.matches.slice(0, 3).forEach((match: any, index: number) => {
          console.log(`${index + 1}. ${match.home_team.name} vs ${match.away_team.name} - Score: ${match.wave_score.total} (${match.wave_score.tier})`)
        })
      }
    } else {
      console.log('API request failed:', response.status)
    }

  } catch (error) {
    console.error('Error testing wave scores:', error)
  } finally {
    process.exit(0)
  }
}

// Run the test
testWaveScores()