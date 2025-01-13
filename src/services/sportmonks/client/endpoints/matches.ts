import { createSportmonksClient } from '../index'
import { FetchParams, SportmonksConfig, SportmonksMatch } from '../types'

const DEFAULT_INCLUDE =
  'participants;scores;venue;state;league;season;stage;round;group;aggregate;statistics;events;periods;lineups;metadata;weatherreport'

export function createMatchesEndpoint(config: SportmonksConfig) {
  const client = createSportmonksClient(config)

  async function getAll(params: FetchParams = {}): Promise<SportmonksMatch[]> {
    return client.fetchAllPages<SportmonksMatch>('/fixtures', {
      ...params,
      include: params.include || DEFAULT_INCLUDE,
    })
  }

  async function getById(id: number, params: FetchParams = {}): Promise<SportmonksMatch> {
    const response = await client.fetchFromApi<SportmonksMatch>(`/fixtures/${id}`, {
      ...params,
      include: params.include || DEFAULT_INCLUDE,
    })
    return response.data[0]
  }

  async function getByLeague(
    leagueId: number,
    params: FetchParams = {},
  ): Promise<SportmonksMatch[]> {
    return client.fetchAllPages<SportmonksMatch>('/fixtures', {
      ...params,
      include: params.include || DEFAULT_INCLUDE,
      filters: {
        ...params.filters,
        league_id: leagueId,
      },
    })
  }

  async function getByTeam(teamId: number, params: FetchParams = {}): Promise<SportmonksMatch[]> {
    return client.fetchAllPages<SportmonksMatch>('/fixtures', {
      ...params,
      include: params.include || DEFAULT_INCLUDE,
      filters: {
        ...params.filters,
        team_id: teamId,
      },
    })
  }

  async function getByDate(date: string, params: FetchParams = {}): Promise<SportmonksMatch[]> {
    return client.fetchAllPages<SportmonksMatch>(`/fixtures/date/${date}`, {
      ...params,
      include: params.include || DEFAULT_INCLUDE,
    })
  }

  return {
    getAll,
    getById,
    getByLeague,
    getByTeam,
    getByDate,
  }
}
