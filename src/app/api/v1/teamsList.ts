import type { APIRouteV1 } from '@/app/api/v1/index'
import type { PayloadRequest } from 'payload'
import { createAuthMiddleware } from '@/utilities/auth'
import { teamListDataFetcher } from './services/teamDataFetcher'

const getTeamsHandler = async (req: PayloadRequest) => {
  if (!req.url) {
    return Response.json({ error: 'Invalid request URL' }, { status: 400 })
  }

  const url = new URL(req.url)
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const limit = parseInt(url.searchParams.get('limit') || '50', 10)

  // Apply maximum limit to prevent excessive data fetching
  const validatedLimit = Math.min(limit, 100)

  // Extract filter parameters
  const leagueId = url.searchParams.get('league_id')
  const countryId = url.searchParams.get('country_id')
  const search = url.searchParams.get('search')
  const season = url.searchParams.get('season')

  try {
    const data = await teamListDataFetcher.getTeams({
      page,
      limit: validatedLimit,
      leagueId: leagueId || undefined,
      countryId: countryId || undefined,
      search: search || undefined,
      season: season || undefined,
    })

    return Response.json(data)
  } catch (error) {
    console.error('Error in teams list handler:', {
      page,
      limit: validatedLimit,
      leagueId,
      countryId,
      search,
      season,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return Response.json(
      { error: 'An unexpected error occurred while fetching teams data' },
      { status: 500 },
    )
  }
}

const getTeamsPageHandler = async (req: PayloadRequest) => {
  const authMiddleware = createAuthMiddleware()
  const authResult = await authMiddleware(req)

  if (authResult) {
    return authResult
  }

  return getTeamsHandler(req)
}

const getTeamsPage: APIRouteV1 = {
  path: '/v1/teams',
  method: 'get',
  handler: getTeamsPageHandler,
}

export default getTeamsPage
