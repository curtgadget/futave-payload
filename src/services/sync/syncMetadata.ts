import { getPayload } from 'payload'
import payloadConfig from '@/payload.config'

export type SyncType = 'rivals_data' | 'h2h_data'

export interface SyncMetadata {
  syncType: SyncType
  lastSyncAt: Date
  ttlDays: number
  description?: string
}

export class SyncMetadataService {
  private payload: any

  constructor() {
    // Payload instance will be initialized when needed
  }

  private async getPayload() {
    if (!this.payload) {
      this.payload = await getPayload({ config: payloadConfig })
    }
    return this.payload
  }

  /**
   * Check if a sync is needed based on TTL
   */
  async shouldSync(syncType: SyncType): Promise<boolean> {
    const payload = await this.getPayload()
    
    try {
      const result = await payload.find({
        collection: 'sync-metadata',
        where: {
          syncType: { equals: syncType }
        },
        limit: 1,
      })

      if (result.docs.length === 0) {
        // No metadata found, sync is needed
        return true
      }

      const metadata = result.docs[0]
      const lastSync = new Date(metadata.lastSyncAt)
      const daysSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60 * 24)
      
      console.log(`${syncType}: Last sync ${Math.round(daysSinceSync)} days ago (TTL: ${metadata.ttlDays} days)`)
      
      return daysSinceSync >= metadata.ttlDays
    } catch (error) {
      console.error(`Error checking sync metadata for ${syncType}:`, error)
      // If there's an error, allow sync to proceed
      return true
    }
  }

  /**
   * Record a successful sync
   */
  async recordSync(syncType: SyncType, ttlDays: number, description?: string): Promise<void> {
    const payload = await this.getPayload()
    
    try {
      // Check if metadata already exists
      const existing = await payload.find({
        collection: 'sync-metadata',
        where: {
          syncType: { equals: syncType }
        },
        limit: 1,
      })

      const syncData = {
        syncType,
        lastSyncAt: new Date(),
        ttlDays,
        description,
      }

      if (existing.docs.length > 0) {
        // Update existing record
        await payload.update({
          collection: 'sync-metadata',
          id: existing.docs[0].id,
          data: syncData,
        })
        console.log(`Updated sync metadata for ${syncType}`)
      } else {
        // Create new record
        await payload.create({
          collection: 'sync-metadata',
          data: syncData,
        })
        console.log(`Created sync metadata for ${syncType}`)
      }
    } catch (error) {
      console.error(`Error recording sync metadata for ${syncType}:`, error)
      // Don't throw - sync operation should still be considered successful
    }
  }

  /**
   * Get sync metadata for a specific sync type
   */
  async getSyncMetadata(syncType: SyncType): Promise<SyncMetadata | null> {
    const payload = await this.getPayload()
    
    try {
      const result = await payload.find({
        collection: 'sync-metadata',
        where: {
          syncType: { equals: syncType }
        },
        limit: 1,
      })

      if (result.docs.length === 0) {
        return null
      }

      const doc = result.docs[0]
      return {
        syncType: doc.syncType,
        lastSyncAt: new Date(doc.lastSyncAt),
        ttlDays: doc.ttlDays,
        description: doc.description,
      }
    } catch (error) {
      console.error(`Error getting sync metadata for ${syncType}:`, error)
      return null
    }
  }
}

// Export a singleton instance
export const syncMetadataService = new SyncMetadataService()