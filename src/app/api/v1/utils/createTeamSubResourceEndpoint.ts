import type { APIRouteV1 } from '@/app/api/v1/index'
import type { PayloadRequest } from 'payload'
import { createAuthMiddleware } from '@/utilities/auth'

// Type for the fetcher function
export type FetcherFn = (id: string, options?: any) => Promise<any>
export type QueryParser = (url: URL) => any

export function createTeamSubResourceEndpoint({
  resource,
  fetcher,
  parseQuery,
}: {
  resource: string
  fetcher: FetcherFn
  parseQuery?: QueryParser
}): APIRouteV1 {
  const handler = async (req: PayloadRequest) => {
    if (!req.url) {
      return Response.json({ error: 'Invalid request URL' }, { status: 400 })
    }
    const url = new URL(req.url)
    const id = url.pathname.split('/').slice(-2)[0]
    if (!id) {
      return Response.json({ error: 'Team ID is required' }, { status: 400 })
    }
    try {
      const options = parseQuery ? parseQuery(url) : undefined
      const data = await fetcher(id, options)
      return Response.json(data)
    } catch (error) {
      console.error(`Error in ${resource} endpoint:`, error)
      return Response.json(
        { error: `An unexpected error occurred while fetching team ${resource}` },
        { status: 500 },
      )
    }
  }

  return {
    path: `/v1/team/:id/${resource}`,
    method: 'get',
    handler: async (req) => {
      const authMiddleware = createAuthMiddleware()
      const authResult = await authMiddleware(req)
      if (authResult) return authResult
      return handler(req)
    },
  }
}
