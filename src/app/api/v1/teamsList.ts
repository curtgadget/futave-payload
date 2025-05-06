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
  const countryId = url.searchParams.get('country_id') || url.searchParams.get('countryId')
  const search = url.searchParams.get('search')
  const debug = url.searchParams.get('debug') === 'true'

  try {
    const data = await teamListDataFetcher.getTeams({
      page,
      limit: validatedLimit,
      countryId: countryId || undefined,
      search: search || undefined,
    })

    // Add debug information if requested
    if (debug) {
      try {
        const payload = await import('payload').then((mod) =>
          mod.getPayload({ config: require('@/payload.config') }),
        )
        const rawTeam = await payload.find({
          collection: 'teams',
          limit: 1,
        })

        if (rawTeam.docs.length > 0) {
          const team = rawTeam.docs[0]
          const debugInfo = {
            debug: true,
            teamFields: Object.keys(team),
            seasons: team.seasons
              ? {
                  type: typeof team.seasons,
                  isArray: Array.isArray(team.seasons),
                  sample: Array.isArray(team.seasons)
                    ? team.seasons.slice(0, 3)
                    : String(team.seasons).substring(0, 100),
                }
              : null,
            activeseasons: team.activeseasons
              ? {
                  type: typeof team.activeseasons,
                  isArray: Array.isArray(team.activeseasons),
                  sample: Array.isArray(team.activeseasons)
                    ? team.activeseasons.slice(0, 3)
                    : String(team.activeseasons).substring(0, 100),
                }
              : null,
            rawData: {
              id: team.id,
              name: team.name,
            },
          }

          return Response.json({
            ...data,
            _debug: debugInfo,
          })
        }
      } catch (debugError) {
        console.error('Error generating debug info:', debugError)
      }
    }

    return Response.json(data)
  } catch (error) {
    console.error('Error in teams list handler:', {
      page,
      limit: validatedLimit,
      countryId,
      search,
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
