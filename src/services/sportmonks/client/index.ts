import { FetchParams, SportmonksConfig, SportmonksResponse } from './types'
import { SPORTMONKS_FOOTBALL_BASE_URL } from '@/constants/api'

export function createSportmonksError(
  message: string,
  statusCode?: number,
  response?: Response,
): Error & { statusCode?: number; response?: Response } {
  return Object.assign(new Error(message), {
    name: 'SportmonksError',
    statusCode,
    response,
  })
}

export function createSportmonksClient(config: SportmonksConfig) {
  const apiKey = config.apiKey
  const baseUrl = config.baseUrl || SPORTMONKS_FOOTBALL_BASE_URL

  if (!apiKey) {
    throw new Error('Sportmonks API key is required')
  }

  async function fetchFromApi<T>(
    endpoint: string,
    params: FetchParams = {},
  ): Promise<SportmonksResponse<T>> {
    const queryParams = new URLSearchParams({
      api_token: apiKey,
      ...(params.include && { include: params.include }),
      ...(params.page && { page: params.page.toString() }),
      ...(params.per_page && { per_page: params.per_page.toString() }),
      ...(params.filterString && { filters: params.filterString }),
      ...Object.entries(params.filters || {}).reduce(
        (acc, [key, value]) => ({ ...acc, [key]: value.toString() }),
        {},
      ),
    })

    const url = `${baseUrl}${endpoint}?${queryParams}`
    console.log(`API Request: ${url.replace(apiKey, 'API_KEY_HIDDEN')}`)

    try {
      const response = await fetch(url)

      if (!response.ok) {
        throw createSportmonksError(
          `Sportmonks API error: ${response.statusText}`,
          response.status,
          response,
        )
      }

      const data = await response.json()
      return data as SportmonksResponse<T>
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error
      }

      throw createSportmonksError(error instanceof Error ? error.message : 'Unknown error occurred')
    }
  }

  async function fetchAllPages<T>(endpoint: string, params: FetchParams = {}): Promise<T[]> {
    const results: T[] = []
    console.log(`Starting fetchAllPages for endpoint: ${endpoint} with params:`, params)

    // Set default per_page to 25 to match the API's actual behavior
    const fetchParams = {
      ...params,
      per_page: params.per_page || 25, // API consistently returns 25 items per page
    }

    let currentPage = 1

    while (true) {
      try {
        console.log(`Fetching page ${currentPage}...`)
        const response = await fetchFromApi<T>(endpoint, { ...fetchParams, page: currentPage })

        if (!Array.isArray(response.data)) {
          console.error(`Page ${currentPage} data is not an array`, response)
          break
        }

        console.log(`Page ${currentPage} fetched with ${response.data.length} items`)
        results.push(...response.data)

        // Check if more pages exist
        if (!response.pagination?.has_more) {
          console.log(`No more pages indicated by API (has_more=false)`)
          break
        }

        // Move to the next page
        currentPage++

        // Safety limit - increased to allow more player data
        if (currentPage > 1000) {
          console.warn(`Reached maximum page limit (1000)`)
          break
        }
      } catch (error) {
        console.error(`Error fetching page ${currentPage}:`, error)
        break
      }
    }

    console.log(`Total items fetched: ${results.length}`)

    // If this is the players endpoint, log detailed stats about the result
    if (endpoint === '/players') {
      console.log('===============================')
      console.log('PLAYER FETCH STATS:')
      console.log(`Total pages processed: ${currentPage}`)
      console.log(`Total players fetched: ${results.length}`)
      console.log(
        `API reported total count: ${results.length > 0 ? 'at least ' + results.length : 'unknown'}`,
      )

      // Log unique IDs to check for duplicates
      const uniqueIds = new Set(results.map((item: any) => item.id))
      console.log(`Unique player IDs: ${uniqueIds.size}`)
      if (uniqueIds.size !== results.length) {
        console.warn(`WARNING: Found ${results.length - uniqueIds.size} duplicate player records!`)
      }
      console.log('===============================')
    }

    return results
  }

  return {
    fetchFromApi,
    fetchAllPages,
  }
}
