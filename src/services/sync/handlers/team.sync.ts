import { SportmonksTeam } from '../../sportmonks/client/types'
import { createTeamsEndpoint } from '../../sportmonks/client/endpoints/teams'
import { transformTeam } from '../../sportmonks/transformers/team.transformer'
import { createSyncService } from '../base.sync'
import { SportmonksConfig } from '../../sportmonks/client/types'

export function createTeamSync(config: SportmonksConfig) {
  const teamsEndpoint = createTeamsEndpoint(config)

  return createSyncService<SportmonksTeam>({
    collection: 'teams',
    fetchData: () => teamsEndpoint.getAll(),
    transformData: transformTeam,
    batchSize: 10,
  })
}
