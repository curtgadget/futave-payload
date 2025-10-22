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
  | 'syncCoaches'

type PayloadQueueSlug = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'backfill' | 'dev'

type SyncJob = {
  task: PayloadTaskSlug
  input?: Record<string, unknown>
  queue?: PayloadQueueSlug
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  const remainingMinutes = minutes % 60
  const remainingSeconds = seconds % 60

  return `${hours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

const syncJobs: SyncJob[] = [
  // HOURLY: Time-sensitive data
  { task: 'syncMatches', queue: 'hourly' },

  // DAILY: Fresh data needed daily
  { task: 'syncActivePlayerStats', queue: 'daily' },
  { task: 'syncTeams', queue: 'daily' },

  // WEEKLY: Complete refresh
  { task: 'syncPlayers', queue: 'weekly' },
  { task: 'syncLeagues', queue: 'weekly' },
  { task: 'syncCoaches', queue: 'weekly' },

  // MONTHLY: Static/reference data
  { task: 'syncMetadataTypes', queue: 'monthly' },
  { task: 'syncCountries', queue: 'monthly' },
  { task: 'syncRivals', queue: 'monthly' },
]

export async function previewHandler() {
  const payload = await getPayload({
    config: configPromise,
  })

  payload.logger.info('Fetching current queue state')

  // Get all jobs that are either processing or queued
  const jobs = await payload.find({
    collection: 'payload-jobs',
    where: {
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
  })

  const processingJobs = jobs.docs.filter((job) => job.processing)
  const queuedJobs = jobs.docs.filter((job) => !job.processing)

  payload.logger.info(
    `Found ${processingJobs.length} processing jobs and ${queuedJobs.length} queued jobs`,
  )

  return Response.json({
    message: 'Current queue state retrieved',
    processingJobs: processingJobs.map((job) => ({
      task: job.taskSlug,
      queue: job.queue,
      startedAt: job.createdAt,
      duration: formatDuration(Date.now() - new Date(job.createdAt).getTime()),
    })),
    queuedJobs: queuedJobs.map((job) => ({
      task: job.taskSlug,
      queue: job.queue,
      queuedAt: job.createdAt,
    })),
  })
}

export const GET = previewHandler
