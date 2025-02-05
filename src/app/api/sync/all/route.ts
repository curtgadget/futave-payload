import { NINETY_DAYS_MS, ONE_DAY_MS } from '@/constants/time'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

type SyncJob = {
  task: string
  input?: Record<string, unknown>
  queue?: string
}

const syncJobs: SyncJob[] = [
  { task: 'syncLeagues' },
  { task: 'syncTeams' },
  {
    task: 'syncMatches',
    input: {
      startDate: new Date(Date.now() - ONE_DAY_MS).toISOString().split('T')[0],
      endDate: new Date(Date.now() + NINETY_DAYS_MS).toISOString().split('T')[0],
    },
    queue: 'hourly',
  },
  { task: 'syncPlayers', queue: 'nightly' },
  { task: 'syncMetadataTypes' },
  { task: 'syncCountries' },
]

export async function syncAllHandler() {
  const payload = await getPayload({
    config: configPromise,
  })

  payload.logger.info('Starting full data sync')

  syncJobs.forEach((job) => {
    payload.jobs.queue({
      task: job.task,
      input: job.input || {},
      ...(job.queue ? { queue: job.queue } : {}),
    })
  })

  payload.logger.info('All sync jobs have been queued')

  return Response.json({
    message: 'All sync jobs have been queued successfully',
    jobs: syncJobs.map((job) => ({ task: job.task, queue: job.queue })),
  })
}

export const GET = syncAllHandler
