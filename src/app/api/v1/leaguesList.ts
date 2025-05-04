import type { APIRouteV1 } from '@/app/api/v1/index'
import type { PayloadRequest } from 'payload'
import { createAuthMiddleware } from '@/utilities/auth'
import { leagueListDataFetcher } from './services/leagueDataFetcher'

const getLeaguesHandler = async (req: PayloadRequest) => {
  if (!req.url) {
    return Response.json({ error: 'Invalid request URL' }, { status: 400 })
  }

  const url = new URL(req.url)
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const limit = parseInt(url.searchParams.get('limit') || '50', 10)

  // Apply maximum limit to prevent excessive data fetching
  const validatedLimit = Math.min(limit, 100)

  // Extract filter parameters
  const countryId = url.searchParams.get('country_id')
  const search = url.searchParams.get('search')
  const season = url.searchParams.get('season')

  try {
    const data = await leagueListDataFetcher.getLeagues({
      page,
      limit: validatedLimit,
      countryId: countryId || undefined,
      search: search || undefined,
      season: season || undefined,
    })

    return Response.json(data)
  } catch (error) {
    console.error('Error in leagues list handler:', {
      page,
      limit: validatedLimit,
      countryId,
      search,
      season,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return Response.json(
      { error: 'An unexpected error occurred while fetching leagues data' },
      { status: 500 },
    )
  }
}

const getLeaguesPageHandler = async (req: PayloadRequest) => {
  const authMiddleware = createAuthMiddleware()
  const authResult = await authMiddleware(req)

  if (authResult) {
    return authResult
  }

  return getLeaguesHandler(req)
}

const getLeaguesPage: APIRouteV1 = {
  path: '/v1/leagues',
  method: 'get',
  handler: getLeaguesPageHandler,
}

export default getLeaguesPage
