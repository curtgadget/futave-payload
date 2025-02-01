import { NINETY_DAYS_MS, ONE_DAY_MS } from '@/constants/time'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

export const CRY = async () => {
  const payload = await getPayload({
    config: configPromise,
  })

  payload.logger.info('learning!')

  payload.jobs.queue({
    task: 'syncLeagues',
    input: {},
  })

  payload.jobs.queue({
    task: 'syncTeams',
    input: {},
  })

  /*
  payload.jobs.queue({
    task: 'syncMatches',
    input: {},
  })
  */

  payload.jobs.queue({
    task: 'syncMatches',
    input: {
      startDate: new Date(Date.now() - ONE_DAY_MS).toISOString().split('T')[0],
      endDate: new Date(Date.now() + NINETY_DAYS_MS).toISOString().split('T')[0],
    },
  })

  payload.jobs.queue({
    task: 'syncPlayers',
    input: {},
  })

  payload.jobs.queue({
    task: 'syncMetadataTypes',
    input: {},
  })

  payload.jobs.queue({
    task: 'syncCountries',
    input: {},
  })

  payload.logger.info('this ran from a route')

  return Response.json({ message: 'CRYcryCRY' })
}
