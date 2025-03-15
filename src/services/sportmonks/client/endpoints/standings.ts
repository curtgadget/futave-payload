import { createSportmonksClient } from '../index'
import { FetchParams, SportmonksConfig, SportmonksStandings } from '../types'

export function createStandingsEndpoint(config: SportmonksConfig) {
  const client = createSportmonksClient(config)

  async function getBySeasonId(
    seasonId: number,
    params: FetchParams = {},
  ): Promise<SportmonksStandings> {
    const response = await client.fetchFromApi<SportmonksStandings>(
      `/standings/seasons/${seasonId}`,
      params,
    )
    return response.data
  }

  return {
    getBySeasonId,
  }
}
