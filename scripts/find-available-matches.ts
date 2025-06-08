import 'dotenv/config'
import { createMatchesEndpoint } from '../src/services/sportmonks/client/endpoints/matches'

async function findAvailableMatches() {
  const config = {
    apiKey: process.env.SPORTMONKS_API_KEY || '',
    baseUrl: process.env.SPORTMONKS_BASE_URL,
  }
  
  const matchesEndpoint = createMatchesEndpoint(config)
  
  console.log('Searching for available matches in Sportmonks API...\n')
  
  // Try different date ranges to find where matches exist
  const ranges = [
    { 
      name: 'Current/Recent matches (May 2024)', 
      start: '2024-05-01', 
      end: '2024-05-31' 
    },
    { 
      name: 'Last completed season (2023-24 season end)', 
      start: '2024-04-01', 
      end: '2024-06-30' 
    },
    { 
      name: 'Current season start (2024-25)', 
      start: '2024-08-01', 
      end: '2024-09-30' 
    },
    { 
      name: 'Recent past (30 days ago from May 2024)', 
      start: '2024-04-01', 
      end: '2024-05-01' 
    },
    {
      name: 'Champions League Final period (2024)',
      start: '2024-05-20',
      end: '2024-06-10'
    }
  ]
  
  for (const range of ranges) {
    console.log(`\nChecking: ${range.name}`)
    console.log(`Date range: ${range.start} to ${range.end}`)
    
    try {
      // Just fetch first page to see if any matches exist
      const response = await fetch(
        `${config.baseUrl || 'https://api.sportmonks.com/v3'}/football/fixtures/between/${range.start}/${range.end}?api_token=${config.apiKey}&per_page=5`,
        { method: 'GET' }
      )
      
      const data = await response.json()
      
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        console.log(`✅ Found ${data.data.length} matches! (showing first page)`)
        console.log(`Total available: ${data.pagination?.total || 'unknown'}`)
        
        // Show first match as example
        const firstMatch = data.data[0]
        if (firstMatch.participants) {
          const home = firstMatch.participants.find((p: any) => p.meta?.location === 'home')
          const away = firstMatch.participants.find((p: any) => p.meta?.location === 'away')
          console.log(`Example: ${home?.name || 'Team'} vs ${away?.name || 'Team'} on ${firstMatch.starting_at}`)
        }
      } else {
        console.log('❌ No matches found in this range')
        if (data.message) {
          console.log(`API message: ${data.message}`)
        }
      }
    } catch (error) {
      console.error(`Error checking range: ${error}`)
    }
  }
  
  console.log('\n\nRecommendation:')
  console.log('================')
  console.log('1. Use one of the date ranges above that returned matches')
  console.log('2. Run: pnpm tsx scripts/sync-current-matches.ts after updating the date range')
  console.log('3. Or manually specify dates when calling the sync')
  
  process.exit(0)
}

// Run the search
findAvailableMatches()