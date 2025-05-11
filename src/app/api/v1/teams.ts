import type { APIRouteV1 } from '@/app/api/v1/index'
import type { PayloadRequest } from 'payload'
import { createAuthMiddleware } from '@/utilities/auth'
import { teamDataFetcher } from './services/teamDataFetcher'

const getTeamOverviewHandler = async (req: PayloadRequest) => {
  if (!req.url) {
    return Response.json({ error: 'Invalid request URL' }, { status: 400 })
  }

  const url = new URL(req.url)
  const id = url.pathname.split('/').pop()

  if (!id) {
    return Response.json({ error: 'Team ID is required' }, { status: 400 })
  }

  try {
    const data = await teamDataFetcher.getOverview(id)
    return Response.json(data)
  } catch (error) {
    return Response.json(
      { error: 'An unexpected error occurred while fetching team overview' },
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

  return getTeamOverviewHandler(req)
}

const getTeamPage: APIRouteV1 = {
  path: '/v1/team/:id',
  method: 'get',
  handler: getTeamPageHandler,
}

export default getTeamPage
