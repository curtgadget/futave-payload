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
      console.log(`Starting ${syncOptions.collection} sync`)

      let items: T[]
      try {
        payload.logger.info({
          msg: `Fetching ${syncOptions.collection} data (paginated)`,
          collection: syncOptions.collection,
        })
        console.log(`Fetching ${syncOptions.collection} data...`)

        items = await syncOptions.fetchData()

        payload.logger.info({
          msg: `Fetched ${items.length} ${syncOptions.collection}`,
          collection: syncOptions.collection,
          itemCount: items.length,
        })
        console.log(`Fetched ${items.length} ${syncOptions.collection}`)

        if (items.length <= 25) {
          payload.logger.warn({
            msg: `WARNING: Only ${items.length} items fetched. Pagination may not be working correctly.`,
            collection: syncOptions.collection,
          })
          console.warn(`WARNING: Only ${items.length} items fetched. Pagination may not be working correctly.`)
        }
      } catch (fetchError) {
        throw Object.assign(new Error('Failed to fetch data'), {
          cause: fetchError,
        })
      }

      // Process in batches to avoid memory issues
      const batchSize = syncOptions.batchSize || 100
      const totalBatches = Math.ceil(items.length / batchSize)
      const startTime = Date.now()

      payload.logger.info({
        msg: `Processing ${items.length} ${syncOptions.collection} in ${totalBatches} batches`,
        collection: syncOptions.collection,
        itemCount: items.length,
        batchSize,
        totalBatches,
      })
      console.log(`Processing ${items.length} ${syncOptions.collection} in ${totalBatches} batches (batch size: ${batchSize})`)

      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize)
        const batchNumber = Math.floor(i / batchSize) + 1
        const batchStartTime = Date.now()

        // Calculate progress percentage
        const progressPercent = Math.round((batchNumber / totalBatches) * 100)
        
        // Estimate time remaining
        const elapsedTime = Date.now() - startTime
        const avgTimePerBatch = elapsedTime / (batchNumber - 1 || 1)
        const remainingBatches = totalBatches - batchNumber
        const estimatedTimeRemaining = Math.round((avgTimePerBatch * remainingBatches) / 1000)

        payload.logger.info({
          msg: `Processing batch ${batchNumber}/${totalBatches} (${progressPercent}%) - ETA: ${estimatedTimeRemaining}s`,
          collection: syncOptions.collection,
          batch: batchNumber,
          batchSize: batch.length,
          progress: {
            percent: progressPercent,
            current: batchNumber,
            total: totalBatches,
            estimatedTimeRemaining: estimatedTimeRemaining,
          }
        })
        console.log(`Processing batch ${batchNumber}/${totalBatches} (${progressPercent}%) - ETA: ${estimatedTimeRemaining}s`)

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
            // Use the Sportmonks ID as the MongoDB _id field (integer instead of ObjectId)
            const result = (await payload.db.collections[syncOptions.collection].insertMany(
              itemsToCreate.map((item) => {
                // We intentionally set _id to the same value as id (the Sportmonks ID)
                return {
                  _id: item.id, // Use the integer ID from Sportmonks directly as _id
                  ...item,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }
              }),
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

        // Perform bulk updates if any
        if (itemsToUpdate.length > 0) {
          try {
            // Use MongoDB bulk write operations for better performance
            const bulkOps = itemsToUpdate.map((item) => ({
              updateOne: {
                filter: { _id: item.id },
                update: {
                  $set: {
                    ...item.data,
                    updatedAt: new Date(),
                  },
                },
              },
            }))

            const bulkResult = await payload.db.collections[syncOptions.collection].bulkWrite(
              bulkOps,
              { ordered: false }, // Continue on error
            )

            stats.updated += bulkResult.modifiedCount || 0

            // Log any mismatches between expected and actual updates
            if (bulkResult.modifiedCount !== itemsToUpdate.length) {
              console.warn(
                `Warning: Expected to update ${itemsToUpdate.length} items, but only updated ${bulkResult.modifiedCount}`,
              )
            }

            // Handle any write errors
            if (bulkResult.hasWriteErrors && bulkResult.hasWriteErrors()) {
              const writeErrors = bulkResult.getWriteErrors()
              for (const writeError of writeErrors) {
                stats.failed++
                stats.errors.push({
                  id: writeError.err?.op?._id || -1,
                  error: `Bulk update failed: ${writeError.errmsg}`,
                  data: {
                    errorDetails: writeError,
                  },
                })
              }
            }
          } catch (error) {
            // Fallback to individual updates if bulk update fails entirely
            console.warn('Bulk update failed, falling back to individual updates:', error)

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
        }

        const batchDuration = Date.now() - batchStartTime
        const batchRate = Math.round((batch.length / batchDuration) * 1000) // items per second

        payload.logger.info({
          msg: `Completed batch ${batchNumber}/${totalBatches}: created ${itemsToCreate.length}, updated ${itemsToUpdate.length} (${batchDuration}ms, ${batchRate} items/sec)`,
          collection: syncOptions.collection,
          batch: batchNumber,
          created: itemsToCreate.length,
          updated: itemsToUpdate.length,
          performance: {
            duration: batchDuration,
            itemsPerSecond: batchRate,
            itemsProcessed: batch.length,
          }
        })
        console.log(`  Batch ${batchNumber} completed: ${itemsToCreate.length} created, ${itemsToUpdate.length} updated (${batchDuration}ms)`)
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
      console.log(`\n✅ ${message}`)

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
