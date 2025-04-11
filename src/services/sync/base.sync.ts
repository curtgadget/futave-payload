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

export function createSyncService<T extends { id: number }>(options: SyncOptions<T>) {
  const syncOptions: SyncOptions<T> = {
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
        payload.logger.info({
          msg: `Fetching ${syncOptions.collection} data (paginated)`,
          collection: syncOptions.collection,
        })

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

      payload.logger.info({
        msg: `Processing ${items.length} ${syncOptions.collection}`,
        collection: syncOptions.collection,
        itemCount: items.length,
      })

      await Promise.all(
        items.map(async (item) => {
          try {
            const transformedData = await syncOptions.transformData(item)
            const existing = await payload.find({
              collection: syncOptions.collection as any,
              where: { id: { equals: item.id } },
            })

            if (existing.totalDocs > 0) {
              await payload.update({
                collection: syncOptions.collection as any,
                where: { id: { equals: item.id } },
                data: transformedData,
              })
              stats.updated++
            } else {
              await payload.create({
                collection: syncOptions.collection as any,
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
        }),
      )

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
