import type { APIRouteV1 } from '@/app/api/v1/index'
import type { PayloadRequest } from 'payload'
import type { PlayerTab } from './types/player'
import { createAuthMiddleware } from '@/utilities/auth'
import { playerDataFetcher } from './services/playerDataFetcher'

const getPlayerDataHandler = async (req: PayloadRequest) => {
  if (!req.url) {
    return Response.json({ error: 'Invalid request URL' }, { status: 400 })
  }

  const url = new URL(req.url)
  const id = url.pathname.split('/').pop()
  const tab = url.searchParams.get('tab') as PlayerTab | null
  const seasonId = url.searchParams.get('season_id')

  if (!id) {
    return Response.json({ error: 'Player ID is required' }, { status: 400 })
  }

  try {
    const tabName = tab || 'overview'
    const fetcherName =
      `get${tabName.charAt(0).toUpperCase()}${tabName.slice(1)}` as keyof typeof playerDataFetcher

    if (!(fetcherName in playerDataFetcher)) {
      return Response.json({ error: 'Invalid tab specified' }, { status: 400 })
    }

    // Determine which parameters to pass based on the tab
    let data
    if (tabName === 'stats') {
      // Cast to the correct function type for stats
      const getStats = playerDataFetcher[fetcherName] as typeof playerDataFetcher.getStats
      data = await getStats(id, seasonId || undefined)
    } else {
      // For other tabs, just pass the player ID
      data = await playerDataFetcher[fetcherName](id)
    }

    return Response.json(data)
  } catch (error) {
    console.error('Error in player data handler:', {
      id,
      tab,
      seasonId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('Invalid player ID format')) {
        return Response.json({ error: 'Invalid player ID format' }, { status: 400 })
      }
      if (error.message.includes('No player found')) {
        return Response.json({ error: 'Player not found' }, { status: 404 })
      }
      if (error.message.includes('Invalid player data')) {
        return Response.json({ error: 'Invalid player data structure' }, { status: 500 })
      }
    }

    return Response.json(
      { error: 'An unexpected error occurred while fetching player data' },
      { status: 500 },
    )
  }
}

const getPlayerPageHandler = async (req: PayloadRequest) => {
  const authMiddleware = createAuthMiddleware()
  const authResult = await authMiddleware(req)

  if (authResult) {
    return authResult
  }

  return getPlayerDataHandler(req)
}

const getPlayerPage: APIRouteV1 = {
  path: '/v1/player/:id',
  method: 'get',
  handler: getPlayerPageHandler,
}

export default getPlayerPage
