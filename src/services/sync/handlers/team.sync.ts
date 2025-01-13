import { SportmonksTeam } from '../../sportmonks/client/types'
import { TeamsEndpoint } from '../../sportmonks/client/endpoints/teams'
import { transformTeam, validateTeam } from '../../sportmonks/transformers/team.transformer'
import { BaseSyncService } from '../base.sync'
import { SyncOptions } from '../types'

export class TeamSyncService extends BaseSyncService<SportmonksTeam> {
  constructor(teamsEndpoint: TeamsEndpoint) {
    const options: SyncOptions<SportmonksTeam> = {
      collection: 'teams',
      fetchData: () => teamsEndpoint.getAll(),
      transformData: transformTeam,
      validateData: validateTeam,
      batchSize: 10,
    }

    super(options)
  }
}
