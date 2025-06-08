import { SportmonksMatch } from '../../sportmonks/client/types'
import { createMatchesEndpoint } from '../../sportmonks/client/endpoints/matches'
import { transformMatch } from '../../sportmonks/transformers/match.transformer'
import { createSyncService } from '../base.sync'
import { SportmonksConfig } from '../../sportmonks/client/types'
import { WaveScoreCalculator } from '../../waveDetector/calculator'
import type { Payload } from 'payload'
import type { Match, Team } from '@/payload-types'

// Helper to split a date range into 100-day chunks
function splitDateRange(
  startDate: string,
  endDate: string,
  maxDays = 100,
): Array<{ start: string; end: string }> {
  const MS_PER_DAY = 24 * 60 * 60 * 1000
  const start = new Date(startDate)
  const end = new Date(endDate)
  const ranges = []
  let current = new Date(start)
  while (current <= end) {
    const chunkStart = new Date(current)
    const chunkEnd = new Date(
      Math.min(chunkStart.getTime() + (maxDays - 1) * MS_PER_DAY, end.getTime()),
    )
    ranges.push({
      start: chunkStart.toISOString().split('T')[0],
      end: chunkEnd.toISOString().split('T')[0],
    })
    current = new Date(chunkEnd.getTime() + MS_PER_DAY)
  }
  return ranges
}

// Fetch all matches in a date range, chunked by 100 days
async function getByDateRangeChunked(
  matchesEndpoint: ReturnType<typeof createMatchesEndpoint>,
  startDate: string,
  endDate: string,
) {
  const ranges = splitDateRange(startDate, endDate, 100)
  let allMatches: SportmonksMatch[] = []
  for (const { start, end } of ranges) {
    const matches = await matchesEndpoint.getByDateRange(start, end)
    allMatches = allMatches.concat(matches)
  }
  return allMatches
}

/**
 * Enhanced match sync that calculates wave scores
 */
export function createMatchSyncWithWaveScore(
  config: SportmonksConfig,
  payload: Payload,
  startDate: string,
  endDate: string,
  options?: {
    calculateWaveScores?: boolean
    onlyFutureMatches?: boolean
    maxDaysAhead?: number
  }
) {
  const matchesEndpoint = createMatchesEndpoint(config)
  const waveCalculator = new WaveScoreCalculator(payload)
  let waveScoresCalculated = 0
  
  return createSyncService<SportmonksMatch>({
    collection: 'matches',
    fetchData: () => getByDateRangeChunked(matchesEndpoint, startDate, endDate),
    transformData: transformMatch,
    afterCreate: async (created: Match) => {
      // Skip wave calculation if disabled or match already started
      if (!options?.calculateWaveScores) return created
      
      const now = new Date()
      const matchDate = new Date(created.starting_at)
      
      // Skip past matches
      if (matchDate < now) return created
      
      // Skip matches too far in the future (default 14 days)
      const maxDays = options?.maxDaysAhead || 14
      const maxDate = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000)
      if (matchDate > maxDate) return created
      
      try {
        // Get team data from participants
        const participants = created.participants as any[]
        if (!participants || participants.length < 2) return created
        
        const homeParticipant = participants.find(p => p.meta?.location === 'home')
        const awayParticipant = participants.find(p => p.meta?.location === 'away')
        
        if (!homeParticipant || !awayParticipant) return created
        
        // Fetch full team data
        const [homeTeamResult, awayTeamResult] = await Promise.all([
          payload.find({
            collection: 'teams',
            where: { id: { equals: homeParticipant.id } },
            limit: 1
          }),
          payload.find({
            collection: 'teams',
            where: { id: { equals: awayParticipant.id } },
            limit: 1
          })
        ])
        
        if (homeTeamResult.docs.length === 0 || awayTeamResult.docs.length === 0) {
          console.warn(`Teams not found for match ${created.id}`)
          return created
        }
        
        const homeTeam = homeTeamResult.docs[0] as Team
        const awayTeam = awayTeamResult.docs[0] as Team
        
        // Calculate wave score
        const waveScore = await waveCalculator.calculatePreMatchScore(
          created,
          homeTeam,
          awayTeam
        )
        
        // Update match with wave score
        const updated = await payload.update({
          collection: 'matches',
          id: created.id,
          data: {
            wave_score: waveScore
          }
        })
        
        waveScoresCalculated++
        
        // Optional: Add batch logging to reduce noise
        if (waveScoresCalculated % 10 === 0) { // Log every 10th calculation
          console.log(`Wave scores calculated: ${waveScoresCalculated} matches processed`)
        }
        return updated
        
      } catch (error) {
        console.error(`Error calculating wave score for match ${created.id}:`, error)
        return created
      }
    },
    afterUpdate: async (updated: Match, existingDoc: Match) => {
      // Recalculate wave score if match date changed or score expired
      if (!options?.calculateWaveScores) return updated
      
      const now = new Date()
      const matchDate = new Date(updated.starting_at)
      
      // Skip past matches
      if (matchDate < now) return updated
      
      // Check if we need to recalculate
      const needsRecalc = !existingDoc.wave_score || 
        existingDoc.starting_at !== updated.starting_at ||
        (existingDoc.wave_score.expires_at && new Date(existingDoc.wave_score.expires_at) < now)
      
      if (!needsRecalc) return updated
      
      // Use same logic as afterCreate
      return createMatchSyncWithWaveScore(config, payload, startDate, endDate, options)
        .afterCreate!(updated)
    }
  })
}