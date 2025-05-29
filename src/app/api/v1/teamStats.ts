import { createTeamSubResourceEndpoint } from './utils/createTeamSubResourceEndpoint'
import { teamDataFetcher } from './services/teamDataFetcher'

const parseStatsQuery = (url: URL) => ({
  season: url.searchParams.get('season') || undefined,
})

// Wrapper function to properly pass parameters to getStats
const statsWrapper = async (teamId: string, options?: { season?: string }) => {
  return teamDataFetcher.getStats(teamId, options?.season)
}

export default createTeamSubResourceEndpoint({
  resource: 'stats',
  fetcher: statsWrapper,
  parseQuery: parseStatsQuery,
})
