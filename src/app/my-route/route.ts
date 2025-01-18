import configPromise from '@payload-config'
import { getPayload } from 'payload'

export const GET = async () => {
  const payload = await getPayload({
    config: configPromise,
  })

  const data = await payload.find({
    collection: 'users',
  })

  return Response.json(data)
}

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

  payload.jobs.queue({
    task: 'syncMatches',
    input: {},
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
