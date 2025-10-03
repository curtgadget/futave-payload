#!/usr/bin/env node

import { MongoClient } from 'mongodb'

async function resetTTLs() {
  const client = new MongoClient('mongodb://localhost:27017')
  
  try {
    await client.connect()
    const db = client.db('futave-backend')
    
    console.log('🔄 Resetting TTLs to force fresh data sync...\n')
    
    // 1. Clear sync-metadata collection
    const syncMetadata = db.collection('sync-metadata')
    const syncCount = await syncMetadata.countDocuments()
    
    if (syncCount > 0) {
      console.log(`Found ${syncCount} sync metadata records to clear`)
      const result = await syncMetadata.deleteMany({})
      console.log(`✅ Deleted ${result.deletedCount} sync metadata records\n`)
    } else {
      console.log('ℹ️  No sync metadata records found\n')
    }
    
    // 2. Clear cached standings from leagues
    const leagues = db.collection('leagues')
    const leaguesWithCache = await leagues.countDocuments({
      'current_standings.expires_at': { $exists: true }
    })
    
    if (leaguesWithCache > 0) {
      console.log(`Found ${leaguesWithCache} leagues with cached standings`)
      const result = await leagues.updateMany(
        { 'current_standings.expires_at': { $exists: true } },
        { $unset: { current_standings: '' } }
      )
      console.log(`✅ Cleared standings cache from ${result.modifiedCount} leagues\n`)
    } else {
      console.log('ℹ️  No cached standings found\n')
    }
    
    // 3. Optional: Reset wave scores (uncomment if needed)
    // const matches = db.collection('matches')
    // const matchesWithWaves = await matches.countDocuments({
    //   wave_score: { $gt: 0 }
    // })
    // 
    // if (matchesWithWaves > 0) {
    //   console.log(`Found ${matchesWithWaves} matches with wave scores`)
    //   const result = await matches.updateMany(
    //     { wave_score: { $gt: 0 } },
    //     { $set: { wave_score: 0 }, $unset: { wave_factors: '' } }
    //   )
    //   console.log(`✅ Reset wave scores for ${result.modifiedCount} matches\n`)
    // }
    
    console.log('🎉 All TTLs have been reset!')
    console.log('\nYou can now run the following to pull fresh data:')
    console.log('  - node scripts/sync-matches.ts --rivals    # For rivals & H2H data')
    console.log('  - node scripts/calculate-wave-scores.ts    # To recalculate wave scores')
    console.log('  - Standings will auto-refresh on next API call')
    
  } catch (error) {
    console.error('❌ Error resetting TTLs:', error)
    process.exit(1)
  } finally {
    await client.close()
  }
}

resetTTLs()