import { NINETY_DAYS_MS, ONE_DAY_MS } from '@/constants/time'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

type PayloadTaskSlug =
  | 'inline'
  | 'syncLeagues'
  | 'syncTeams'
  | 'syncMatches'
  | 'syncPlayers'
  | 'syncMetadataTypes'
  | 'syncCountries'

type PayloadQueueSlug = 'hourly' | 'nightly' | 'daily'

type SyncJob = {
  task: PayloadTaskSlug
  input?: Record<string, unknown>
  queue?: PayloadQueueSlug
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

  const queuedJobs = []
  const skippedJobs = []

  for (const job of syncJobs) {
    // Check if there's already a pending or processing job
    const existingJobs = await payload.find({
      collection: 'payload-jobs',
      where: {
        and: [
          {
            taskSlug: { equals: job.task },
          },
          {
            or: [
              {
                // Job is currently processing
                processing: { equals: true },
              },
              {
                // Job is queued but not started yet
                and: [
                  { processing: { equals: false } },
                  { completedAt: { exists: false } },
                  { hasError: { equals: false } },
                ],
              },
            ],
          },
        ],
      },
    })

    if (existingJobs.docs.length > 0) {
      const existingJob = existingJobs.docs[0]
      const status = existingJob.processing ? 'processing' : 'queued'
      payload.logger.info(`Skipping ${job.task} - job already ${status}`)
      skippedJobs.push(job)
      continue
    }

    await payload.jobs.queue({
      task: job.task as PayloadTaskSlug,
      input: job.input || {},
      ...(job.queue ? { queue: job.queue } : {}),
    })
    queuedJobs.push(job)
  }

  payload.logger.info(
    `Queued ${queuedJobs.length} jobs, skipped ${skippedJobs.length} already queued jobs`,
  )

  return Response.json({
    message: 'Sync jobs have been processed',
    queuedJobs: queuedJobs.map((job) => ({ task: job.task, queue: job.queue })),
    skippedJobs: skippedJobs.map((job) => ({ task: job.task, queue: job.queue })),
  })
}

export const GET = syncAllHandler
