#!/usr/bin/env node

import { getPayload } from 'payload'
import payloadConfig from '../src/payload.config'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

async function resetTTLs() {
  const payload = await getPayload({ config: payloadConfig })

  console.log('🔄 Resetting TTLs to force fresh data sync...\n')

  try {
    // 1. Clear sync-metadata records (rivals & h2h TTLs)
    const syncMetadata = await payload.find({
      collection: 'sync-metadata',
      limit: 100,
    })

    if (syncMetadata.docs.length > 0) {
      console.log(`Found ${syncMetadata.docs.length} sync metadata records to clear:`)
      
      for (const doc of syncMetadata.docs) {
        console.log(`  - Deleting ${doc.syncType} (last sync: ${doc.lastSyncAt})`)
        await payload.delete({
          collection: 'sync-metadata',
          id: doc.id,
        })
      }
      console.log('✅ Sync metadata cleared\n')
    } else {
      console.log('ℹ️  No sync metadata records found\n')
    }

    // 2. Clear cached standings from leagues
    const leaguesWithCache = await payload.find({
      collection: 'leagues',
      where: {
        'current_standings.expires_at': { exists: true }
      },
      limit: 100,
    })

    if (leaguesWithCache.docs.length > 0) {
      console.log(`Found ${leaguesWithCache.docs.length} leagues with cached standings:`)
      
      for (const league of leaguesWithCache.docs) {
        console.log(`  - Clearing standings cache for ${league.name}`)
        await payload.update({
          collection: 'leagues',
          id: league.id,
          data: {
            current_standings: undefined
          } as any
        })
      }
      console.log('✅ Standings cache cleared\n')
    } else {
      console.log('ℹ️  No cached standings found\n')
    }

    // 3. Clear wave scores from matches (optional - uncomment if needed)
    // const matchesWithWaves = await payload.find({
    //   collection: 'matches',
    //   where: {
    //     'wave_score': { greater_than: 0 }
    //   },
    //   limit: 1000,
    // })
    // 
    // if (matchesWithWaves.docs.length > 0) {
    //   console.log(`Found ${matchesWithWaves.docs.length} matches with wave scores to reset`)
    //   
    //   for (const match of matchesWithWaves.docs) {
    //     await payload.update({
    //       collection: 'matches',
    //       id: match.id,
    //       data: {
    //         wave_score: 0,
    //         wave_factors: null
    //       }
    //     })
    //   }
    //   console.log('✅ Wave scores reset\n')
    // }

    console.log('🎉 All TTLs have been reset!')
    console.log('\nYou can now run the following to pull fresh data:')
    console.log('  - node scripts/sync-matches.ts --rivals    # For rivals & H2H data')
    console.log('  - node scripts/calculate-wave-scores.ts    # To recalculate wave scores')
    console.log('  - Standings will auto-refresh on next API call')

  } catch (error) {
    console.error('❌ Error resetting TTLs:', error)
    process.exit(1)
  }

  process.exit(0)
}

resetTTLs()