import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { WaveScoreCalculator } from '../src/services/waveDetector/calculator'

async function calculateWaveScoresManually() {
  const payload = await getPayload({ config })
  const calculator = new WaveScoreCalculator(payload)
  
  console.log('Manually calculating wave scores for existing matches...\n')
  
  try {
    // Get all matches without wave scores
    // First, let's just get recent matches and check wave_score manually
    const matches = await payload.find({
      collection: 'matches',
      limit: 20,
      sort: '-starting_at'
    })
    
    // Filter out matches that already have wave scores
    const matchesWithoutScores = matches.docs.filter(match => 
      !match.wave_score || !match.wave_score.total
    )
    
    console.log(`Found ${matchesWithoutScores.length} matches without wave scores`)
    console.log(`Processing ${matchesWithoutScores.length} matches...\n`)
    
    let calculated = 0
    let failed = 0
    
    for (const match of matchesWithoutScores) {
      const participants = match.participants as any[]
      if (!participants || participants.length < 2) {
        console.log(`Match ${match.id}: No participants`)
        failed++
        continue
      }
      
      const homeParticipant = participants.find(p => p.meta?.location === 'home')
      const awayParticipant = participants.find(p => p.meta?.location === 'away')
      
      if (!homeParticipant || !awayParticipant) {
        console.log(`Match ${match.id}: Missing home or away team`)
        failed++
        continue
      }
      
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
        console.log(`Match ${match.id}: Teams not found in database`)
        failed++
        continue
      }
      
      const homeTeam = homeTeamResult.docs[0]
      const awayTeam = awayTeamResult.docs[0]
      
      try {
        // Calculate wave score
        const waveScore = await calculator.calculatePreMatchScore(match, homeTeam, awayTeam)
        
        // Update match
        await payload.update({
          collection: 'matches',
          id: match.id,
          data: {
            wave_score: waveScore
          }
        })
        
        calculated++
        const date = new Date(match.starting_at).toLocaleDateString()
        console.log(`✅ ${homeTeam.name} vs ${awayTeam.name} (${date})`)
        console.log(`   Wave Score: ${waveScore.total} (${waveScore.tier})`)
        console.log(`   Breakdown: Rivalry=${waveScore.factors.rivalry}, Position=${waveScore.factors.position}, Zone=${waveScore.factors.zone}`)
        console.log('')
        
      } catch (error) {
        console.log(`❌ Match ${match.id}: Error calculating wave score`)
        console.error(error)
        failed++
      }
    }
    
    console.log('\n=== SUMMARY ===')
    console.log(`Successfully calculated: ${calculated}`)
    console.log(`Failed: ${failed}`)
    
    if (calculated > 0) {
      console.log('\nTop matches by wave score:')
      const topMatches = await payload.find({
        collection: 'matches',
        where: {
          'wave_score.total': { exists: true }
        },
        sort: '-wave_score.total',
        limit: 5
      })
      
      topMatches.docs.forEach((match: any, index: number) => {
        const participants = match.participants as any[]
        const home = participants?.find(p => p.meta?.location === 'home')
        const away = participants?.find(p => p.meta?.location === 'away')
        const date = new Date(match.starting_at).toLocaleDateString()
        console.log(`${index + 1}. ${home?.name || 'TBD'} vs ${away?.name || 'TBD'} - Score: ${match.wave_score.total} (${match.wave_score.tier}) - ${date}`)
      })
      
      console.log('\n\nYou can now test the wave API at:')
      console.log('http://localhost:3000/api/v1/matches/waves')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    process.exit(0)
  }
}

// Run the calculation
calculateWaveScoresManually()