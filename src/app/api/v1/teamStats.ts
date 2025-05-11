import { createTeamSubResourceEndpoint } from './utils/createTeamSubResourceEndpoint'
import { teamDataFetcher } from './services/teamDataFetcher'

const parseStatsQuery = (url: URL) => ({
  season: url.searchParams.get('season') || undefined,
})

export default createTeamSubResourceEndpoint({
  resource: 'stats',
  fetcher: teamDataFetcher.getStats,
  parseQuery: parseStatsQuery,
})
