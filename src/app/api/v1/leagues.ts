import type { APIRouteV1 } from '@/app/api/v1/index'
import type { PayloadRequest } from 'payload'
import type { LeagueTab } from './types/league'
import { createAuthMiddleware } from '@/utilities/auth'
import { leagueDataFetcher } from './services/leagueDataFetcher'

const getLeagueDataHandler = async (req: PayloadRequest) => {
  if (!req.url) {
    return Response.json({ error: 'Invalid request URL' }, { status: 400 })
  }

  const url = new URL(req.url)
  const id = url.pathname.split('/').pop()
  const tab = url.searchParams.get('tab') as LeagueTab | null
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const limit = parseInt(url.searchParams.get('limit') || '50', 10)
  const seasonId = url.searchParams.get('season_id')

  if (!id) {
    return Response.json({ error: 'League ID is required' }, { status: 400 })
  }

  try {
    const tabName = tab || 'overview'
    const fetcherName =
      `get${tabName.charAt(0).toUpperCase()}${tabName.slice(1)}` as keyof typeof leagueDataFetcher

    if (!(fetcherName in leagueDataFetcher)) {
      return Response.json({ error: 'Invalid tab specified' }, { status: 400 })
    }

    // Determine which parameters to pass based on the tab
    let data
    if (tabName === 'teams') {
      // Cast to the correct function type for teams listing
      const getTeams = leagueDataFetcher[fetcherName] as typeof leagueDataFetcher.getTeams
      data = await getTeams(id, page, limit)
    } else if (tabName === 'standings') {
      // Cast to the correct function type for standings
      const getStandings = leagueDataFetcher[fetcherName] as typeof leagueDataFetcher.getStandings
      data = await getStandings(id, seasonId || undefined)
    } else {
      // For other tabs, just pass the league ID
      data = await leagueDataFetcher[fetcherName](id)
    }

    return Response.json(data)
  } catch (error) {
    console.error('Error in league data handler:', {
      id,
      tab,
      page,
      limit,
      seasonId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('Invalid league ID format')) {
        return Response.json({ error: 'Invalid league ID format' }, { status: 400 })
      }
      if (error.message.includes('No league found')) {
        return Response.json({ error: 'League not found' }, { status: 404 })
      }
      if (error.message.includes('Invalid league data')) {
        return Response.json({ error: 'Invalid league data structure' }, { status: 500 })
      }
    }

    return Response.json(
      { error: 'An unexpected error occurred while fetching league data' },
      { status: 500 },
    )
  }
}

const getLeaguePageHandler = async (req: PayloadRequest) => {
  const authMiddleware = createAuthMiddleware()
  const authResult = await authMiddleware(req)

  if (authResult) {
    return authResult
  }

  return getLeagueDataHandler(req)
}

const getLeaguePage: APIRouteV1 = {
  path: '/v1/league/:id',
  method: 'get',
  handler: getLeaguePageHandler,
}

export default getLeaguePage
