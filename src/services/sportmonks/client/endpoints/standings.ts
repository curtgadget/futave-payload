import { createSportmonksClient } from '../index'
import { FetchParams, SportmonksConfig, SportmonksStandings, SportmonksResponse } from '../types'

export function createStandingsEndpoint(config: SportmonksConfig) {
  const client = createSportmonksClient(config)

  async function getBySeasonId(
    seasonId: number,
    params: FetchParams = {},
  ): Promise<SportmonksStandings[]> {
    const includesParams = {
      ...params,
      include: 'participant;details;form;rule;group',
    }

    const response = await client.fetchFromApi<SportmonksStandings>(
      `/standings/seasons/${seasonId}`,
      includesParams,
    )
    return response.data
  }

  return {
    getBySeasonId,
  }
}
