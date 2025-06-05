import type { Endpoint } from 'payload'
import type { PayloadRequest } from 'payload'
import getTeamOverviewPage from './teams'
import getTeamsPage from './teamsList'
import getLeaguesPage from './leaguesList'
import getLeagueOverviewPage from './leagueOverview'
import getLeagueTablePage from './leagueTable'
import getLeagueMatchesPage from './leagueMatches'
import getLeagueTeamsPage from './leagueTeams'
import getLeagueStatsPage from './leagueStats'
import getPlayerPage from './players'
import getPlayersPage from './playersList'
import getTeamFixtures from './teamFixtures'
import getTeamSquad from './teamSquad'
import getTeamTable from './teamTable'
import getTeamStats from './teamStats'
import getMatchHandler from './match'
import getMatchesListHandler from './matchesListProper'

export type APIRouteV1 = Omit<Endpoint, 'path'> & {
  path: `/v1/${string}` // This enforces that path must start with '/v1'
  middleware?: ((req: PayloadRequest) => Promise<Response | null>)[]
}

const apiV1Routes: APIRouteV1[] = [
  getTeamOverviewPage,
  getTeamsPage,
  getLeaguesPage,
  getLeagueOverviewPage,
  getLeagueTablePage,
  getLeagueMatchesPage,
  getLeagueTeamsPage,
  getLeagueStatsPage,
  getPlayerPage,
  getPlayersPage,
  getTeamFixtures,
  getTeamSquad,
  getTeamTable,
  getTeamStats,
  getMatchHandler,
  getMatchesListHandler,
]

export default apiV1Routes
