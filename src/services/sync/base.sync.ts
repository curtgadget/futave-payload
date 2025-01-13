import { getPayload } from 'payload'
import config from '@/payload.config'
import { SyncOptions, SyncResult, SyncStats } from './types'

export class BaseSyncService<T extends { id: number }> {
  protected readonly options: Required<SyncOptions<T>>

  constructor(options: SyncOptions<T>) {
    this.options = {
      batchSize: 10,
      validateData: () => {},
      ...options,
    }
  }

  protected createStats(): SyncStats {
    return {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
      startTime: Date.now(),
    }
  }

  protected async processBatch(batch: T[], stats: SyncStats, payload: any): Promise<void> {
    const batchPromises = batch.map(async (item) => {
      try {
        this.options.validateData(item)
        const transformedData = this.options.transformData(item)

        const existing = await payload.find({
          collection: this.options.collection,
          where: { id: { equals: item.id } },
        })

        if (existing.totalDocs > 0) {
          await payload.update({
            collection: this.options.collection,
            where: { id: { equals: item.id } },
            data: transformedData,
          })
          stats.updated++
        } else {
          await payload.create({
            collection: this.options.collection,
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

  public async sync(): Promise<SyncResult> {
    const stats = this.createStats()
    const payload = await getPayload({ config })

    try {
      const items = await this.options.fetchData()
      const batches: T[][] = []

      for (let i = 0; i < items.length; i += this.options.batchSize) {
        batches.push(items.slice(i, i + this.options.batchSize))
      }

      for (const batch of batches) {
        await this.processBatch(batch, stats, payload)
      }

      stats.endTime = Date.now()
      const duration = stats.endTime - stats.startTime

      const message = `${this.options.collection} sync completed in ${duration}ms: ${stats.created} created, ${stats.updated} updated, ${stats.failed} failed`

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
          msg: `${this.options.collection} sync errors`,
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

      payload.logger.error(`Failed to sync ${this.options.collection}:`, error)

      return {
        success: false,
        stats,
        message,
      }
    }
  }
}
