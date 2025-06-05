import type { APIRouteV1 } from '@/app/api/v1/index'
import type { PayloadRequest } from 'payload'
import { createAuthMiddleware } from '@/utilities/auth'
import { countryDataFetcher } from './services/countryDataFetcher'

const getCountryHandler = async (req: PayloadRequest) => {
  if (!req.url) {
    return Response.json({ error: 'Invalid request URL' }, { status: 400 })
  }

  const url = new URL(req.url)
  const pathParts = url.pathname.split('/')
  const identifier = pathParts[pathParts.length - 1]

  if (!identifier) {
    return Response.json({ error: 'Country identifier is required' }, { status: 400 })
  }

  try {
    const country = await countryDataFetcher.getCountryByIdentifier(identifier)

    if (!country) {
      return Response.json(
        { error: 'Country not found' },
        { status: 404 }
      )
    }

    // Set cache headers for country data (cache for 1 hour)
    const headers = new Headers()
    headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600')

    return new Response(JSON.stringify(country), {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error('Error in country detail handler:', {
      identifier,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return Response.json(
      { error: 'An unexpected error occurred while fetching country data' },
      { status: 500 },
    )
  }
}

const getCountryPageHandler = async (req: PayloadRequest) => {
  const authMiddleware = createAuthMiddleware()
  const authResult = await authMiddleware(req)

  if (authResult) {
    return authResult
  }

  return getCountryHandler(req)
}

const getCountryPage: APIRouteV1 = {
  path: '/v1/countries/:identifier',
  method: 'get',
  handler: getCountryPageHandler,
}

export default getCountryPage