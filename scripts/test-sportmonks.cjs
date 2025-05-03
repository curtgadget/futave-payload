// This is a CommonJS script to test the Sportmonks API
const dotenv = require('dotenv')

// Load environment variables
dotenv.config()

async function testPagination() {
  console.log('Starting Sportmonks API test...')

  const apiKey = process.env.SPORTMONKS_API_KEY || ''
  if (!apiKey) {
    console.error('No API key found. Please set SPORTMONKS_API_KEY environment variable.')
    process.exit(1)
  }

  const baseUrl = process.env.SPORTMONKS_BASE_URL || 'https://api.sportmonks.com/v3/football'
  console.log(`Using base URL: ${baseUrl}`)

  // Make a direct fetch call to the API
  async function fetchFromApi(endpoint, params = {}) {
    const queryParams = new URLSearchParams({
      api_token: apiKey,
      ...(params.include && { include: params.include }),
      ...(params.page && { page: params.page.toString() }),
    })

    const url = `${baseUrl}${endpoint}?${queryParams}`
    console.log(`API Request: ${url.replace(apiKey, 'API_KEY_HIDDEN')}`)

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Fetch all pages from the API
  async function fetchAllPages(endpoint, params = {}) {
    const results = []
    console.log(`Starting fetchAllPages for endpoint: ${endpoint}`)

    let currentPage = 1

    while (true) {
      try {
        console.log(`Fetching page ${currentPage}...`)
        const response = await fetchFromApi(endpoint, { ...params, page: currentPage })

        if (!Array.isArray(response.data)) {
          console.error(`Page ${currentPage} data is not an array`, response)
          break
        }

        console.log(`Page ${currentPage} fetched with ${response.data.length} items`)
        results.push(...response.data)

        // Log the pagination info
        console.log('Pagination info:', response.pagination || {})

        // Check if more pages exist
        if (!response.pagination?.has_more) {
          console.log(`No more pages indicated by API (has_more=false)`)
          break
        }

        // Move to the next page
        currentPage++

        // Safety limit
        if (currentPage > 10) {
          console.warn(`Reached maximum page limit (10) for testing`)
          break
        }
      } catch (error) {
        console.error(`Error fetching page ${currentPage}:`, error)
        break
      }
    }

    console.log(`Total items fetched: ${results.length}`)
    return results
  }

  try {
    console.log('Fetching players with pagination...')
    const allPlayers = await fetchAllPages('/players', {
      include: 'teams;nationality;position',
    })

    console.log('-------------------------------------------')
    console.log(`✅ Total players fetched: ${allPlayers.length}`)
    console.log('-------------------------------------------')

    // Show a sample of the first few players
    if (allPlayers.length > 0) {
      console.log('Sample player data:')
      const sample = allPlayers.slice(0, 3)
      sample.forEach((player, index) => {
        console.log(`Player ${index + 1}:`, {
          id: player.id,
          name: player.name,
        })
      })
    }

    // Log unique player IDs to ensure we're not getting duplicates
    const uniqueIds = new Set(allPlayers.map((p) => p.id))
    console.log(`Unique player IDs count: ${uniqueIds.size}`)

    if (uniqueIds.size !== allPlayers.length) {
      console.warn('⚠️ Warning: Duplicate player IDs found in the results!')
    }
  } catch (error) {
    console.error('Error testing Sportmonks API:', error)
  }
}

// Run the test
testPagination()
  .then(() => console.log('Test completed.'))
  .catch((err) => console.error('Error in test:', err))
  .finally(() => process.exit(0))
