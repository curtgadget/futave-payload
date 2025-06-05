import type { APIRouteV1 } from '@/app/api/v1/index'
import type { PayloadRequest } from 'payload'
import { createAuthMiddleware } from '@/utilities/auth'
import { countryDataFetcher } from './services/countryDataFetcher'

const getCountriesHandler = async (req: PayloadRequest) => {
  if (!req.url) {
    return Response.json({ error: 'Invalid request URL' }, { status: 400 })
  }

  const url = new URL(req.url)
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const limit = parseInt(url.searchParams.get('limit') || '50', 10)

  // Apply maximum limit to prevent excessive data fetching
  const validatedLimit = Math.min(limit, 100)

  // Extract filter parameters
  const search = url.searchParams.get('search')
  const continentId = url.searchParams.get('continent_id') || url.searchParams.get('continentId')
  const sort = url.searchParams.get('sort') as 'name' | '-name' | undefined

  try {
    const data = await countryDataFetcher.getCountries({
      page,
      limit: validatedLimit,
      search: search || undefined,
      continentId: continentId ? parseInt(continentId, 10) : undefined,
      sort: sort || 'name',
    })

    // Set cache headers for country data (cache for 1 hour)
    const headers = new Headers()
    headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600')

    return new Response(JSON.stringify(data), {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error('Error in countries list handler:', {
      page,
      limit: validatedLimit,
      search,
      continentId,
      sort,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return Response.json(
      { error: 'An unexpected error occurred while fetching countries data' },
      { status: 500 },
    )
  }
}

const getCountriesPageHandler = async (req: PayloadRequest) => {
  const authMiddleware = createAuthMiddleware()
  const authResult = await authMiddleware(req)

  if (authResult) {
    return authResult
  }

  return getCountriesHandler(req)
}

const getCountriesPage: APIRouteV1 = {
  path: '/v1/countries',
  method: 'get',
  handler: getCountriesPageHandler,
}

export default getCountriesPage