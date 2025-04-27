import { createSportmonksClient } from '../index'
import { FetchParams, SportmonksConfig, SportmonksPlayer } from '../types'

const DEFAULT_INCLUDE =
  'teams;nationality;trophies;metadata;position;detailedPosition;statistics.details'

export function createPlayerEndpoint(config: SportmonksConfig) {
  const client = createSportmonksClient(config)

  async function getAll(params: FetchParams = {}): Promise<SportmonksPlayer[]> {
    return client.fetchAllPages<SportmonksPlayer>('/players', {
      ...params,
      include: params.include || DEFAULT_INCLUDE,
    })
  }

  async function getById(id: number, params: FetchParams = {}): Promise<SportmonksPlayer> {
    const response = await client.fetchFromApi<SportmonksPlayer>(`/players/${id}`, {
      ...params,
      include: params.include || DEFAULT_INCLUDE,
    })
    return response.data[0]
  }

  async function getByCountry(
    countryId: number,
    params: FetchParams = {},
  ): Promise<SportmonksPlayer[]> {
    return client.fetchAllPages<SportmonksPlayer>('/players', {
      ...params,
      include: params.include || DEFAULT_INCLUDE,
      filters: {
        ...params.filters,
        country_id: countryId,
      },
    })
  }

  async function getByName(name: string, params: FetchParams = {}): Promise<SportmonksPlayer[]> {
    return client.fetchAllPages<SportmonksPlayer>(`/players/search/${name}`, {
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
