import type { Endpoint } from 'payload'
import type { PayloadRequest } from 'payload'
import getTeamPage from './teams'
import getTeamsPage from './teamsList'
import getLeaguePage from './leagues'
import getLeaguesPage from './leaguesList'
import getPlayerPage from './players'
import getPlayersPage from './playersList'
import getTeamFixtures from './teamFixtures'
import getTeamSquad from './teamSquad'
import getTeamTable from './teamTable'
import getTeamStats from './teamStats'

export type APIRouteV1 = Omit<Endpoint, 'path'> & {
  path: `/v1/${string}` // This enforces that path must start with '/v1'
  middleware?: ((req: PayloadRequest) => Promise<Response | null>)[]
}

const apiV1Routes: APIRouteV1[] = [
  getTeamPage,
  getTeamsPage,
  getLeaguePage,
  getLeaguesPage,
  getPlayerPage,
  getPlayersPage,
  getTeamFixtures,
  getTeamSquad,
  getTeamTable,
  getTeamStats,
]

export default apiV1Routes
