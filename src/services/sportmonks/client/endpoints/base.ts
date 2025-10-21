import { createSportmonksClient } from '../index'
import { FetchParams, SportmonksConfig, SportmonksResponse } from '../types/core'

/**
 * Creates a base endpoint for Sportmonks API entities
 * Provides common operations like getAll and getById
 */
export function createBaseEndpoint<T>(config: SportmonksConfig) {
  const client = createSportmonksClient(config)

  /**
   * Get all entities of a type with pagination
   */
  async function getAll(endpoint: string, params: FetchParams = {}): Promise<T[]> {
    console.log(`Calling getAll with endpoint: ${endpoint}`)
    return client.fetchAllPages<T>(endpoint, params)
  }

  /**
   * Get a specific entity by ID
   */
  async function getById(
    endpoint: string,
    id: number | string,
    params: FetchParams = {},
  ): Promise<T> {
    const fullEndpoint = `${endpoint}/${id}`
    const response = await client.fetchFromApi<SportmonksResponse<T[]>>(fullEndpoint, params)
    return response.data[0] as T
  }

  return {
    getAll,
    getById,
  }
}
