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

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  const remainingMinutes = minutes % 60
  const remainingSeconds = seconds % 60

  return `${hours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
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
