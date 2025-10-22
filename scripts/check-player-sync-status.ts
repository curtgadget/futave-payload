/**
 * Check Player Sync Status
 *
 * Quick script to check if player sync is running and show progress
 */

import { getPayload } from 'payload'
import config from '@/payload.config'

async function checkSyncStatus() {
  const payload = await getPayload({ config })

  try {
    // Get checkpoint
    const checkpoint = await payload.find({
      collection: 'player-sync-checkpoints',
      where: {
        syncId: { equals: 'player-sync-main' }
      },
      limit: 1,
    })

    if (checkpoint.docs.length === 0) {
      console.log('❌ No player sync checkpoint found')
      console.log('Run: NODE_OPTIONS="--expose-gc" pnpm payload jobs:run syncPlayers 2')
      process.exit(0)
    }

    const data = checkpoint.docs[0] as any
    const now = new Date()
    const lastSync = new Date(data.lastSyncTime)
    const minutesAgo = Math.floor((now.getTime() - lastSync.getTime()) / 1000 / 60)

    console.log('\n📊 Player Sync Status\n')
    console.log(`Mode: ${data.mode}`)
    console.log(`Current Page: ${data.currentPage.toLocaleString()}`)
    console.log(`Players Processed: ${data.playersProcessed.toLocaleString()}`)
    console.log(`Last Update: ${minutesAgo} minutes ago`)
    console.log('')
    console.log('📈 Stats:')
    console.log(`  Created: ${data.stats.playersCreated.toLocaleString()}`)
    console.log(`  Updated: ${data.stats.playersUpdated.toLocaleString()}`)
    console.log(`  Failed: ${data.stats.playersFailed.toLocaleString()}`)
    console.log(`  Pages Completed: ${data.stats.pagesCompleted.toLocaleString()}`)
    console.log('')

    if (data.mode === 'completed') {
      console.log('✅ Sync is COMPLETED')
    } else if (data.mode === 'resuming') {
      if (minutesAgo < 2) {
        console.log('🔄 Sync is RUNNING (updated < 2 min ago)')
      } else {
        console.log(`⏸️  Sync is PAUSED (last updated ${minutesAgo} min ago)`)
        console.log('\nTo resume:')
        console.log('NODE_OPTIONS="--expose-gc" pnpm payload jobs:run syncPlayers 2')
      }
    } else if (data.mode === 'rate-limited') {
      const resetTime = new Date(data.rateLimit.resetTime)
      console.log(`⏱️  Rate limited until ${resetTime.toLocaleTimeString()}`)
    } else {
      console.log(`⚠️  Mode: ${data.mode}`)
    }

    if (data.totalPagesDiscovered) {
      const progress = ((data.currentPage / data.totalPagesDiscovered) * 100).toFixed(1)
      console.log(`\n📊 Progress: ${progress}% (${data.currentPage.toLocaleString()} / ${data.totalPagesDiscovered.toLocaleString()} pages)`)
    }

  } catch (error) {
    console.error('Error checking sync status:', error)
  }

  process.exit(0)
}

checkSyncStatus()
