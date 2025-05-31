import type { APIRouteV1 } from '@/app/api/v1/index'
import type { PayloadRequest } from 'payload'
import { createAuthMiddleware } from '@/utilities/auth'
import { leagueDataFetcher } from './services/leagueDataFetcher'

const getLeagueMatchesHandler = async (req: PayloadRequest) => {
  if (!req.url) {
    return Response.json({ error: 'Invalid request URL' }, { status: 400 })
  }

  const url = new URL(req.url)
  const pathParts = url.pathname.split('/').filter(Boolean)
  const id = pathParts[pathParts.length - 2] // Get the ID before 'matches'
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const limit = parseInt(url.searchParams.get('limit') || '50', 10)
  const seasonId = url.searchParams.get('season_id')
  const type = ['all', 'past', 'upcoming'].includes(url.searchParams.get('type') || '')
    ? url.searchParams.get('type') as 'all' | 'past' | 'upcoming'
    : 'auto' // Smart default: upcoming first, fall back to past
  const includeNextMatch = url.searchParams.get('includeNextMatch') === 'true'

  if (!id) {
    return Response.json({ error: 'League ID is required' }, { status: 400 })
  }

  try {
    const data = await leagueDataFetcher.getMatches(
      id, 
      page, 
      limit, 
      seasonId || undefined, 
      type, 
      includeNextMatch
    )
    return Response.json(data)
  } catch (error) {
    console.error('Error in league matches handler:', {
      id,
      page,
      limit,
      seasonId,
      type,
      includeNextMatch,
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
      { error: 'An unexpected error occurred while fetching league matches' },
      { status: 500 },
    )
  }
}

const getLeagueMatchesPageHandler = async (req: PayloadRequest) => {
  const authMiddleware = createAuthMiddleware()
  const authResult = await authMiddleware(req)

  if (authResult) {
    return authResult
  }

  return getLeagueMatchesHandler(req)
}

const getLeagueMatchesPage: APIRouteV1 = {
  path: '/v1/league/:id/matches',
  method: 'get',
  handler: getLeagueMatchesPageHandler,
}

export default getLeagueMatchesPage