import { createSportmonksClient } from '../index'
import { FetchParams, SportmonksConfig, SportmonksTeam } from '../types'
import { createFilterString, combineFilterStrings } from '../utils'
import {
  TeamStatisticTypeId,
  TeamStatisticTypeIds,
  ALL_TEAM_STATISTIC_TYPE_IDS,
} from '@/constants/team'

const DEFAULT_INCLUDE =
  'coaches;players;latest;upcoming;seasons;activeseasons.league;trophies;trophies.trophy;trophies.season;trophies.league;socials;rankings;statistics.season;statistics.details'

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

  async function getWithFilter(
    filterString: string,
    params: FetchParams = {},
  ): Promise<SportmonksTeam[]> {
    return client.fetchAllPages<SportmonksTeam>('/teams', {
      ...params,
      include: params.include || DEFAULT_INCLUDE,
      filterString,
    })
  }

  async function getByStatisticTypes(
    statisticTypeIds: TeamStatisticTypeId[],
    params: FetchParams = {},
  ): Promise<SportmonksTeam[]> {
    const filterString = createFilterString('teamStatisticDetailTypes', statisticTypeIds)
    return getWithFilter(filterString, params)
  }

  async function getByWinsDrawsLosses(params: FetchParams = {}): Promise<SportmonksTeam[]> {
    return getByStatisticTypes(
      [TeamStatisticTypeIds.WINS, TeamStatisticTypeIds.DRAWS, TeamStatisticTypeIds.LOSSES],
      params,
    )
  }

  async function getByGoalStats(params: FetchParams = {}): Promise<SportmonksTeam[]> {
    return getByStatisticTypes(
      [TeamStatisticTypeIds.GOALS_FOR, TeamStatisticTypeIds.GOALS_AGAINST],
      params,
    )
  }

  async function getByCardStats(params: FetchParams = {}): Promise<SportmonksTeam[]> {
    return getByStatisticTypes(
      [TeamStatisticTypeIds.RED_CARDS, TeamStatisticTypeIds.YELLOW_CARDS],
      params,
    )
  }

  async function getByAllStats(params: FetchParams = {}): Promise<SportmonksTeam[]> {
    return getByStatisticTypes(ALL_TEAM_STATISTIC_TYPE_IDS, params)
  }

  return {
    getAll,
    getById,
    getByLeague,
    getWithFilter,
    getByStatisticTypes,
    getByWinsDrawsLosses,
    getByGoalStats,
    getByCardStats,
    getByAllStats,
  }
}
