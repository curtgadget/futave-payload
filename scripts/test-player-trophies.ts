// Test script to check player trophies API
async function testPlayerTrophies() {
  const baseUrl = 'http://localhost:3000/api/v1'
  
  // Test with player ID 14 (Daniel Agger) who has trophies
  const playerId = '14'
  
  try {
    console.log(`\nFetching player overview for ID: ${playerId}...`)
    const response = await fetch(`${baseUrl}/players/${playerId}`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    console.log('\nPlayer Basic Info:')
    console.log(`- Name: ${data.name}`)
    console.log(`- Position: ${data.position || 'N/A'}`)
    console.log(`- Nationality: ${data.nationality || 'N/A'}`)
    
    if (data.trophies && data.trophies.length > 0) {
      console.log(`\nTrophies (${data.trophies.length}):`)
      data.trophies.forEach((trophy: any, index: number) => {
        console.log(`\n${index + 1}. ${trophy.trophy.name}`)
        console.log(`   - Team: ${trophy.team.name} (${trophy.team.country || 'N/A'})`)
        console.log(`   - League: ${trophy.league.name}`)
        console.log(`   - Season: ${trophy.season.name}`)
      })
    } else {
      console.log('\nNo trophies found for this player')
    }
    
    console.log('\n✅ Test completed successfully!')
    
  } catch (error) {
    console.error('❌ Error testing player trophies:', error)
  }
}

// Run the test
testPlayerTrophies()