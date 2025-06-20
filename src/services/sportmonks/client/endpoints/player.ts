import { createSportmonksClient } from '../index'
import { FetchParams, SportmonksConfig, SportmonksPlayer } from '../types'

const DEFAULT_INCLUDE =
  'teams;nationality;trophies;trophies.season;trophies.trophy;metadata;position;detailedPosition;statistics.details'

export function createPlayerEndpoint(config: SportmonksConfig) {
  const client = createSportmonksClient(config)

  async function getAll(params: FetchParams = {}): Promise<SportmonksPlayer[]> {
    // Use the direct endpoint string without any path manipulation
    const endpoint = '/players'
    console.log('Calling getAll with endpoint:', endpoint)

    // Fetch players with pagination (Sportmonks supports up to 1000 per page)
    return client.fetchAllPages<SportmonksPlayer>(endpoint, {
      ...params,
      include: params.include || DEFAULT_INCLUDE,
    })
  }

  async function getById(id: number, params: FetchParams = {}): Promise<SportmonksPlayer> {
    const endpoint = `/players/${id}`
    console.log('Calling getById with endpoint:', endpoint)

    const response = await client.fetchFromApi<SportmonksPlayer>(endpoint, {
      ...params,
      include: params.include || DEFAULT_INCLUDE,
    })
    
    // Debug: Log response structure
    console.log(`Debug: API response for player ${id}:`, {
      hasData: !!response.data,
      dataLength: Array.isArray(response.data) ? response.data.length : 'not array',
      dataType: typeof response.data,
      playerIdInData: response.data && typeof response.data === 'object' ? (response.data as any).id : 'no id'
    })
    
    if (!response.data) {
      throw new Error(`No player data found for player ${id}`)
    }
    
    // Handle both array and object responses
    if (Array.isArray(response.data)) {
      if (response.data.length === 0) {
        throw new Error(`No player data found for player ${id}`)
      }
      return response.data[0]
    } else {
      // For individual player requests, data is returned as an object directly
      return response.data as SportmonksPlayer
    }
  }

  async function getByCountry(
    countryId: number,
    params: FetchParams = {},
  ): Promise<SportmonksPlayer[]> {
    const endpoint = '/players'
    console.log('Calling getByCountry with endpoint:', endpoint)

    // Fetch players with pagination (Sportmonks supports up to 1000 per page)
    return client.fetchAllPages<SportmonksPlayer>(endpoint, {
      ...params,
      include: params.include || DEFAULT_INCLUDE,
      filters: {
        ...params.filters,
        country_id: countryId,
      },
    })
  }

  async function getByName(name: string, params: FetchParams = {}): Promise<SportmonksPlayer[]> {
    const endpoint = `/players/search/${name}`
    console.log('Calling getByName with endpoint:', endpoint)

    // Fetch players with pagination (Sportmonks supports up to 1000 per page)
    return client.fetchAllPages<SportmonksPlayer>(endpoint, {
      ...params,
      include: params.include || DEFAULT_INCLUDE,
    })
  }

  return {
    getAll,
    getById,
    getByCountry,
    getByName,
    client, // Expose client for direct API calls
  }
}
