import { getPayload } from 'payload'
import payloadConfig from '@/payload.config'

export interface PlayerSyncCheckpointData {
  syncId: string
  currentPage: number
  totalPagesDiscovered?: number
  playersProcessed: number
  lastSyncTime: Date
  syncStartTime?: Date
  mode: 'fresh-start' | 'resuming' | 'completed' | 'rate-limited' | 'failed'
  rateLimit: {
    callsUsed: number
    resetTime?: Date
    lastCallTime?: Date
  }
  stats: {
    playersCreated: number
    playersUpdated: number
    playersFailed: number
    pagesCompleted: number
  }
  lastError?: string
  nextResumeTime?: Date
}

export class PlayerSyncCheckpointService {
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
   * Get or create the main player sync checkpoint
   */
  async getCheckpoint(syncId: string = 'player-sync-main'): Promise<PlayerSyncCheckpointData> {
    const payload = await this.getPayload()
    
    try {
      const result = await payload.find({
        collection: 'player-sync-checkpoint',
        where: {
          syncId: { equals: syncId }
        },
        limit: 1,
      })

      if (result.docs.length === 0) {
        // Create new checkpoint
        const newCheckpoint = await this.createCheckpoint(syncId)
        return newCheckpoint
      }

      return this.transformDoc(result.docs[0])
    } catch (error) {
      console.error('Error getting checkpoint:', error)
      // Return default checkpoint on error
      return this.getDefaultCheckpoint(syncId)
    }
  }

  /**
   * Create a new checkpoint
   */
  async createCheckpoint(syncId: string): Promise<PlayerSyncCheckpointData> {
    const payload = await this.getPayload()
    const checkpointData = this.getDefaultCheckpoint(syncId)
    
    try {
      const created = await payload.create({
        collection: 'player-sync-checkpoint',
        data: {
          ...checkpointData,
          syncStartTime: new Date(),
        },
      })
      
      console.log(`Created new player sync checkpoint: ${syncId}`)
      return this.transformDoc(created)
    } catch (error) {
      console.error('Error creating checkpoint:', error)
      return checkpointData
    }
  }

  /**
   * Update checkpoint with new progress
   */
  async updateCheckpoint(syncId: string, updates: Partial<PlayerSyncCheckpointData>): Promise<void> {
    const payload = await this.getPayload()
    
    try {
      // Find existing checkpoint
      const existing = await payload.find({
        collection: 'player-sync-checkpoint',
        where: {
          syncId: { equals: syncId }
        },
        limit: 1,
      })

      if (existing.docs.length === 0) {
        console.warn(`No checkpoint found for ${syncId}, creating new one`)
        await this.createCheckpoint(syncId)
        return
      }

      // Update checkpoint
      await payload.update({
        collection: 'player-sync-checkpoint',
        id: existing.docs[0].id,
        data: {
          ...updates,
          lastSyncTime: new Date(),
        },
      })

      console.log(`Updated checkpoint ${syncId}:`, {
        currentPage: updates.currentPage,
        playersProcessed: updates.playersProcessed,
        mode: updates.mode,
      })
    } catch (error) {
      console.error('Error updating checkpoint:', error)
    }
  }

  /**
   * Mark sync as completed
   */
  async markCompleted(syncId: string, finalStats: Partial<PlayerSyncCheckpointData['stats']>): Promise<void> {
    await this.updateCheckpoint(syncId, {
      mode: 'completed',
      stats: {
        playersCreated: finalStats.playersCreated || 0,
        playersUpdated: finalStats.playersUpdated || 0,
        playersFailed: finalStats.playersFailed || 0,
        pagesCompleted: finalStats.pagesCompleted || 0,
      }
    })
  }

  /**
   * Mark sync as rate limited and calculate resume time
   */
  async markRateLimited(syncId: string, resetTime: Date, callsUsed: number): Promise<void> {
    await this.updateCheckpoint(syncId, {
      mode: 'rate-limited',
      rateLimit: {
        callsUsed,
        resetTime,
        lastCallTime: new Date(),
      },
      nextResumeTime: new Date(resetTime.getTime() + 60000), // Add 1 minute buffer
    })
  }

  /**
   * Check if sync can resume (not rate limited)
   */
  async canResume(syncId: string): Promise<boolean> {
    const checkpoint = await this.getCheckpoint(syncId)
    
    if (checkpoint.mode !== 'rate-limited') {
      return true
    }

    if (!checkpoint.nextResumeTime) {
      return true
    }

    return new Date() >= checkpoint.nextResumeTime
  }

  /**
   * Reset checkpoint for fresh start
   */
  async resetCheckpoint(syncId: string): Promise<void> {
    const defaultData = this.getDefaultCheckpoint(syncId)
    await this.updateCheckpoint(syncId, {
      ...defaultData,
      syncStartTime: new Date(),
      mode: 'fresh-start',
    })
  }

  private getDefaultCheckpoint(syncId: string): PlayerSyncCheckpointData {
    return {
      syncId,
      currentPage: 1,
      playersProcessed: 0,
      lastSyncTime: new Date(),
      mode: 'fresh-start',
      rateLimit: {
        callsUsed: 0,
      },
      stats: {
        playersCreated: 0,
        playersUpdated: 0,
        playersFailed: 0,
        pagesCompleted: 0,
      },
    }
  }

  private transformDoc(doc: any): PlayerSyncCheckpointData {
    return {
      syncId: doc.syncId,
      currentPage: doc.currentPage,
      totalPagesDiscovered: doc.totalPagesDiscovered,
      playersProcessed: doc.playersProcessed,
      lastSyncTime: new Date(doc.lastSyncTime),
      syncStartTime: doc.syncStartTime ? new Date(doc.syncStartTime) : undefined,
      mode: doc.mode,
      rateLimit: {
        callsUsed: doc.rateLimit?.callsUsed || 0,
        resetTime: doc.rateLimit?.resetTime ? new Date(doc.rateLimit.resetTime) : undefined,
        lastCallTime: doc.rateLimit?.lastCallTime ? new Date(doc.rateLimit.lastCallTime) : undefined,
      },
      stats: {
        playersCreated: doc.stats?.playersCreated || 0,
        playersUpdated: doc.stats?.playersUpdated || 0,
        playersFailed: doc.stats?.playersFailed || 0,
        pagesCompleted: doc.stats?.pagesCompleted || 0,
      },
      lastError: doc.lastError,
      nextResumeTime: doc.nextResumeTime ? new Date(doc.nextResumeTime) : undefined,
    }
  }
}

// Export singleton instance
export const playerSyncCheckpointService = new PlayerSyncCheckpointService()