import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { WaveScoreCalculator } from '../src/services/waveDetector/calculator'

async function calculateWaveScores() {
  const payload = await getPayload({ config })
  const waveCalculator = new WaveScoreCalculator(payload)
  
  console.log('🌊 Starting wave score calculation for all matches...\n')
  
  try {
    // Get all matches that need wave score calculation
    const matches = await payload.find({
      collection: 'matches',
      where: {
        and: [
          { state_id: { equals: 5 } }, // Finished matches only
          { participants: { exists: true } } // Must have participants
        ]
      },
      limit: 10000, // High limit to get all matches
      pagination: false
    })
    
    console.log(`Found ${matches.docs.length} finished matches to process`)
    
    let processed = 0
    let updated = 0
    let errors = 0
    let skipped = 0
    
    const startTime = Date.now()
    
    for (const match of matches.docs) {
      try {
        const participants = match.participants as any[]
        if (!participants || participants.length !== 2) {
          skipped++
          continue
        }
        
        const homeTeam = participants.find(p => p.meta?.location === 'home')
        const awayTeam = participants.find(p => p.meta?.location === 'away')
        
        if (!homeTeam || !awayTeam) {
          skipped++
          continue
        }
        
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
        
        if (homeTeamResult.docs.length === 0 || awayTeamResult.docs.length === 0) {
          skipped++
          continue
        }
        
        const homeTeamFull = homeTeamResult.docs[0]
        const awayTeamFull = awayTeamResult.docs[0]
        
        // Calculate wave score
        const waveScore = await waveCalculator.calculatePreMatchScore(match, homeTeamFull, awayTeamFull)
        
        // Update match with new wave score
        await payload.update({
          collection: 'matches',
          id: match.id,
          data: {
            wave_score: waveScore
          }
        })
        
        updated++
        processed++
        
        // Progress reporting
        if (processed % 50 === 0) {
          const elapsed = (Date.now() - startTime) / 1000
          const rate = processed / elapsed
          const remaining = matches.docs.length - processed
          const eta = remaining / rate
          
          console.log(`Progress: ${processed}/${matches.docs.length} (${(processed/matches.docs.length*100).toFixed(1)}%)`)
          console.log(`Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`)
          console.log(`Rate: ${rate.toFixed(1)} matches/sec, ETA: ${(eta/60).toFixed(1)} minutes\n`)
        }
        
      } catch (error) {
        console.error(`Error processing match ${match.id}:`, error)
        errors++
        processed++
      }
    }
    
    const totalTime = (Date.now() - startTime) / 1000
    
    console.log('\n🎉 Wave score calculation completed!')
    console.log('='.repeat(50))
    console.log(`Total matches processed: ${processed}`)
    console.log(`Successfully updated: ${updated}`)
    console.log(`Skipped (invalid data): ${skipped}`)
    console.log(`Errors: ${errors}`)
    console.log(`Total time: ${(totalTime/60).toFixed(1)} minutes`)
    console.log(`Average rate: ${(processed/totalTime).toFixed(1)} matches/second`)
    
    if (updated > 0) {
      console.log(`\n✅ ${updated} matches now have enhanced wave scores!`)
      console.log('The wave detection system is ready for production use.')
    }
    
  } catch (error) {
    console.error('Fatal error during wave score calculation:', error)
  } finally {
    process.exit(0)
  }
}

calculateWaveScores()