import { SportmonksConfig, SportmonksMetadataType, SportmonksResponse, FetchParams } from '../types'
import { createSportmonksClient } from '..'
import { SPORTMONKS_CORE_BASE_URL } from '@/constants/api'

export function createMetadataTypesEndpoint(config: SportmonksConfig) {
  const client = createSportmonksClient({
    ...config,
    baseUrl: SPORTMONKS_CORE_BASE_URL,
  })

  return {
    getAll: (params?: FetchParams) =>
      client.fetchAllPages<SportmonksMetadataType>('/types', params),
    getById: (id: number, params?: FetchParams) =>
      client.fetchFromApi<SportmonksMetadataType>(`/types/${id}`, params),
  }
}
