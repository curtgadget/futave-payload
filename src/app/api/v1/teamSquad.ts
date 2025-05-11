import { createTeamSubResourceEndpoint } from './utils/createTeamSubResourceEndpoint'
import { teamDataFetcher } from './services/teamDataFetcher'

export default createTeamSubResourceEndpoint({
  resource: 'squad',
  fetcher: teamDataFetcher.getSquad,
})
