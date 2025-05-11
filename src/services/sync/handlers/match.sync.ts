import { SportmonksMatch } from '../../sportmonks/client/types'
import { createMatchesEndpoint } from '../../sportmonks/client/endpoints/matches'
import { transformMatch } from '../../sportmonks/transformers/match.transformer'
import { createSyncService } from '../base.sync'
import { SportmonksConfig } from '../../sportmonks/client/types'

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

export function createMatchSync(config: SportmonksConfig) {
  const matchesEndpoint = createMatchesEndpoint(config)

  return createSyncService<SportmonksMatch>({
    collection: 'matches',
    fetchData: () => matchesEndpoint.getAll(),
    transformData: transformMatch,
  })
}

export function createMatchSyncByRange(
  config: SportmonksConfig,
  startDate: string,
  endDate: string,
) {
  const matchesEndpoint = createMatchesEndpoint(config)

  return createSyncService<SportmonksMatch>({
    collection: 'matches',
    fetchData: () => getByDateRangeChunked(matchesEndpoint, startDate, endDate),
    transformData: transformMatch,
  })
}
