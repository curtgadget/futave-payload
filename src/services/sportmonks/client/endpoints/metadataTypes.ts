import { SportmonksConfig, SportmonksMetadataType, SportmonksResponse, FetchParams } from '../types'
import { createSportmonksClient } from '..'

export function createMetadataTypesEndpoint(config: SportmonksConfig) {
  const client = createSportmonksClient({
    ...config,
    baseUrl: process.env.SPORTMONKS_CORE_BASE_URL,
  })

  return {
    getAll: (params?: FetchParams) =>
      client.fetchAllPages<SportmonksMetadataType>('/types', params),
    getById: (id: number, params?: FetchParams) =>
      client.fetchFromApi<SportmonksMetadataType>(`/types/${id}`, params),
  }
}
