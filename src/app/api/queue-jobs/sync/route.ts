import { NINETY_DAYS_MS, ONE_DAY_MS } from '@/constants/time'
import configPromise from '@payload-config'
import { getPayload, PayloadRequest } from 'payload'
import { NextRequest } from 'next/server'
import { createSyncAuthMiddleware } from '@/utilities/syncAuth'

type PayloadTaskSlug =
  | 'inline'
  | 'syncLeagues'
  | 'syncTeams'
  | 'syncMatches'
  | 'syncPlayers'
  | 'syncActivePlayerStats'
  | 'syncMetadataTypes'
  | 'syncCountries'
  | 'syncCoaches'
  | 'syncRivals'

type PayloadQueueSlug = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'backfill' | 'dev'

type SyncJob = {
  task: PayloadTaskSlug
  input?: Record<string, unknown>
  queue?: PayloadQueueSlug
}

const syncJobs: SyncJob[] = [
  // HOURLY QUEUE: Time-sensitive data (live scores, new fixtures)
  // Runs: Every hour during match days
  {
    task: 'syncMatches',
    input: {
      startDate: new Date(Date.now() - ONE_DAY_MS).toISOString().split('T')[0],
      endDate: new Date(Date.now() + NINETY_DAYS_MS).toISOString().split('T')[0],
      calculateWaveScores: true,
    },
    queue: 'hourly',
  },

  // DAILY QUEUE: Fresh data needed daily
  // Runs: Once per day (2 AM)
  { task: 'syncActivePlayerStats', queue: 'daily' }, // ~5k active players, 5-10 min
  { task: 'syncTeams', queue: 'daily' }, // Team form, transfers, ~30-60 min

  // WEEKLY QUEUE: Complete refresh, less time-sensitive
  // Runs: Sunday 2 AM
  { task: 'syncPlayers', queue: 'weekly' }, // Full 220k players, ~60 min
  { task: 'syncLeagues', queue: 'weekly' }, // League metadata, fast
  { task: 'syncCoaches', queue: 'weekly' }, // Coach updates, fast

  // MONTHLY QUEUE: Static/reference data
  // Runs: 1st of month or on-demand
  { task: 'syncMetadataTypes', queue: 'monthly' }, // Rarely changes
  { task: 'syncCountries', queue: 'monthly' }, // Rarely changes
  { task: 'syncRivals', queue: 'monthly' }, // Rarely changes
]

export async function syncAllHandler(req: NextRequest | PayloadRequest) {
  // Verify sync token using middleware pattern (same as v1 API auth)
  const syncAuth = createSyncAuthMiddleware()
  const authResult = syncAuth(req)
  if (authResult) {
    return authResult // Return 401 response
  }

  const payload = await getPayload({ config: configPromise })
  let queueParam: string | null = null

  // Support both NextRequest (API route) and PayloadRequest (job system)
  if ('url' in req) {
    // NextRequest
    const urlString = typeof req.url === 'string' ? req.url : ''
    const url = new URL(urlString)
    queueParam = url.searchParams.get('queue')
  } else if ('query' in req) {
    // PayloadRequest (Express-style)
    queueParam = (req.query?.queue as string | undefined) || null
  }

  if (queueParam === 'backfill') {
    // Only queue the backfill job
    const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000
    const startDate = new Date(Date.now() - ONE_YEAR_MS).toISOString().split('T')[0]
    const endDate = new Date().toISOString().split('T')[0]

    await payload.jobs.queue({
      task: 'syncMatches',
      input: {
        startDate,
        endDate,
        backfill: true,
      },
      queue: 'backfill',
    })

    return Response.json({
      message: 'Backfill job has been queued',
      job: { task: 'syncMatches', queue: 'backfill', startDate, endDate },
    })
  }

  // If the dev queue is requested, handle dev-specific jobs
  if (queueParam === 'dev') {
    // Currently no dev queue jobs - placeholder for future dev testing
    return Response.json({
      message: 'No dev queue jobs configured',
    })
  }

  // Normal sync logic
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
