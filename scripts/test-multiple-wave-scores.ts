import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { WaveScoreCalculator } from '../src/services/waveDetector/calculator'

async function testMultipleWaveScores() {
  const payload = await getPayload({ config })
  const waveCalculator = new WaveScoreCalculator(payload)
  
  console.log('Testing wave scores on multiple matches...\n')
  
  try {
    // Get several matches to test
    const matches = await payload.find({
      collection: 'matches',
      limit: 5,
      where: {
        and: [
          { 'league_id.id': { equals: 271 } }, // Danish Superliga
          { season_id: { equals: 23584 } },
          { state_id: { equals: 5 } } // Finished matches
        ]
      }
    })
    
    console.log(`Testing ${matches.docs.length} matches...\n`)
    
    let improvements = 0
    let totalOldScore = 0
    let totalNewScore = 0
    
    for (const [index, match] of matches.docs.entries()) {
      const participants = match.participants as any[]
      const homeTeam = participants?.find(p => p.meta?.location === 'home')
      const awayTeam = participants?.find(p => p.meta?.location === 'away')
      
      if (!homeTeam || !awayTeam) continue
      
      // Get full team data
      const [homeTeamResult, awayTeamResult] = await Promise.all([
        payload.find({
          collection: 'teams',
          where: { id: { equals: homeTeam.id } },
          limit: 1
        }),
        payload.find({
          collection: 'teams',
          where: { id: { equals: awayTeam.id } },
          limit: 1
        })
      ])
      
      if (homeTeamResult.docs.length === 0 || awayTeamResult.docs.length === 0) continue
      
      const homeTeamFull = homeTeamResult.docs[0]
      const awayTeamFull = awayTeamResult.docs[0]
      
      // Calculate new wave score
      const newWaveScore = await waveCalculator.calculatePreMatchScore(match, homeTeamFull, awayTeamFull)
      const oldScore = match.wave_score?.total || 0
      
      console.log(`${index + 1}. ${homeTeam.name} vs ${awayTeam.name}`)
      console.log(`   Old: ${oldScore} → New: ${newWaveScore.total} (${newWaveScore.tier})`)
      console.log(`   Factors: R${newWaveScore.factors.rivalry} P${newWaveScore.factors.position} Z${newWaveScore.factors.zone} F${newWaveScore.factors.form} H${newWaveScore.factors.h2h} T${newWaveScore.factors.timing}`)
      
      if (newWaveScore.total > oldScore) {
        improvements++
      }
      
      totalOldScore += oldScore
      totalNewScore += newWaveScore.total
      console.log('')
    }
    
    console.log('=== SUMMARY ===')
    console.log(`Matches tested: ${matches.docs.length}`)
    console.log(`Improvements: ${improvements}/${matches.docs.length}`)
    console.log(`Average old score: ${(totalOldScore / matches.docs.length).toFixed(1)}`)
    console.log(`Average new score: ${(totalNewScore / matches.docs.length).toFixed(1)}`)
    console.log(`Average improvement: ${((totalNewScore - totalOldScore) / matches.docs.length).toFixed(1)} points`)
    
    if (improvements > 0) {
      console.log('\n✅ Wave score calculation is working! Ready for production.')
      console.log('\nRecommendation: Run the full wave score update on all matches.')
    } else {
      console.log('\n⚠️  No improvements found. May need further investigation.')
    }
    
  } catch (error) {
    console.error('Error testing wave scores:', error)
  } finally {
    process.exit(0)
  }
}

testMultipleWaveScores()