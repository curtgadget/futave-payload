import { createTeamSubResourceEndpoint } from './utils/createTeamSubResourceEndpoint'
import { teamDataFetcher } from './services/teamDataFetcher'

const parseFixturesQuery = (url: URL) => ({
  limit: parseInt(url.searchParams.get('limit') || '10', 10),
  before: url.searchParams.get('before') || undefined,
  after: url.searchParams.get('after') || undefined,
  type: ['all', 'past', 'upcoming'].includes(url.searchParams.get('type') || '')
    ? url.searchParams.get('type')
    : 'all',
  includeResults: url.searchParams.get('includeResults') !== 'false',
})

export default createTeamSubResourceEndpoint({
  resource: 'fixtures',
  fetcher: teamDataFetcher.getFixtures,
  parseQuery: parseFixturesQuery,
})
