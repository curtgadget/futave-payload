import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'

async function checkData() {
  const payload = await getPayload({ config })
  
  console.log('Checking database status...\n')
  
  try {
    // Check teams
    const teams = await payload.find({
      collection: 'teams',
      limit: 1
    })
    console.log(`Teams: ${teams.totalDocs} total`)
    
    // Check matches
    const matches = await payload.find({
      collection: 'matches',
      limit: 1
    })
    console.log(`Matches: ${matches.totalDocs} total`)
    
    // Check rivals
    const rivals = await payload.find({
      collection: 'rivals',
      limit: 1
    })
    console.log(`Rivals: ${rivals.totalDocs} total`)
    
    // Check leagues
    const leagues = await payload.find({
      collection: 'leagues',
      limit: 1
    })
    console.log(`Leagues: ${leagues.totalDocs} total`)
    
    // Check matches with wave scores
    const matchesWithScores = await payload.find({
      collection: 'matches',
      limit: 100
    })
    
    const withScores = matchesWithScores.docs.filter(m => m.wave_score?.total !== undefined)
    console.log(`\nMatches with wave scores: ${withScores.length}`)
    
    if (teams.totalDocs === 0) {
      console.log('\n⚠️  No teams found! You need to sync teams first.')
      console.log('Run: curl -X POST http://localhost:3000/api/queue-jobs/sync')
    }
    
    if (matches.totalDocs > 0 && teams.totalDocs > 0) {
      console.log('\n✅ You have both matches and teams. Wave score calculation should work.')
      
      // Show a sample match
      const sampleMatch = matches.docs[0]
      if (sampleMatch) {
        const participants = sampleMatch.participants as any[]
        const home = participants?.find(p => p.meta?.location === 'home')
        const away = participants?.find(p => p.meta?.location === 'away')
        console.log(`\nSample match: ${home?.name || 'TBD'} vs ${away?.name || 'TBD'}`)
        console.log(`Has wave score: ${sampleMatch.wave_score?.total ? 'Yes' : 'No'}`)
      }
    }
    
  } catch (error) {
    console.error('Error checking data:', error)
  } finally {
    process.exit(0)
  }
}

// Run the check
checkData()