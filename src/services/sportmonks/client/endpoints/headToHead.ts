import { createSportmonksClient } from '../index'
import { FetchParams, SportmonksConfig, SportmonksMatch } from '../types'

const DEFAULT_INCLUDE = 'participants;scores.participant'

export function createHeadToHeadEndpoint(config: SportmonksConfig) {
  const client = createSportmonksClient(config)

  async function get(
    teamId1: number, 
    teamId2: number, 
    params: FetchParams = {}
  ): Promise<SportmonksMatch[]> {
    return client.fetchAllPages<SportmonksMatch>(
      `/fixtures/head-to-head/${teamId1}/${teamId2}`,
      {
        ...params,
        include: params.include || DEFAULT_INCLUDE,
      }
    )
  }

  async function getRecent(
    teamId1: number,
    teamId2: number,
    limit: number = 10,
    params: FetchParams = {}
  ): Promise<SportmonksMatch[]> {
    // Sportmonks returns matches in descending order (most recent first)
    const allMatches = await get(teamId1, teamId2, params)
    return allMatches.slice(0, limit)
  }

  return {
    get,
    getRecent,
  }
}