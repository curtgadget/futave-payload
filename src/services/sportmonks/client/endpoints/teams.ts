import { createSportmonksClient } from '../index'
import { FetchParams, SportmonksConfig, SportmonksTeam } from '../types'

const DEFAULT_INCLUDE =
  'coaches;players;latest;upcoming;seasons;activeseasons;statistics;trophies;trophies.trophy;trophies.season;trophies.league;socials;rankings'

export function createTeamsEndpoint(config: SportmonksConfig) {
  const client = createSportmonksClient(config)

  async function getAll(params: FetchParams = {}): Promise<SportmonksTeam[]> {
    return client.fetchAllPages<SportmonksTeam>('/teams', {
      ...params,
      include: params.include || DEFAULT_INCLUDE,
    })
  }

  async function getById(id: number, params: FetchParams = {}): Promise<SportmonksTeam> {
    const response = await client.fetchFromApi<SportmonksTeam>(`/teams/${id}`, {
      ...params,
      include: params.include || DEFAULT_INCLUDE,
    })
    return response.data[0]
  }

  async function getByLeague(
    leagueId: number,
    params: FetchParams = {},
  ): Promise<SportmonksTeam[]> {
    return client.fetchAllPages<SportmonksTeam>('/teams', {
      ...params,
      include: params.include || DEFAULT_INCLUDE,
      filters: {
        ...params.filters,
        league_id: leagueId,
      },
    })
  }

  return {
    getAll,
    getById,
    getByLeague,
  }
}
