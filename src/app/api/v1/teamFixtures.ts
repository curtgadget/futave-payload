import { createTeamSubResourceEndpoint } from './utils/createTeamSubResourceEndpoint'
import { teamDataFetcher } from './services/teamDataFetcher'

const parseFixturesQuery = (url: URL) => ({
  page: parseInt(url.searchParams.get('page') || '1', 10),
  limit: parseInt(url.searchParams.get('limit') || '10', 10),
  type: ['all', 'past', 'upcoming'].includes(url.searchParams.get('type') || '')
    ? url.searchParams.get('type')
    : 'auto', // Smart default: upcoming first, fall back to past
  includeNextMatch: url.searchParams.get('includeNextMatch') === 'true',
})

export default createTeamSubResourceEndpoint({
  resource: 'fixtures',
  fetcher: teamDataFetcher.getFixtures,
  parseQuery: parseFixturesQuery,
})
