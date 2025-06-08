import type { APIRouteV1 } from './index'
import type { PayloadRequest } from 'payload'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Match } from '@/payload-types'

interface WaveMatchSummary {
  id: number
  starting_at: string
  state: {
    short_name: string
    state: string
  }
  home_team: {
    id: number
    name: string
    short_code?: string
    image_path?: string
  }
  away_team: {
    id: number
    name: string
    short_code?: string
    image_path?: string
  }
  score: {
    home: number | null
    away: number | null
  }
  league: {
    id: number
    name: string
    image_path?: string
    country_id?: number
  }
  wave_score: {
    total: number
    tier: string
    factors: {
      rivalry: number
      position: number
      zone: number
      form: number
      h2h: number
      timing: number
    }
  }
}

interface WaveMatchesResponse {
  matches: WaveMatchSummary[]
  meta: {
    total: number
    page: number
    limit: number
    filters: {
      date?: string
      league_id?: number
      min_score?: number
    }
  }
}

const parseWaveQuery = (req: PayloadRequest) => {
  if (!req.url) {
    return {
      page: 1,
      limit: 20,
      date: null,
      league_id: null,
      min_score: 0
    }
  }

  const url = new URL(req.url)
  const params = url.searchParams

  return {
    page: parseInt(params.get('page') || '1'),
    limit: Math.min(parseInt(params.get('limit') || '20'), 100),
    date: params.get('date') || new Date().toISOString().split('T')[0],
    league_id: params.get('league_id') ? parseInt(params.get('league_id')!) : null,
    min_score: parseInt(params.get('min_score') || '0')
  }
}

const getFinalScore = (scoresArr: any[], participantId: number): number | null => {
  if (!Array.isArray(scoresArr)) return null
  
  const currentScore = scoresArr.find((score: any) => 
    ['CURRENT', 'FT', 'AET', 'LIVE'].includes(score.type?.name)
  )
  
  if (!currentScore) return null
  
  const participantScore = currentScore.scores?.find(
    (s: any) => s.participant_id === participantId
  )
  
  return participantScore?.score?.goals ?? null
}

const matchesWavesHandler: APIRouteV1 = {
  path: '/v1/matches/waves',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    const payload = await getPayload({ config })
    const query = parseWaveQuery(req)

    try {
      // Build MongoDB query
      const where: any = {}
      
      // Minimum score filter
      if (query.min_score > 0) {
        where['wave_score.total'] = { greater_than_equal: query.min_score }
      }

      // Date filter - matches on specific date
      if (query.date) {
        const startOfDay = new Date(query.date)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(query.date)
        endOfDay.setHours(23, 59, 59, 999)

        where.starting_at = {
          greater_than_equal: startOfDay.toISOString(),
          less_than_equal: endOfDay.toISOString()
        }
      }

      // League filter
      if (query.league_id) {
        where.league_id = { equals: query.league_id }
      }

      // Fetch matches sorted by wave score
      const result = await payload.find({
        collection: 'matches',
        where,
        sort: '-wave_score.total', // Sort by wave score descending
        limit: query.limit,
        page: query.page
      })

      // Filter and transform matches to response format
      const matchesWithScores = result.docs.filter((match: Match) => 
        match.wave_score && match.wave_score.total !== undefined
      )
      
      const matches: WaveMatchSummary[] = matchesWithScores.map((match: Match) => {
        const participants = match.participants as any[]
        const homeTeam = participants?.find(p => p.meta?.location === 'home') || {}
        const awayTeam = participants?.find(p => p.meta?.location === 'away') || {}
        const scores = match.scores as any[]
        const state = match.state as any
        const league = match.league as any

        return {
          id: match.id,
          starting_at: match.starting_at,
          state: {
            short_name: state?.short_name || 'NS',
            state: state?.state || 'NOT_STARTED'
          },
          home_team: {
            id: homeTeam.id || 0,
            name: homeTeam.name || 'TBD',
            short_code: homeTeam.short_code,
            image_path: homeTeam.image_path
          },
          away_team: {
            id: awayTeam.id || 0,
            name: awayTeam.name || 'TBD',
            short_code: awayTeam.short_code,
            image_path: awayTeam.image_path
          },
          score: {
            home: getFinalScore(scores, homeTeam.id),
            away: getFinalScore(scores, awayTeam.id)
          },
          league: {
            id: league?.id || match.league_id,
            name: league?.name || 'Unknown League',
            image_path: league?.logo_path,
            country_id: league?.country_id
          },
          wave_score: {
            total: match.wave_score?.total || 0,
            tier: match.wave_score?.tier || 'C',
            factors: match.wave_score?.factors || {
              rivalry: 0,
              position: 0,
              zone: 0,
              form: 0,
              h2h: 0,
              timing: 0
            }
          }
        }
      })

      const response: WaveMatchesResponse = {
        matches,
        meta: {
          total: result.totalDocs,
          page: result.page,
          limit: result.limit,
          filters: {
            date: query.date || undefined,
            league_id: query.league_id || undefined,
            min_score: query.min_score || undefined
          }
        }
      }

      return Response.json(response)

    } catch (error) {
      console.error('Error in matches waves endpoint:', error)
      return Response.json(
        { error: 'Failed to fetch wave matches' },
        { status: 500 }
      )
    }
  }
}

export default matchesWavesHandler