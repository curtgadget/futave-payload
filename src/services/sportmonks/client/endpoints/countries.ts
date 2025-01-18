import { SportmonksConfig, SportmonksCountry, FetchParams } from '../types'
import { createSportmonksClient } from '..'

export function createCountriesEndpoint(config: SportmonksConfig) {
  const client = createSportmonksClient({
    ...config,
    baseUrl: 'https://api.sportmonks.com/v3/core',
  })

  return {
    getAll: (params?: FetchParams) => client.fetchAllPages<SportmonksCountry>('/countries', params),
    getById: (id: number, params?: FetchParams) =>
      client.fetchFromApi<SportmonksCountry>(`/countries/${id}`, params),
  }
}
