import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { WaveScoreCalculator } from '../src/services/waveDetector/calculator'
import { StandingsCalculator } from '../src/services/standings/calculator'

async function testNewWaveCalculator() {
  const payload = await getPayload({ config })
  const waveCalculator = new WaveScoreCalculator(payload)
  const standingsCalculator = new StandingsCalculator(payload)
  
  console.log('Testing new standings-based wave calculator...\n')
  
  try {
    // Get a match to test with
    const matches = await payload.find({
      collection: 'matches',
      limit: 1,
      where: {
        'wave_score.total': { greater_than: 30 }
      }
    })
    
    if (matches.docs.length === 0) {
      console.log('No matches with wave scores found')
      process.exit(1)
    }
    
    const match = matches.docs[0]
    const participants = match.participants as any[]
    const homeTeam = participants?.find(p => p.meta?.location === 'home')
    const awayTeam = participants?.find(p => p.meta?.location === 'away')
    
    console.log(`Testing match: ${homeTeam.name} vs ${awayTeam.name}`)
    console.log(`Home team ID: ${homeTeam.id}`)
    console.log(`Away team ID: ${awayTeam.id}`)
    console.log(`League ID: ${match.league_id}`)
    console.log(`Season ID: ${match.season_id}`)
    
    // First, test the standings calculator
    console.log('\n=== TESTING STANDINGS CALCULATOR ===')
    const leagueId = typeof match.league_id === 'object' ? match.league_id.id : match.league_id
    
    console.log(`Calculating fresh standings for league ${leagueId}...`)
    // Force fresh calculation by calling calculateStandings directly
    const table = await standingsCalculator.calculateStandings(leagueId, match.season_id)
    
    if (table) {
      console.log(`✅ Generated table with ${table.standings.length} teams`)
      console.log(`Season: ${table.season_id}`)
      console.log('\nTop 5 teams:')
      table.standings.slice(0, 5).forEach((team, index) => {
        console.log(`${team.position}. ${team.team_name} - ${team.points}pts (${team.form})`)
      })
      
      // Check our specific teams
      const homePosition = table.standings.find(s => s.team_id === homeTeam.id)
      const awayPosition = table.standings.find(s => s.team_id === awayTeam.id)
      
      console.log(`\nOur teams:`)
      if (homePosition) {
        console.log(`${homeTeam.name}: Position ${homePosition.position}, ${homePosition.points}pts, Form: ${homePosition.form}`)
      } else {
        console.log(`${homeTeam.name}: Not found in table`)
      }
      
      if (awayPosition) {
        console.log(`${awayTeam.name}: Position ${awayPosition.position}, ${awayPosition.points}pts, Form: ${awayPosition.form}`)
      } else {
        console.log(`${awayTeam.name}: Not found in table`)
      }
    } else {
      console.log('❌ Failed to generate standings table')
      console.log('This might be because:')
      console.log('1. No completed matches found for this league/season')
      console.log('2. League/season data not available')
      console.log('3. Match data format issues')
    }
    
    // Test the wave calculator
    console.log('\n=== TESTING WAVE CALCULATOR ===')
    
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
      console.log('❌ Teams not found in database')
      process.exit(1)
    }
    
    const homeTeamFull = homeTeamResult.docs[0]
    const awayTeamFull = awayTeamResult.docs[0]
    
    console.log('Calculating new wave score...')
    const newWaveScore = await waveCalculator.calculatePreMatchScore(match, homeTeamFull, awayTeamFull)
    
    console.log('\n🌊 NEW WAVE SCORE RESULTS:')
    console.log(`Total: ${newWaveScore.total} (${newWaveScore.tier})`)
    console.log('Breakdown:')
    console.log(`- Rivalry: ${newWaveScore.factors.rivalry}/30`)
    console.log(`- Position: ${newWaveScore.factors.position}/20`)
    console.log(`- Zone: ${newWaveScore.factors.zone}/20`)
    console.log(`- Form: ${newWaveScore.factors.form}/15`)
    console.log(`- H2H: ${newWaveScore.factors.h2h}/10`)
    console.log(`- Timing: ${newWaveScore.factors.timing}/5`)
    
    // Compare with old score
    console.log('\n📊 COMPARISON:')
    console.log(`Old score: ${match.wave_score?.total || 0}`)
    console.log(`New score: ${newWaveScore.total}`)
    console.log(`Improvement: ${(newWaveScore.total - (match.wave_score?.total || 0)).toFixed(1)} points`)
    
    if (newWaveScore.total > (match.wave_score?.total || 0)) {
      console.log('🎉 Wave score improved! The standings-based calculation is working!')
    } else {
      console.log('🤔 Wave score same or lower. This could be normal depending on the match.')
    }
    
  } catch (error) {
    console.error('Error testing wave calculator:', error)
  } finally {
    process.exit(0)
  }
}

testNewWaveCalculator()