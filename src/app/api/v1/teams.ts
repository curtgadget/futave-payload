import type { APIRouteV1 } from '@/app/api/v1/index'
import type { PayloadRequest } from 'payload'
import { createAuthMiddleware } from '@/utilities/auth'
import { getPayload } from 'payload'
import config from '@/payload.config'

const getTeamDataHandler = async (req: PayloadRequest) => {
  if (!req.url) {
    return Response.json({ error: 'Invalid request URL' }, { status: 400 })
  }

  const url = new URL(req.url)
  const id = url.pathname.split('/').pop()

  if (!id) {
    return Response.json({ error: 'Team ID is required' }, { status: 400 })
  }

  try {
    const payload = await getPayload({
      config,
    })

    const result = await payload.find({
      collection: 'teams',
      where: {
        id: {
          equals: id,
        },
      },
    })

    if (result.totalDocs === 0) {
      return Response.json({ error: 'Team not found' }, { status: 404 })
    }

    return Response.json(result.docs[0])
  } catch (error) {
    console.error('Error fetching team:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const getTeamPageHandler = async (req: PayloadRequest) => {
  const authMiddleware = createAuthMiddleware()
  const authResult = await authMiddleware(req)

  if (authResult) {
    return authResult // Return early if authentication failed
  }

  return getTeamDataHandler(req)
}

const getTeamPage: APIRouteV1 = {
  path: '/v1/team/:id',
  method: 'get',
  handler: getTeamPageHandler,
}

export default getTeamPage
