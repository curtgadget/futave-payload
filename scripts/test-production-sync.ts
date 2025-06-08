import 'dotenv/config'

async function testProductionSync() {
  console.log('🚀 Testing production match sync with wave scores...\n')
  
  try {
    const today = new Date().toISOString().split('T')[0]
    const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    console.log(`📅 Sync window: ${today} to ${futureDate}`)
    console.log('🌊 Wave scores enabled for upcoming matches\n')
    
    // Use fetch to call the API endpoint
    const response = await fetch('http://localhost:3000/api/queue-jobs/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'matches',
        startDate: today,
        endDate: futureDate,
        calculateWaveScores: true
      })
    })
    
    const result = await response.json()
    
    console.log('📊 Sync Results:')
    console.log('================')
    console.log(`Success: ${result.success}`)
    console.log(`Message: ${result.output.message}`)
    
    if (result.output.stats) {
      const stats = result.output.stats
      console.log('\n📈 Statistics:')
      console.log(`- Created: ${stats.created} matches`)
      console.log(`- Updated: ${stats.updated} matches`) 
      console.log(`- Failed: ${stats.failed} matches`)
      console.log(`- Duration: ${(stats.duration / 1000).toFixed(1)} seconds`)
      
      if (stats.waveScoresNote) {
        console.log(`- Wave Scores: ${stats.waveScoresNote}`)
      }
      
      if (stats.errors && stats.errors.length > 0) {
        console.log(`- Errors: ${stats.errors.length}`)
      }
    }
    
    console.log('\n✅ Production sync test completed!')
    console.log('\n💡 Recommended Production Usage:')
    console.log('- Run daily with calculateWaveScores: true')
    console.log('- Sync 14-day window for optimal performance')
    console.log('- Monitor duration and error rates')
    
  } catch (error) {
    console.error('❌ Production sync test failed:', error)
  } finally {
    process.exit(0)
  }
}

testProductionSync()