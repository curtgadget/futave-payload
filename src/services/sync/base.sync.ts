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

function formatError(error: unknown): { message: string; stack?: string; cause?: unknown } {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    }
  }
  return { message: String(error) }
}

async function processBatch<T extends { id: number }>(
  batch: T[],
  stats: SyncStats,
  payload: any,
  options: Required<SyncOptions<T>>,
): Promise<void> {
  const batchPromises = batch.map(async (item) => {
    try {
      // Transform
      const transformedData = options.transformData(item)

      // Check if exists
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
      const formattedError = formatError(error)

      stats.errors.push({
        id: item.id,
        error: formattedError.message,
        data: {
          originalItem: item,
          errorDetails: formattedError,
          errorStack: formattedError.stack,
          errorCause: formattedError.cause,
        },
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
      payload.logger.info({
        msg: `Starting ${syncOptions.collection} sync`,
        collection: syncOptions.collection,
      })

      let items: T[]
      try {
        items = await syncOptions.fetchData()
        payload.logger.info({
          msg: `Fetched ${items.length} ${syncOptions.collection}`,
          collection: syncOptions.collection,
          itemCount: items.length,
        })
      } catch (fetchError) {
        throw Object.assign(new Error('Failed to fetch data'), {
          cause: fetchError,
        })
      }

      const batches: T[][] = []
      for (let i = 0; i < items.length; i += syncOptions.batchSize) {
        batches.push(items.slice(i, i + syncOptions.batchSize))
      }

      payload.logger.info({
        msg: `Processing ${syncOptions.collection} in batches`,
        collection: syncOptions.collection,
        batchCount: batches.length,
        batchSize: syncOptions.batchSize,
      })

      for (const [index, batch] of batches.entries()) {
        payload.logger.info({
          msg: `Processing batch ${index + 1}/${batches.length}`,
          collection: syncOptions.collection,
          batchNumber: index + 1,
          totalBatches: batches.length,
          itemCount: batch.length,
        })
        await processBatch(batch, stats, payload, syncOptions)
      }

      stats.endTime = Date.now()
      const duration = stats.endTime - stats.startTime

      const message = `${syncOptions.collection} sync completed in ${duration}ms: ${stats.created} created, ${stats.updated} updated, ${stats.failed} failed`

      payload.logger.info({
        msg: message,
        collection: syncOptions.collection,
        stats: {
          created: stats.created,
          updated: stats.updated,
          failed: stats.failed,
          totalProcessed: stats.created + stats.updated + stats.failed,
          duration,
          errorCount: stats.errors.length,
        },
      })

      if (stats.errors.length > 0) {
        payload.logger.warn({
          msg: `${syncOptions.collection} sync errors`,
          collection: syncOptions.collection,
          errorCount: stats.errors.length,
          errors: stats.errors.map((error) => ({
            itemId: error.id,
            error: error.error,
            details: error.data,
          })),
        })
      }

      return {
        success: true,
        stats,
        message,
      }
    } catch (error) {
      stats.endTime = Date.now()
      const formattedError = formatError(error)
      const message = `Failed to sync ${syncOptions.collection}: ${formattedError.message}`

      payload.logger.error({
        msg: message,
        collection: syncOptions.collection,
        error: formattedError,
        stats: {
          created: stats.created,
          updated: stats.updated,
          failed: stats.failed,
          duration: stats.endTime - stats.startTime,
        },
      })

      return {
        success: false,
        stats,
        message,
      }
    }
  }

  return { sync }
}
