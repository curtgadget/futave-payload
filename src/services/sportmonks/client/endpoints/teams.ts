import { SportmonksClient } from '../index'
import { FetchParams, SportmonksTeam } from '../types'

export class TeamsEndpoint extends SportmonksClient {
  private static readonly DEFAULT_INCLUDE =
    'coaches;players;latest;upcoming;seasons;activeseasons;statistics;trophies;trophies.trophy;trophies.season;trophies.league;socials;rankings'

  async getAll(params: FetchParams = {}): Promise<SportmonksTeam[]> {
    return this.fetchAllPages<SportmonksTeam>('/teams', {
      ...params,
      include: params.include || TeamsEndpoint.DEFAULT_INCLUDE,
    })
  }

  async getById(id: number, params: FetchParams = {}): Promise<SportmonksTeam> {
    const response = await this.fetchFromApi<SportmonksTeam>(`/teams/${id}`, {
      ...params,
      include: params.include || TeamsEndpoint.DEFAULT_INCLUDE,
    })
    return response.data[0]
  }

  async getByLeague(leagueId: number, params: FetchParams = {}): Promise<SportmonksTeam[]> {
    return this.fetchAllPages<SportmonksTeam>('/teams', {
      ...params,
      include: params.include || TeamsEndpoint.DEFAULT_INCLUDE,
      filters: {
        ...params.filters,
        league_id: leagueId,
      },
    })
  }
}
