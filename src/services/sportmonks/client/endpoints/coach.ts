import { createSportmonksClient } from '../index'
import { FetchParams, SportmonksConfig, SportmonksCoach } from '../types'

const DEFAULT_INCLUDE = 'country;nationality;teams;statistics'

/**
 * Creates a coach endpoint for the Sportmonks API
 */
export function createCoachEndpoint(config: SportmonksConfig) {
  const client = createSportmonksClient(config)

  /**
   * Get all coaches with pagination
   */
  async function getAll(params: FetchParams = {}): Promise<SportmonksCoach[]> {
    const endpoint = '/coaches'
    console.log('Fetching all coaches from Sportmonks API')
    console.log('Calling getAll with endpoint:', endpoint)

    // Try without includes to see if this resolves the 404 error
    return client.fetchAllPages<SportmonksCoach>(endpoint, {
      ...params,
      // Adding includes only if they're explicitly asked for
      include: params.include,
    })
  }

  /**
   * Get a specific coach by ID
   */
  async function getById(id: number | string, params: FetchParams = {}): Promise<SportmonksCoach> {
    const endpoint = `/coaches/${id}`
    console.log('Calling getById with endpoint:', endpoint)

    const response = await client.fetchFromApi<SportmonksCoach>(endpoint, {
      ...params,
      include: params.include,
    })
    return response.data[0]
  }

  /**
   * Get coaches by country ID
   */
  async function getByCountryId(
    countryId: number | string,
    params: FetchParams = {},
  ): Promise<SportmonksCoach[]> {
    const endpoint = `/coaches/countries/${countryId}`
    console.log(`Fetching coaches for country ID: ${countryId}`)

    return client.fetchAllPages<SportmonksCoach>(endpoint, {
      ...params,
      include: params.include,
    })
  }

  /**
   * Get coaches by name search
   */
  async function getByName(name: string, params: FetchParams = {}): Promise<SportmonksCoach[]> {
    const endpoint = `/coaches/search/${name}`
    console.log(`Fetching coaches with name: ${name}`)

    return client.fetchAllPages<SportmonksCoach>(endpoint, {
      ...params,
      include: params.include,
    })
  }

  /**
   * Get latest updated coaches
   */
  async function getLatest(params: FetchParams = {}): Promise<SportmonksCoach[]> {
    const endpoint = '/coaches/latest'
    console.log('Fetching latest updated coaches')

    return client.fetchAllPages<SportmonksCoach>(endpoint, {
      ...params,
      include: params.include,
    })
  }

  return {
    getAll,
    getById,
    getByCountryId,
    getByName,
    getLatest,
  }
}
