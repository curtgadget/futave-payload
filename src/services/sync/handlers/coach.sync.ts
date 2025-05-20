import { SportmonksCoach } from '../../sportmonks/client/types'
import { createCoachEndpoint } from '../../sportmonks/client/endpoints/coach'
import { transformCoach } from '../../sportmonks/transformers/coach.transformer'
import { createSyncService } from '../base.sync'
import { SportmonksConfig } from '../../sportmonks/client/types'

export function createCoachSync(config: SportmonksConfig) {
  const coachEndpoint = createCoachEndpoint(config)

  // Fetch all coaches from the Sportmonks API
  async function fetchAllCoaches() {
    // Sportmonks API returns 25 coaches per page, pagination handled by the client
    const coaches = await coachEndpoint.getAll()
    return coaches
  }

  return createSyncService<SportmonksCoach>({
    collection: 'coaches',
    fetchData: fetchAllCoaches,
    transformData: transformCoach,
    batchSize: 100,
    concurrency: 10,
  })
}
