import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { NextRequest } from 'next/server'

type PayloadTaskSlug =
  | 'syncLeagues'
  | 'syncTeams'
  | 'syncMatches'
  | 'syncPlayers'
  | 'syncActivePlayerStats'
  | 'syncMetadataTypes'
  | 'syncCountries'
  | 'syncCoaches'
  | 'syncRivals'

const validTasks: PayloadTaskSlug[] = [
  'syncLeagues',
  'syncTeams',
  'syncMatches',
  'syncPlayers',
  'syncActivePlayerStats',
  'syncMetadataTypes',
  'syncCountries',
  'syncCoaches',
  'syncRivals',
]

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ task: string }> }
) {
  const { task: taskParam } = await params
  const task = taskParam as PayloadTaskSlug

  // Validate task
  if (!validTasks.includes(task)) {
    return Response.json(
      {
        error: 'Invalid task',
        validTasks,
      },
      { status: 400 }
    )
  }

  const payload = await getPayload({ config: configPromise })

  // Check for force parameter
  const url = new URL(request.url)
  const force = url.searchParams.get('force') === 'true'

  // Check if there's already a pending or processing job for this task
  const existingJobs = await payload.find({
    collection: 'payload-jobs',
    where: {
      and: [
        {
          taskSlug: { equals: task },
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
    const existingJob = existingJobs.docs[0] as any
    const status = existingJob.processing ? 'processing' : 'queued'

    // Check if job is stuck (processing for more than 2 hours)
    const TWO_HOURS = 2 * 60 * 60 * 1000
    const jobAge = Date.now() - new Date(existingJob.updatedAt).getTime()
    const isStuck = existingJob.processing && jobAge > TWO_HOURS

    if (isStuck || force) {
      // Mark stuck/forced job as failed and create new one
      await payload.update({
        collection: 'payload-jobs',
        id: existingJob.id,
        data: {
          processing: false,
          hasError: true,
          completedAt: new Date().toISOString(),
        },
      })

      payload.logger.info(
        `Cleared ${isStuck ? 'stuck' : 'existing'} ${task} job (ID: ${existingJob.id})`
      )
    } else {
      return Response.json(
        {
          message: `Job already ${status}`,
          task,
          status,
          jobId: existingJob.id,
          hint: 'Add ?force=true to restart anyway',
        },
        { status: 409 }
      )
    }
  }

  // Parse input from request body if provided
  let input = {}
  try {
    const body = await request.json()
    input = body.input || {}
  } catch {
    // No body or invalid JSON, use empty input
  }

  // Queue the job
  const queuedJob = await payload.jobs.queue({
    task,
    input,
  })

  payload.logger.info(`Queued ${task} job`)

  return Response.json({
    message: `${task} job has been queued`,
    task,
    jobId: queuedJob.id,
  })
}
