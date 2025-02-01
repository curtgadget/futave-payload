import { createSportmonksClient } from '../index'
import { FetchParams, SportmonksConfig, SportmonksLeague } from '../types'

const DEFAULT_INCLUDE = 'stages;latest;upcoming;inplay;today;currentseason.teams;seasons'

export function createLeaguesEndpoint(config: SportmonksConfig) {
  const client = createSportmonksClient(config)

  async function getAll(params: FetchParams = {}): Promise<SportmonksLeague[]> {
    return client.fetchAllPages<SportmonksLeague>('/leagues', {
      ...params,
      include: params.include || DEFAULT_INCLUDE,
    })
  }

  async function getById(id: number, params: FetchParams = {}): Promise<SportmonksLeague> {
    const response = await client.fetchFromApi<SportmonksLeague>(`/leagues/${id}`, {
      ...params,
      include: params.include || DEFAULT_INCLUDE,
    })
    return response.data[0]
  }

  async function getByCountry(
    countryId: number,
    params: FetchParams = {},
  ): Promise<SportmonksLeague[]> {
    return client.fetchAllPages<SportmonksLeague>('/leagues', {
      ...params,
      include: params.include || DEFAULT_INCLUDE,
      filters: {
        ...params.filters,
        country_id: countryId,
      },
    })
  }

  return {
    getAll,
    getById,
    getByCountry,
  }
}
