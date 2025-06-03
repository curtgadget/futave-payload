import type { APIRouteV1 } from '@/app/api/v1/index'
import type { PayloadRequest } from 'payload'
import { createAuthMiddleware } from '@/utilities/auth'
import { leagueDataFetcher } from './services/leagueDataFetcher'

const getLeagueOverviewHandler = async (req: PayloadRequest) => {
  if (!req.url) {
    return Response.json({ error: 'Invalid request URL' }, { status: 400 })
  }

  const url = new URL(req.url)
  const pathParts = url.pathname.split('/').filter(Boolean)
  const id = pathParts[pathParts.length - 2] // Get the ID before 'overview'
  const seasonId = url.searchParams.get('season_id')

  if (!id) {
    return Response.json({ error: 'League ID is required' }, { status: 400 })
  }

  try {
    const data = await leagueDataFetcher.getOverview(id, seasonId || undefined)
    return Response.json(data)
  } catch (error) {
    console.error('Error in league overview handler:', {
      id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('Invalid league ID format')) {
        return Response.json({ error: 'Invalid league ID format' }, { status: 400 })
      }
      if (error.message.includes('Invalid season ID format')) {
        return Response.json({ error: 'Invalid season ID format' }, { status: 400 })
      }
      if (error.message.includes('Season') && error.message.includes('not found')) {
        return Response.json({ error: error.message }, { status: 400 })
      }
      if (error.message.includes('No season available')) {
        return Response.json({ error: error.message }, { status: 404 })
      }
      if (error.message.includes('No league found')) {
        return Response.json({ error: 'League not found' }, { status: 404 })
      }
      if (error.message.includes('Invalid league data')) {
        return Response.json({ error: 'Invalid league data structure' }, { status: 500 })
      }
    }

    return Response.json(
      { error: 'An unexpected error occurred while fetching league overview' },
      { status: 500 },
    )
  }
}

const getLeagueOverviewPageHandler = async (req: PayloadRequest) => {
  const authMiddleware = createAuthMiddleware()
  const authResult = await authMiddleware(req)

  if (authResult) {
    return authResult
  }

  return getLeagueOverviewHandler(req)
}

const getLeagueOverviewPage: APIRouteV1 = {
  path: '/v1/league/:id/overview',
  method: 'get',
  handler: getLeagueOverviewPageHandler,
}

export default getLeagueOverviewPage