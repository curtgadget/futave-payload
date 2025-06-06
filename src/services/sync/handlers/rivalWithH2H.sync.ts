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

export function createRivalWithH2HSync(config: SportmonksConfig, options?: { h2hMaxAgeDays?: number }) {
  const rivalsEndpoint = createRivalsEndpoint(config)
  const h2hEndpoint = createHeadToHeadEndpoint(config)
  const h2hMaxAgeDays = options?.h2hMaxAgeDays || 7 // Default: skip if updated within 7 days
  
  // First, use the base sync service for rivals
  const baseSync = createSyncService<SportmonksRival>({
    collection: 'rivals',
    fetchData: () => rivalsEndpoint.getAll(),
    transformData: transformRival,
  })

  // Enhanced sync that adds H2H data
  async function syncWithH2H() {
    const payload = await getPayload({ config: payloadConfig })
    
    // Step 1: Run base rivals sync
    console.log('Starting rivals sync...')
    const rivalsResult = await baseSync.sync()
    
    if (!rivalsResult.success) {
      return rivalsResult
    }
    
    // Step 2: Fetch all rivals to build unique pairs
    console.log('Fetching rivals for H2H sync...')
    const allRivals = await payload.find({
      collection: 'rivals',
      limit: 10000,
    })
    
    // Build map of unique team pairs to avoid duplicate H2H calls
    const h2hPairs = new Map<string, number[]>() // pairKey -> [rivalRecordIds]
    const h2hDataCache = new Map<string, any>() // pairKey -> h2h data
    const skippedPairs = new Set<string>() // Track pairs we skip due to recent updates
    
    allRivals.docs.forEach((rival) => {
      const pairKey = [rival.team_id, rival.rival_team_id].sort().join('-')
      
      // Check if this rival was recently updated
      if (rival.h2h_updated_at) {
        const lastUpdate = new Date(rival.h2h_updated_at)
        const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
        
        if (daysSinceUpdate < h2hMaxAgeDays) {
          skippedPairs.add(pairKey)
          // Still cache the existing data for other rivals in the pair
          if (rival.h2h_summary) {
            const summaryKey = `${rival.team_id}-${rival.rival_team_id}`
            h2hDataCache.set(summaryKey, rival.h2h_summary)
          }
          return // Skip adding to pairs to process
        }
      }
      
      if (!h2hPairs.has(pairKey)) {
        h2hPairs.set(pairKey, [])
      }
      h2hPairs.get(pairKey)!.push(rival.id)
    })
    
    console.log(`Found ${h2hPairs.size} unique rival pairs for H2H sync (${skippedPairs.size} skipped due to recent updates)`)
    
    // Step 3: Process H2H data in parallel with concurrency limit
    const limit = pLimit(10) // Process 10 H2H requests concurrently
    let h2hSynced = 0
    let h2hFailed = 0
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
    
    // Return enhanced result
    return {
      success: true,
      stats: {
        ...rivalsResult.stats,
        h2hPairs: h2hPairs.size,
        h2hSynced,
        h2hFailed,
      },
      message: `${rivalsResult.message}. H2H data: ${h2hSynced} synced, ${h2hFailed} failed out of ${h2hPairs.size} pairs.`,
    }
  }
  
  return { sync: syncWithH2H }
}