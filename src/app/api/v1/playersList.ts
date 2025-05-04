import type { APIRouteV1 } from '@/app/api/v1/index'
import type { PayloadRequest } from 'payload'
import { createAuthMiddleware } from '@/utilities/auth'
import { playerListDataFetcher } from './services/playerDataFetcher'

const getPlayersHandler = async (req: PayloadRequest) => {
  if (!req.url) {
    return Response.json({ error: 'Invalid request URL' }, { status: 400 })
  }

  const url = new URL(req.url)
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const limit = parseInt(url.searchParams.get('limit') || '50', 10)

  // Apply maximum limit to prevent excessive data fetching
  const validatedLimit = Math.min(limit, 100)

  // Extract filter parameters
  const teamId = url.searchParams.get('team_id')
  const countryId = url.searchParams.get('country_id')
  const position = url.searchParams.get('position')
  const search = url.searchParams.get('search')

  try {
    const data = await playerListDataFetcher.getPlayers({
      page,
      limit: validatedLimit,
      teamId: teamId || undefined,
      countryId: countryId || undefined,
      position: position || undefined,
      search: search || undefined,
    })

    return Response.json(data)
  } catch (error) {
    console.error('Error in players list handler:', {
      page,
      limit: validatedLimit,
      teamId,
      countryId,
      position,
      search,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return Response.json(
      { error: 'An unexpected error occurred while fetching players data' },
      { status: 500 },
    )
  }
}

const getPlayersPageHandler = async (req: PayloadRequest) => {
  const authMiddleware = createAuthMiddleware()
  const authResult = await authMiddleware(req)

  if (authResult) {
    return authResult
  }

  return getPlayersHandler(req)
}

const getPlayersPage: APIRouteV1 = {
  path: '/v1/players',
  method: 'get',
  handler: getPlayersPageHandler,
}

export default getPlayersPage
