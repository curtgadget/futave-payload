import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'

async function diagnoseWaveScores() {
  const payload = await getPayload({ config })
  
  console.log('Diagnosing Wave Score Issues...\n')
  
  try {
    // Get a match with wave score
    const matches = await payload.find({
      collection: 'matches',
      limit: 1,
      where: {
        'wave_score.total': { greater_than: 30 }
      }
    })
    
    if (matches.docs.length === 0) {
      console.log('No high-scoring matches found. Using any match with wave score...')
      const anyMatch = await payload.find({
        collection: 'matches',
        limit: 1,
        sort: '-wave_score.total'
      })
      if (anyMatch.docs.length > 0) {
        matches.docs = anyMatch.docs
      }
    }
    
    if (matches.docs.length === 0) {
      console.log('No matches with wave scores found!')
      process.exit(1)
    }
    
    const match = matches.docs[0]
    const participants = match.participants as any[]
    const home = participants?.find(p => p.meta?.location === 'home')
    const away = participants?.find(p => p.meta?.location === 'away')
    
    console.log(`Analyzing: ${home?.name} vs ${away?.name}`)
    console.log(`Wave Score: ${match.wave_score.total} (${match.wave_score.tier})`)
    console.log('\nFactor Breakdown:')
    console.log(`- Rivalry: ${match.wave_score.factors.rivalry}/30`)
    console.log(`- Position: ${match.wave_score.factors.position}/20`)
    console.log(`- Zone: ${match.wave_score.factors.zone}/20`)
    console.log(`- Form: ${match.wave_score.factors.form}/15`)
    console.log(`- H2H: ${match.wave_score.factors.h2h}/10`)
    console.log(`- Timing: ${match.wave_score.factors.timing}/5`)
    
    // Check team data
    console.log('\n=== CHECKING TEAM DATA ===')
    
    // Fetch teams
    const [homeTeamResult, awayTeamResult] = await Promise.all([
      payload.find({
        collection: 'teams',
        where: { id: { equals: home.id } },
        limit: 1
      }),
      payload.find({
        collection: 'teams',
        where: { id: { equals: away.id } },
        limit: 1
      })
    ])
    
    if (homeTeamResult.docs.length > 0) {
      const homeTeam = homeTeamResult.docs[0]
      console.log(`\n${homeTeam.name}:`)
      console.log(`- Has standings: ${homeTeam.standings ? 'Yes' : 'No'}`)
      if (homeTeam.standings) {
        const standings = homeTeam.standings as any
        console.log(`  - Standings type: ${typeof standings}`)
        console.log(`  - Is array: ${Array.isArray(standings)}`)
        if (Array.isArray(standings) && standings.length > 0) {
          console.log(`  - Position: ${standings[0].position || 'N/A'}`)
          console.log(`  - Form: ${standings[0].form || 'N/A'}`)
        }
      }
    }
    
    if (awayTeamResult.docs.length > 0) {
      const awayTeam = awayTeamResult.docs[0]
      console.log(`\n${awayTeam.name}:`)
      console.log(`- Has standings: ${awayTeam.standings ? 'Yes' : 'No'}`)
      if (awayTeam.standings) {
        const standings = awayTeam.standings as any
        console.log(`  - Standings type: ${typeof standings}`)
        console.log(`  - Is array: ${Array.isArray(standings)}`)
        if (Array.isArray(standings) && standings.length > 0) {
          console.log(`  - Position: ${standings[0].position || 'N/A'}`)
          console.log(`  - Form: ${standings[0].form || 'N/A'}`)
        }
      }
    }
    
    // Check rivals
    console.log('\n=== CHECKING RIVALRY DATA ===')
    const rivals = await payload.find({
      collection: 'rivals',
      where: {
        or: [
          {
            and: [
              { team_id: { equals: home.id } },
              { rival_team_id: { equals: away.id } }
            ]
          },
          {
            and: [
              { team_id: { equals: away.id } },
              { rival_team_id: { equals: home.id } }
            ]
          }
        ]
      },
      limit: 1
    })
    
    if (rivals.docs.length > 0) {
      console.log('Rivalry found!')
      const rival = rivals.docs[0]
      console.log(`- Has H2H data: ${rival.h2h_summary ? 'Yes' : 'No'}`)
      if (rival.h2h_summary) {
        console.log(`- Drama score: ${rival.h2h_summary.drama_score || 0}`)
        console.log(`- Total matches: ${rival.h2h_summary.total_matches || 0}`)
      }
    } else {
      console.log('No rivalry found between these teams')
    }
    
    console.log('\n=== RECOMMENDATIONS ===')
    console.log('To improve wave scores:')
    console.log('1. Ensure teams have standings data (for position/zone/form calculations)')
    console.log('2. Sync more rivalry data with H2H information')
    console.log('3. Consider adjusting the scoring weights in the calculator')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    process.exit(0)
  }
}

// Run the diagnosis
diagnoseWaveScores()