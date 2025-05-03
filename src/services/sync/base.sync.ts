import { getPayload } from 'payload'
import config from '@/payload.config'
import { SyncOptions, SyncResult, SyncStats } from './types'
import pLimit from 'p-limit'

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
    batchSize: 100, // Default batch size for chunked processing
    concurrency: 5, // Default concurrency for API requests
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

        if (items.length <= 25) {
          payload.logger.warn({
            msg: `WARNING: Only ${items.length} items fetched. Pagination may not be working correctly.`,
            collection: syncOptions.collection,
          })
        }
      } catch (fetchError) {
        throw Object.assign(new Error('Failed to fetch data'), {
          cause: fetchError,
        })
      }

      // Process in batches to avoid memory issues
      const batchSize = syncOptions.batchSize || 100
      const totalBatches = Math.ceil(items.length / batchSize)

      payload.logger.info({
        msg: `Processing ${items.length} ${syncOptions.collection} in ${totalBatches} batches`,
        collection: syncOptions.collection,
        itemCount: items.length,
        batchSize,
        totalBatches,
      })

      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize)
        const batchNumber = Math.floor(i / batchSize) + 1

        payload.logger.info({
          msg: `Processing batch ${batchNumber}/${totalBatches}`,
          collection: syncOptions.collection,
          batch: batchNumber,
          batchSize: batch.length,
        })

        // Transform all items in the batch
        const transformedItems = await Promise.all(
          batch.map(async (item) => {
            try {
              const transformedData = await syncOptions.transformData(item)
              return {
                id: item.id,
                data: transformedData,
                success: true,
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

              return {
                id: item.id,
                success: false,
              }
            }
          }),
        )

        // Get successful transformations
        const successfulItems = transformedItems.filter((item) => item.success) as {
          id: number
          data: Record<string, any>
          success: true
        }[]

        if (successfulItems.length === 0) {
          continue
        }

        // Fetch existing records in one query
        const existingIds = successfulItems.map((item) => item.id)
        const existingQuery = await payload.find({
          collection: syncOptions.collection as any,
          where: { id: { in: existingIds } },
          limit: existingIds.length,
        })

        // Create a map for faster lookups
        const existingMap = new Map(existingQuery.docs.map((doc) => [doc.id, doc]))

        console.log(`Found ${existingMap.size}/${existingIds.length} existing records`)

        // Prepare create and update operations
        const itemsToCreate: Record<string, any>[] = []
        const itemsToUpdate: { id: number; data: Record<string, any> }[] = []

        for (const item of successfulItems) {
          if (existingMap.has(item.id)) {
            itemsToUpdate.push({
              id: item.id,
              data: item.data,
            })
          } else {
            itemsToCreate.push(item.data)
          }
        }

        console.log(
          `Batch ${batchNumber}: ${itemsToCreate.length} to create, ${itemsToUpdate.length} to update`,
        )

        // Perform bulk creates if any
        if (itemsToCreate.length > 0) {
          try {
            // Direct MongoDB insert for better performance with large datasets
            const result = (await payload.db.collections[syncOptions.collection].insertMany(
              itemsToCreate.map((item) => ({
                ...item,
                createdAt: new Date(),
                updatedAt: new Date(),
              })),
              { ordered: false }, // Continue on error
            )) as unknown as { insertedCount?: number }

            stats.created += result?.insertedCount || itemsToCreate.length

            if (
              result?.insertedCount !== undefined &&
              result.insertedCount !== itemsToCreate.length
            ) {
              console.warn(
                `Warning: Expected to insert ${itemsToCreate.length} items, but only inserted ${result.insertedCount}`,
              )
            }
          } catch (error) {
            stats.failed += itemsToCreate.length
            const formattedError = formatError(error)
            stats.errors.push({
              id: -1, // Bulk error
              error: `Bulk create failed: ${formattedError.message}`,
              data: {
                errorDetails: formattedError,
                errorStack: formattedError.stack,
                errorCause: formattedError.cause,
              },
            })
          }
        }

        // Perform updates if any
        if (itemsToUpdate.length > 0) {
          const limit = pLimit(10) // Limit concurrent updates to avoid overwhelming the DB
          const updateResults = await Promise.all(
            itemsToUpdate.map((item) =>
              limit(async () => {
                try {
                  await payload.update({
                    collection: syncOptions.collection as any,
                    where: { id: { equals: item.id } },
                    data: item.data,
                  })
                  return { success: true, id: item.id }
                } catch (error) {
                  stats.failed++
                  const formattedError = formatError(error)
                  stats.errors.push({
                    id: item.id,
                    error: formattedError.message,
                    data: {
                      errorDetails: formattedError,
                      errorStack: formattedError.stack,
                      errorCause: formattedError.cause,
                    },
                  })
                  return { success: false, id: item.id }
                }
              }),
            ),
          )

          // Count successful updates
          stats.updated += updateResults.filter((r) => r.success).length
        }

        payload.logger.info({
          msg: `Completed batch ${batchNumber}/${totalBatches}: created ${itemsToCreate.length}, updated ${itemsToUpdate.length}`,
          collection: syncOptions.collection,
          batch: batchNumber,
          created: itemsToCreate.length,
          updated: itemsToUpdate.length,
        })
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
