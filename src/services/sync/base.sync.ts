import { getPayload } from 'payload'
import config from '@/payload.config'
import { SyncOptions, SyncResult, SyncStats } from './types'

function createStats(): SyncStats {
  return {
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
    startTime: Date.now(),
  }
}

async function processBatch<T extends { id: number }>(
  batch: T[],
  stats: SyncStats,
  payload: any,
  options: Required<SyncOptions<T>>,
): Promise<void> {
  const batchPromises = batch.map(async (item) => {
    try {
      options.validateData(item)
      const transformedData = options.transformData(item)

      const existing = await payload.find({
        collection: options.collection,
        where: { id: { equals: item.id } },
      })

      if (existing.totalDocs > 0) {
        await payload.update({
          collection: options.collection,
          where: { id: { equals: item.id } },
          data: transformedData,
        })
        stats.updated++
      } else {
        await payload.create({
          collection: options.collection,
          data: transformedData,
        })
        stats.created++
      }
    } catch (error) {
      stats.failed++
      stats.errors.push({
        id: item.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: item,
      })
    }
  })

  await Promise.all(batchPromises)
}

export function createSyncService<T extends { id: number }>(options: SyncOptions<T>) {
  const syncOptions: Required<SyncOptions<T>> = {
    batchSize: 10,
    validateData: () => {},
    ...options,
  }

  async function sync(): Promise<SyncResult> {
    const stats = createStats()
    const payload = await getPayload({ config })

    try {
      const items = await syncOptions.fetchData()
      const batches: T[][] = []

      for (let i = 0; i < items.length; i += syncOptions.batchSize) {
        batches.push(items.slice(i, i + syncOptions.batchSize))
      }

      for (const batch of batches) {
        await processBatch(batch, stats, payload, syncOptions)
      }

      stats.endTime = Date.now()
      const duration = stats.endTime - stats.startTime

      const message = `${syncOptions.collection} sync completed in ${duration}ms: ${stats.created} created, ${stats.updated} updated, ${stats.failed} failed`

      payload.logger.info({
        msg: message,
        stats: {
          created: stats.created,
          updated: stats.updated,
          failed: stats.failed,
          totalProcessed: stats.created + stats.updated + stats.failed,
          duration,
        },
      })

      if (stats.errors.length > 0) {
        payload.logger.warn({
          msg: `${syncOptions.collection} sync errors`,
          errors: stats.errors,
        })
      }

      return {
        success: true,
        stats,
        message,
      }
    } catch (error) {
      stats.endTime = Date.now()
      const message = error instanceof Error ? error.message : 'Unknown error occurred during sync'

      payload.logger.error(`Failed to sync ${syncOptions.collection}:`, error)

      return {
        success: false,
        stats,
        message,
      }
    }
  }

  return { sync }
}
