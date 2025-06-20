import { SportmonksPlayer } from '../../sportmonks/client/types'
import { createPlayerEndpoint } from '../../sportmonks/client/endpoints/player'
import { transformPlayer } from '../../sportmonks/transformers/player.transformer'
import { createSyncService } from '../base.sync'
import { SportmonksConfig } from '../../sportmonks/client/types'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { playerSyncCheckpointService, PlayerSyncCheckpointData } from './playerSyncCheckpoint'

export type ResumablePlayerSyncOptions = {
  resetCheckpoint?: boolean // Force fresh start
  maxPagesPerRun?: number // Limit pages per execution (for rate limiting)
  syncId?: string // Custom sync ID for parallel syncs
}

interface PlayerSyncResult {
  success: boolean
  message: string
  stats: {
    created: number
    updated: number
    failed: number
    errors: string[]
    startTime: number
    endTime?: number
    pagesProcessed: number
    totalPlayersProcessed: number
    isComplete: boolean
    nextResumeTime?: Date
  }
}

export function createResumablePlayerSync(
  sportmonksConfig: SportmonksConfig, 
  options: ResumablePlayerSyncOptions = {}
) {
  const playerEndpoint = createPlayerEndpoint(sportmonksConfig)
  const syncId = options.syncId || 'player-sync-main'
  const maxPagesPerRun = options.maxPagesPerRun || 2800 // ~2800 calls leaving buffer for other endpoints
  
  async function resumablePlayerSync(): Promise<PlayerSyncResult> {
    const startTime = Date.now()
    let stats = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as string[],
      startTime,
      pagesProcessed: 0,
      totalPlayersProcessed: 0,
      isComplete: false,
    }

    try {
      // Check if we can resume
      const canResume = await playerSyncCheckpointService.canResume(syncId)
      if (!canResume) {
        const checkpoint = await playerSyncCheckpointService.getCheckpoint(syncId)
        return {
          success: true,
          message: `Sync is rate limited. Resume after ${checkpoint.nextResumeTime?.toISOString()}`,
          stats: {
            ...stats,
            nextResumeTime: checkpoint.nextResumeTime,
          }
        }
      }

      // Get or create checkpoint
      let checkpoint: PlayerSyncCheckpointData
      if (options.resetCheckpoint) {
        await playerSyncCheckpointService.resetCheckpoint(syncId)
        checkpoint = await playerSyncCheckpointService.getCheckpoint(syncId)
        console.log('🔄 Starting fresh player sync (checkpoint reset)')
      } else {
        checkpoint = await playerSyncCheckpointService.getCheckpoint(syncId)
        if (checkpoint.mode === 'completed') {
          console.log('✅ Player sync already completed. Use resetCheckpoint=true to start fresh.')
          return {
            success: true,
            message: 'Sync already completed',
            stats: {
              ...stats,
              isComplete: true,
              totalPlayersProcessed: checkpoint.playersProcessed,
            }
          }
        }
        console.log(`📄 Resuming player sync from page ${checkpoint.currentPage}`)
      }

      // Update checkpoint to resuming mode
      await playerSyncCheckpointService.updateCheckpoint(syncId, {
        mode: 'resuming',
      })

      let currentPage = checkpoint.currentPage
      let totalPlayersThisRun = 0
      let pagesThisRun = 0

      // Process pages until rate limit or completion
      while (pagesThisRun < maxPagesPerRun) {
        try {
          console.log(`📥 Fetching page ${currentPage}...`)
          
          // Fetch single page
          const response = await playerEndpoint.client.fetchFromApi('/players', {
            page: currentPage,
            per_page: 50,
            include: 'teams;nationality;trophies;trophies.season;trophies.trophy;metadata;position;detailedPosition;statistics.details'
          })

          if (!response.data || !Array.isArray(response.data)) {
            console.error(`Page ${currentPage}: Invalid response data`)
            break
          }

          const playersOnPage = response.data.length
          console.log(`📥 Page ${currentPage}: ${playersOnPage} players`)

          if (playersOnPage === 0) {
            // No more players, sync complete
            console.log('✅ No more players found - sync complete!')
            await playerSyncCheckpointService.markCompleted(syncId, {
              pagesCompleted: checkpoint.stats.pagesCompleted + pagesThisRun,
              playersCreated: checkpoint.stats.playersCreated + stats.created,
              playersUpdated: checkpoint.stats.playersUpdated + stats.updated,
              playersFailed: checkpoint.stats.playersFailed + stats.failed,
            })
            stats.isComplete = true
            break
          }

          // Store total pages if discovered
          if (response.pagination?.total_pages && !checkpoint.totalPagesDiscovered) {
            await playerSyncCheckpointService.updateCheckpoint(syncId, {
              totalPagesDiscovered: response.pagination.total_pages,
            })
            console.log(`🔍 Discovered total pages: ${response.pagination.total_pages}`)
          }

          // Process players on this page
          const payload = await getPayload({ config })
          let pageCreated = 0
          let pageUpdated = 0
          let pageFailed = 0

          for (const sportmonksPlayer of response.data) {
            try {
              const transformedPlayer = transformPlayer(sportmonksPlayer)
              
              // Check if player exists
              const existing = await payload.find({
                collection: 'players',
                where: { id: { equals: transformedPlayer.id } },
                limit: 1,
              })

              if (existing.docs.length > 0) {
                // Update existing player
                await payload.update({
                  collection: 'players',
                  id: existing.docs[0].id,
                  data: transformedPlayer,
                })
                pageUpdated++
              } else {
                // Create new player
                await payload.create({
                  collection: 'players',
                  data: transformedPlayer,
                })
                pageCreated++
              }
            } catch (error) {
              pageFailed++
              const errorMsg = `Player ${sportmonksPlayer.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
              stats.errors.push(errorMsg)
              console.error(errorMsg)
            }
          }

          stats.created += pageCreated
          stats.updated += pageUpdated
          stats.failed += pageFailed
          totalPlayersThisRun += playersOnPage
          pagesThisRun++

          // Update checkpoint after each page
          await playerSyncCheckpointService.updateCheckpoint(syncId, {
            currentPage: currentPage + 1,
            playersProcessed: checkpoint.playersProcessed + totalPlayersThisRun,
            rateLimit: {
              callsUsed: response.rate_limit?.remaining ? (3000 - response.rate_limit.remaining) : checkpoint.rateLimit.callsUsed + 1,
              lastCallTime: new Date(),
              resetTime: response.rate_limit?.resets_in_seconds ? 
                new Date(Date.now() + (response.rate_limit.resets_in_seconds * 1000)) : 
                checkpoint.rateLimit.resetTime,
            },
            stats: {
              playersCreated: checkpoint.stats.playersCreated + stats.created,
              playersUpdated: checkpoint.stats.playersUpdated + stats.updated,
              playersFailed: checkpoint.stats.playersFailed + stats.failed,
              pagesCompleted: checkpoint.stats.pagesCompleted + pagesThisRun,
            }
          })

          console.log(`✅ Page ${currentPage} complete: +${pageCreated} created, +${pageUpdated} updated, +${pageFailed} failed`)
          currentPage++

          // Check for completion based on pagination
          if (response.pagination && !response.pagination.has_more) {
            console.log('✅ API indicates no more pages - sync complete!')
            await playerSyncCheckpointService.markCompleted(syncId, {
              pagesCompleted: checkpoint.stats.pagesCompleted + pagesThisRun,
              playersCreated: checkpoint.stats.playersCreated + stats.created,
              playersUpdated: checkpoint.stats.playersUpdated + stats.updated,
              playersFailed: checkpoint.stats.playersFailed + stats.failed,
            })
            stats.isComplete = true
            break
          }

        } catch (error) {
          // Handle rate limiting
          if (error instanceof Error && error.message.includes('rate limit')) {
            console.log('⏱️ Rate limit reached, scheduling resume...')
            const resetTime = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
            await playerSyncCheckpointService.markRateLimited(syncId, resetTime, maxPagesPerRun)
            stats.nextResumeTime = resetTime
            break
          }

          // Handle other errors
          const errorMsg = `Page ${currentPage}: ${error instanceof Error ? error.message : 'Unknown error'}`
          stats.errors.push(errorMsg)
          console.error(errorMsg)
          
          // Update checkpoint with error
          await playerSyncCheckpointService.updateCheckpoint(syncId, {
            mode: 'failed',
            lastError: errorMsg,
          })
          break
        }
      }

      stats.pagesProcessed = pagesThisRun
      stats.totalPlayersProcessed = checkpoint.playersProcessed + totalPlayersThisRun
      stats.endTime = Date.now()

      const message = stats.isComplete 
        ? `🎉 Player sync completed! Processed ${stats.totalPlayersProcessed} total players.`
        : `📄 Processed ${pagesThisRun} pages (${totalPlayersThisRun} players). Resume from page ${currentPage}.`

      return {
        success: true,
        message,
        stats,
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      stats.errors.push(errorMessage)
      stats.endTime = Date.now()

      // Update checkpoint with failure
      await playerSyncCheckpointService.updateCheckpoint(syncId, {
        mode: 'failed',
        lastError: errorMessage,
      })

      return {
        success: false,
        message: errorMessage,
        stats,
      }
    }
  }

  return {
    sync: resumablePlayerSync,
    getCheckpoint: () => playerSyncCheckpointService.getCheckpoint(syncId),
    resetCheckpoint: () => playerSyncCheckpointService.resetCheckpoint(syncId),
    canResume: () => playerSyncCheckpointService.canResume(syncId),
  }
}