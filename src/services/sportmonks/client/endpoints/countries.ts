import { SportmonksConfig, SportmonksCountry, FetchParams } from '../types'
import { createSportmonksClient } from '..'
import { SPORTMONKS_CORE_BASE_URL } from '@/constants/api'

export function createCountriesEndpoint(config: SportmonksConfig) {
  const client = createSportmonksClient({
    ...config,
    baseUrl: SPORTMONKS_CORE_BASE_URL,
  })

  return {
    getAll: (params?: FetchParams) => client.fetchAllPages<SportmonksCountry>('/countries', params),
    getById: (id: number, params?: FetchParams) =>
      client.fetchFromApi<SportmonksCountry>(`/countries/${id}`, params),
  }
}
