import type { APIRouteV1 } from '@/app/api/v1/index'
import type { PayloadRequest } from 'payload'
import type { TeamTab } from './types/team'
import { createAuthMiddleware } from '@/utilities/auth'
import { teamDataFetcher } from './services/teamDataFetcher'

const getTeamDataHandler = async (req: PayloadRequest) => {
  if (!req.url) {
    return Response.json({ error: 'Invalid request URL' }, { status: 400 })
  }

  const url = new URL(req.url)
  const id = url.pathname.split('/').pop()
  const tab = url.searchParams.get('tab') as TeamTab | null
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const limit = parseInt(url.searchParams.get('limit') || '50', 10)
  const season = url.searchParams.get('season')
  const includeAllPlayers = url.searchParams.get('include_all_players') === 'true'

  if (!id) {
    return Response.json({ error: 'Team ID is required' }, { status: 400 })
  }

  try {
    const tabName = tab || 'overview'
    const fetcherName =
      `get${tabName.charAt(0).toUpperCase()}${tabName.slice(1)}` as keyof typeof teamDataFetcher

    if (!(fetcherName in teamDataFetcher)) {
      return Response.json({ error: 'Invalid tab specified' }, { status: 400 })
    }

    // Determine which parameters to pass based on the tab
    let data
    if (tabName === 'fixtures') {
      // Cast to the correct function type for fixtures
      const getFixtures = teamDataFetcher[fetcherName] as typeof teamDataFetcher.getFixtures

      // Get pagination parameters
      const pageParam = url.searchParams.get('page')
      const page = pageParam ? parseInt(pageParam, 10) : 1
      const typeParam = url.searchParams.get('type') || 'all'
      const type = ['all', 'past', 'upcoming'].includes(typeParam)
        ? (typeParam as 'all' | 'past' | 'upcoming')
        : 'all'
      const includeResults = url.searchParams.get('includeResults') !== 'false'

      // Use the new options object pattern
      data = await getFixtures(id, {
        page,
        limit,
        type,
        includeResults,
      })
    } else if (tabName === 'stats') {
      // Cast to the correct function type for stats
      const getStats = teamDataFetcher[fetcherName] as typeof teamDataFetcher.getStats
      data = await getStats(id, season || undefined, includeAllPlayers)
    } else {
      // For other tabs, just pass the team ID
      data = await teamDataFetcher[fetcherName](id)
    }

    return Response.json(data)
  } catch (error) {
    console.error('Error in team data handler:', {
      id,
      tab,
      page,
      limit,
      season,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('Invalid team ID format')) {
        return Response.json({ error: 'Invalid team ID format' }, { status: 400 })
      }
      if (error.message.includes('No team found')) {
        return Response.json({ error: 'Team not found' }, { status: 404 })
      }
      if (error.message.includes('Invalid team data')) {
        return Response.json({ error: 'Invalid team data structure' }, { status: 500 })
      }
    }

    return Response.json(
      { error: 'An unexpected error occurred while fetching team data' },
      { status: 500 },
    )
  }
}

const getTeamPageHandler = async (req: PayloadRequest) => {
  const authMiddleware = createAuthMiddleware()
  const authResult = await authMiddleware(req)

  if (authResult) {
    return authResult
  }

  return getTeamDataHandler(req)
}

const getTeamPage: APIRouteV1 = {
  path: '/v1/team/:id',
  method: 'get',
  handler: getTeamPageHandler,
}

export default getTeamPage
