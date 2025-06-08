import { getPayload } from 'payload'
import payloadConfig from '@/payload.config'
import pLimit from 'p-limit'
import { SportmonksRival } from '../../sportmonks/client/types'
import { createRivalsEndpoint } from '../../sportmonks/client/endpoints/rivals'
import { createHeadToHeadEndpoint } from '../../sportmonks/client/endpoints/headToHead'
import { transformRival } from '../../sportmonks/transformers/rival.transformer'
import { calculateH2HSummary } from '../../sportmonks/utils/h2hCalculator'
import { createSyncService } from '../base.sync'
import { SportmonksConfig } from '../../sportmonks/client/types'
import { syncMetadataService } from '../syncMetadata'

export function createRivalWithH2HSync(config: SportmonksConfig, options?: { h2hTtlDays?: number; rivalDataTtlDays?: number }) {
  const rivalsEndpoint = createRivalsEndpoint(config)
  const h2hEndpoint = createHeadToHeadEndpoint(config)
  const h2hTtlDays = options?.h2hTtlDays || 7 // Default: 7 days TTL for H2H data
  const rivalDataTtlDays = options?.rivalDataTtlDays || 90 // Default: 90 days TTL for rival data
  
  // First, use the base sync service for rivals
  const baseSync = createSyncService<SportmonksRival>({
    collection: 'rivals',
    fetchData: () => rivalsEndpoint.getAll(),
    transformData: transformRival,
  })

  // Enhanced sync that adds H2H data
  async function syncWithH2H() {
    const payload = await getPayload({ config: payloadConfig })
    
    // Step 1: Check if we need to run base rivals sync using sync-level TTL
    console.log('Checking if rival data sync is needed...')
    const shouldSyncRivalData = await syncMetadataService.shouldSync('rivals_data')
    
    let rivalsResult
    
    if (shouldSyncRivalData) {
      console.log('Starting rivals sync...')
      rivalsResult = await baseSync.sync()
      
      if (rivalsResult.success) {
        // Record successful sync with TTL
        await syncMetadataService.recordSync('rivals_data', rivalDataTtlDays, 'Sportmonks rival relationships sync')
      }
    } else {
      console.log('Skipping rival data sync (within TTL)')
      // Create a mock success result for consistency
      rivalsResult = {
        success: true,
        stats: { created: 0, updated: 0, failed: 0, errors: [], startTime: Date.now(), endTime: Date.now() },
        message: 'Rival data sync skipped (within TTL)',
      }
    }
    
    if (!rivalsResult.success) {
      return rivalsResult
    }
    
    // Step 2: Check if we need to run H2H sync using sync-level TTL
    console.log('Checking if H2H data sync is needed...')
    const shouldSyncH2HData = await syncMetadataService.shouldSync('h2h_data')
    
    let h2hSynced = 0
    let h2hFailed = 0
    let h2hPairs = new Map<string, number[]>()
    
    if (shouldSyncH2HData) {
      console.log('Starting H2H sync...')
      
      // Fetch all rivals to build unique pairs
      const allRivals = await payload.find({
        collection: 'rivals',
        limit: 10000,
      })
      
      // Build map of unique team pairs to avoid duplicate H2H calls
      const h2hDataCache = new Map<string, any>() // pairKey -> h2h data
      
      allRivals.docs.forEach((rival) => {
        const pairKey = [rival.team_id, rival.rival_team_id].sort().join('-')
        
        if (!h2hPairs.has(pairKey)) {
          h2hPairs.set(pairKey, [])
        }
        h2hPairs.get(pairKey)!.push(rival.id)
      })
    
      console.log(`Found ${h2hPairs.size} unique rival pairs for H2H sync`)
    
      // Step 3: Process H2H data in parallel with concurrency limit
      const limit = pLimit(10) // Process 10 H2H requests concurrently
      let processedCount = 0
    
    // Convert pairs to array for processing
    const pairsToProcess = Array.from(h2hPairs.entries())
    
    // Process all pairs in parallel with progress logging
    const h2hPromises = pairsToProcess.map(([pairKey, rivalIds]) =>
      limit(async () => {
        const [team1Id, team2Id] = pairKey.split('-').map(Number)
        
        try {
          // Fetch H2H matches
          const h2hMatches = await h2hEndpoint.get(team1Id, team2Id)
          
          processedCount++
          if (processedCount % 10 === 0) {
            console.log(`H2H Progress: ${processedCount}/${h2hPairs.size} pairs processed`)
          }
          
          if (h2hMatches.length === 0) {
            return { pairKey, status: 'no_data' }
          }
          
          // Calculate H2H summary for both directions
          const team1Summary = calculateH2HSummary(h2hMatches, team1Id, team2Id)
          const team2Summary = calculateH2HSummary(h2hMatches, team2Id, team1Id)
          
          // Only cache if we have valid summaries
          if (team1Summary) {
            h2hDataCache.set(`${team1Id}-${team2Id}`, team1Summary)
          }
          if (team2Summary) {
            h2hDataCache.set(`${team2Id}-${team1Id}`, team2Summary)
          }
          
          // Prepare updates for this pair
          const updates = []
          for (const rivalId of rivalIds) {
            const rival = allRivals.docs.find(r => r.id === rivalId)
            if (!rival) continue
            
            const summaryKey = `${rival.team_id}-${rival.rival_team_id}`
            const h2hSummary = h2hDataCache.get(summaryKey)
            
            if (h2hSummary) {
              updates.push({
                rivalId,
                h2hSummary,
              })
            }
          }
          
          return { pairKey, status: 'success', updates }
          
        } catch (error) {
          console.error(`Failed to fetch H2H for ${pairKey}:`, error)
          return { pairKey, status: 'failed', error }
        }
      })
    )
    
    // Wait for all H2H fetches to complete
    console.log('Processing H2H data in parallel...')
    const h2hResults = await Promise.all(h2hPromises)
    
    // Now update the database records
    console.log('Updating rival records with H2H data...')
    const updateLimit = pLimit(20) // Higher limit for DB updates
    
    const updatePromises = []
    for (const result of h2hResults) {
      if (result.status === 'success' && result.updates) {
        h2hSynced++
        
        // Create update promises for each rival record
        for (const { rivalId, h2hSummary } of result.updates) {
          updatePromises.push(
            updateLimit(async () => {
              await payload.update({
                collection: 'rivals',
                id: rivalId,
                data: {
                  h2h_summary: h2hSummary,
                  h2h_updated_at: new Date().toISOString(),
                },
              })
            })
          )
        }
      } else if (result.status === 'failed') {
        h2hFailed++
      }
    }
    
      // Execute all database updates
      await Promise.all(updatePromises)
      
      // Record successful H2H sync
      if (h2hSynced > 0 || h2hFailed === 0) {
        await syncMetadataService.recordSync('h2h_data', h2hTtlDays, 'Sportmonks head-to-head data sync')
      }
    } else {
      console.log('Skipping H2H data sync (within TTL)')
    }
    
    // Return enhanced result
    return {
      success: true,
      stats: {
        ...rivalsResult.stats,
        h2hPairs: h2hPairs.size,
        h2hSynced,
        h2hFailed,
        rivalDataSkipped: !shouldSyncRivalData,
        h2hDataSkipped: !shouldSyncH2HData,
      },
      message: `${rivalsResult.message}. H2H data: ${h2hSynced} synced, ${h2hFailed} failed out of ${h2hPairs.size} pairs.`,
    }
  }
  
  return { sync: syncWithH2H }
}