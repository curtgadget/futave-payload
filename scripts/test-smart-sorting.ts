#!/usr/bin/env node
import 'dotenv/config'

/**
 * Test Smart Sorting Implementation
 * 
 * Tests the enhanced matches endpoint with wave score integration
 */

const BASE_URL = 'http://localhost:3001'

interface TestCase {
  name: string
  url: string
  expectedBehavior: string
}

const testCases: TestCase[] = [
  {
    name: 'Default Priority Sorting',
    url: `${BASE_URL}/api/v1/matches?limit=5`,
    expectedBehavior: 'Should sort by league priority only'
  },
  {
    name: 'Include Wave Scores',
    url: `${BASE_URL}/api/v1/matches?limit=5&include_waves=true`,
    expectedBehavior: 'Should include wave_score field in response'
  },
  {
    name: 'Wave Score Boost',
    url: `${BASE_URL}/api/v1/matches?limit=5&include_waves=true&wave_boost=true`,
    expectedBehavior: 'High wave score matches (60+) should get priority boost'
  },
  {
    name: 'Featured Leagues with Wave Boost',
    url: `${BASE_URL}/api/v1/matches?limit=5&include_waves=true&wave_boost=true&only_featured=true`,
    expectedBehavior: 'Only featured league matches with wave boost applied'
  },
  {
    name: 'Upcoming Matches with Waves',
    url: `${BASE_URL}/api/v1/matches?limit=5&include_waves=true&wave_boost=true&view=upcoming`,
    expectedBehavior: 'Future matches only, with wave scores and boost'
  }
]

async function runTest(testCase: TestCase): Promise<void> {
  console.log(`\n🧪 Testing: ${testCase.name}`)
  console.log(`📍 URL: ${testCase.url}`)
  console.log(`📋 Expected: ${testCase.expectedBehavior}`)
  
  try {
    const response = await fetch(testCase.url)
    
    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}: ${response.statusText}`)
      return
    }
    
    const data = await response.json()
    
    if (!data.docs) {
      console.error('❌ Invalid response format - missing docs array')
      return
    }
    
    console.log(`✅ Success: ${data.docs.length} matches returned`)
    
    // Check specific behaviors
    if (testCase.name.includes('Include Wave Scores')) {
      const hasWaveScores = data.docs.some((match: any) => match.wave_score)
      console.log(`   Wave scores included: ${hasWaveScores ? '✅' : '❌'}`)
      
      if (hasWaveScores) {
        const waveMatch = data.docs.find((match: any) => match.wave_score)
        console.log(`   Sample wave score: ${waveMatch.wave_score.total} (${waveMatch.wave_score.tier}-tier)`)
      }
    }
    
    if (testCase.name.includes('Featured')) {
      const featuredOnly = data.docs.every((match: any) => match.league.featured)
      console.log(`   Featured leagues only: ${featuredOnly ? '✅' : '❌'}`)
    }
    
    if (testCase.name.includes('Upcoming')) {
      const futureOnly = data.docs.every((match: any) => {
        return new Date(match.starting_at) > new Date()
      })
      console.log(`   Future matches only: ${futureOnly ? '✅' : '❌'}`)
    }
    
    // Show top 3 matches for analysis
    console.log('   📊 Top 3 matches:')
    data.docs.slice(0, 3).forEach((match: any, i: number) => {
      const waveInfo = match.wave_score 
        ? ` | Wave: ${match.wave_score.total} (${match.wave_score.tier})`
        : ''
      console.log(`      ${i + 1}. ${match.home_team.name} vs ${match.away_team.name}`)
      console.log(`         League: ${match.league.name} (Priority: ${match.league.priority})${waveInfo}`)
    })
    
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function main() {
  console.log('🚀 Testing Smart Sorting Implementation')
  console.log('=====================================')
  
  for (const testCase of testCases) {
    await runTest(testCase)
    await new Promise(resolve => setTimeout(resolve, 500)) // Brief pause between tests
  }
  
  console.log('\n✨ Testing complete!')
  console.log('\n📝 Summary:')
  console.log('• Default sorting uses league priority only')
  console.log('• include_waves=true adds wave_score to response')
  console.log('• wave_boost=true gives 100pt boost to matches with wave_score >= 60')
  console.log('• Smart sorting combines league priority with wave excitement')
  console.log('• Use different combinations for various UX needs')
}

// Run the test
main().catch(console.error)