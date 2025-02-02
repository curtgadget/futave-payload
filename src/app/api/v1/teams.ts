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

    const data = await teamDataFetcher[fetcherName](id)
    return Response.json(data)
  } catch (error) {
    console.error('Error fetching team data:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
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
