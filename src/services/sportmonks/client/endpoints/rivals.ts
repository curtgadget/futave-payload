import { createSportmonksClient } from '../index'
import { FetchParams, SportmonksConfig, SportmonksRival } from '../types'

const DEFAULT_INCLUDE = 'team;rival'

export function createRivalsEndpoint(config: SportmonksConfig) {
  const client = createSportmonksClient(config)

  async function getAll(params: FetchParams = {}): Promise<SportmonksRival[]> {
    return client.fetchAllPages<SportmonksRival>('/rivals', {
      ...params,
      include: params.include || DEFAULT_INCLUDE,
    })
  }

  async function getByTeamId(teamId: number, params: FetchParams = {}): Promise<SportmonksRival[]> {
    return client.fetchAllPages<SportmonksRival>(`/rivals/teams/${teamId}`, {
      ...params,
      include: params.include || DEFAULT_INCLUDE,
    })
  }

  return {
    getAll,
    getByTeamId,
  }
}