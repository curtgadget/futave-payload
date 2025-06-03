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

    // Note: Sportmonks API returns 25 players per page regardless of per_page parameter
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
    return response.data[0]
  }

  async function getByCountry(
    countryId: number,
    params: FetchParams = {},
  ): Promise<SportmonksPlayer[]> {
    const endpoint = '/players'
    console.log('Calling getByCountry with endpoint:', endpoint)

    // Note: Sportmonks API returns 25 players per page regardless of per_page parameter
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

    // Note: Sportmonks API returns 25 players per page regardless of per_page parameter
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
  }
}
