import type { APIRouteV1 } from './index'
import type { PayloadRequest } from 'payload'
import { getPayload } from 'payload'
import config from '@payload-config'

// Cache for league data to avoid repeated lookups
const leagueCache = new Map<number, any>()
const leaguePriorityMap = new Map<number, number>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Match list response type (keeping same interfaces)
export interface MatchListResponse {
  docs: MatchSummary[]
  meta: {
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasMorePages: boolean
      hasPreviousPages: boolean
      nextPage: number | null
      previousPage: number | null
      nextPageUrl: string | null
      previousPageUrl: string | null
      firstPageUrl: string
      lastPageUrl: string
    }
  }
  featured_leagues?: FeaturedLeague[]
  filters_applied?: {
    date_range?: { from: string; to: string }
    leagues?: number[]
    teams?: number[]
    status?: string[]
    view?: string
  }
}

export interface MatchSummary {
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
    priority?: number
    tier?: string
    featured?: boolean
  }
  venue?: {
    name?: string
    city?: string
  }
  has_lineups?: boolean
  has_events?: boolean
}

export interface FeaturedLeague {
  id: number
  name: string
  image_path?: string
  match_count: number
  priority: number
}

// Helper to parse query parameters
function parseMatchListQuery(req: PayloadRequest) {
  if (!req.url) return {}
  
  const url = new URL(req.url, 'http://localhost')
  const searchParams = url.searchParams
  
  return {
    page: parseInt(searchParams.get('page') || '1'),
    limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100),
    date_from: searchParams.get('date_from'),
    date_to: searchParams.get('date_to'),
    leagues: searchParams.get('leagues')?.split(',').map(Number).filter(Boolean) || [],
    teams: searchParams.get('teams')?.split(',').map(Number).filter(Boolean) || [],
    status: searchParams.get('status')?.split(',').filter(Boolean) || [],
    view: searchParams.get('view'),
    sort: searchParams.get('sort') || 'priority',
    search: searchParams.get('search'),
    include_featured: searchParams.get('include_featured') !== 'false',
    only_featured: searchParams.get('only_featured') === 'true'
  }
}

// Helper to build pagination URLs
function buildPaginationUrls(req: PayloadRequest, queryParams: any, page: number, totalPages: number) {
  if (!req.url) {
    // Fallback URLs if we can't parse the original request
    return {
      nextPageUrl: null,
      previousPageUrl: null,
      firstPageUrl: '/api/v1/matches?page=1',
      lastPageUrl: `/api/v1/matches?page=${totalPages}`
    }
  }
  
  const url = new URL(req.url)
  const basePath = url.pathname
  
  // Helper to build URL with specific page
  const buildUrlForPage = (pageNum: number): string => {
    const params = new URLSearchParams()
    
    // Add page parameter
    params.set('page', pageNum.toString())
    
    // Add limit if not default
    if (queryParams.limit !== 20) {
      params.set('limit', queryParams.limit.toString())
    }
    
    // Add all other parameters
    if (queryParams.date_from) params.set('date_from', queryParams.date_from)
    if (queryParams.date_to) params.set('date_to', queryParams.date_to)
    if (queryParams.leagues.length > 0) params.set('leagues', queryParams.leagues.join(','))
    if (queryParams.teams.length > 0) params.set('teams', queryParams.teams.join(','))
    if (queryParams.status.length > 0) params.set('status', queryParams.status.join(','))
    if (queryParams.view) params.set('view', queryParams.view)
    if (queryParams.sort !== 'priority') params.set('sort', queryParams.sort)
    if (queryParams.search) params.set('search', queryParams.search)
    if (!queryParams.include_featured) params.set('include_featured', 'false')
    if (queryParams.only_featured) params.set('only_featured', 'true')
    
    return `${basePath}?${params.toString()}`
  }
  
  return {
    nextPageUrl: page < totalPages ? buildUrlForPage(page + 1) : null,
    previousPageUrl: page > 1 ? buildUrlForPage(page - 1) : null,
    firstPageUrl: buildUrlForPage(1),
    lastPageUrl: buildUrlForPage(totalPages)
  }
}

// Helper to get final score from scores array
function getFinalScore(scoresArr: any[], participantId: number): number | null {
  if (!Array.isArray(scoresArr)) return null
  
  const current = scoresArr.find(
    (s) => s.participant_id === participantId && s.description === 'CURRENT'
  )
  if (current) return current.score?.goals ?? null
  
  const secondHalf = scoresArr.find(
    (s) => s.participant_id === participantId && s.description === '2ND_HALF'
  )
  if (secondHalf) return secondHalf.score?.goals ?? null
  
  return null
}

// Helper to build date range filters
function buildDateFilters(view?: string, date_from?: string, date_to?: string) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  switch (view) {
    case 'today':
      return {
        starting_at: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      }
      
    case 'live':
      return {
        'state.state': { $in: ['LIVE', 'HT', 'inplay'] }
      }
      
    case 'upcoming':
      return {
        starting_at: { $gt: now },
        'state.state': { $in: ['NS', 'not_started'] }
      }
      
    case 'recent':
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return {
        starting_at: { $gte: weekAgo, $lte: now },
        'state.state': { $in: ['FT', 'finished'] }
      }
      
    default:
      const filters: any = {}
      if (date_from) {
        filters.starting_at = { ...filters.starting_at, $gte: new Date(date_from) }
      }
      if (date_to) {
        filters.starting_at = { ...filters.starting_at, $lte: new Date(date_to) }
      }
      return filters
  }
}

// Calculate league priority score using CMS data
function calculatePriorityScore(league?: any): number {
  if (!league) return 20
  
  const featuredWeight = league.featured ? 200 : 0
  const manualPriority = league.priority || 0
  const tierWeight = (() => {
    switch (league.tier) {
      case 'tier1': return 100
      case 'tier2': return 80
      case 'tier3': return 60
      case 'tier4': return 40
      default: return 20
    }
  })()
  
  return featuredWeight + manualPriority + tierWeight
}

// Load and cache all league data with priorities
async function loadLeaguePriorities(payload: any): Promise<void> {
  const now = Date.now()
  
  // Check if cache is still valid
  const cacheTimestamp = leaguePriorityMap.get(-1) // Use -1 as timestamp key
  if (cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL) {
    return // Cache is still valid
  }
  
  try {
    // Load all leagues with priority data using direct MongoDB to match the ID structure
    const leagues = await payload.db.connection.collection('leagues').find({}, {
      projection: { _id: 1, name: 1, logo_path: 1, country_id: 1, priority: 1, tier: 1, featured: 1 }
    }).toArray()
    
    // Clear old cache
    leagueCache.clear()
    leaguePriorityMap.clear()
    
    // Populate caches using _id as the key
    for (const league of leagues) {
      const priorityScore = calculatePriorityScore(league)
      
      leagueCache.set(league._id, {
        ...league,
        id: league._id, // Map _id to id for consistency in the rest of the code
        timestamp: now
      })
      leaguePriorityMap.set(league._id, priorityScore)
    }
    
    // Set cache timestamp
    leaguePriorityMap.set(-1, now)
    
    console.log(`Loaded ${leagues.length} leagues into priority cache`)
    
  } catch (error) {
    console.error('Failed to load league priorities:', error)
  }
}

// Build aggregation pipeline using cached priority data
function buildPriorityAggregation(filters: any, sort: string, skip: number, limit: number) {
  const pipeline = []
  
  // Match stage
  if (Object.keys(filters).length > 0) {
    pipeline.push({ $match: filters })
  }
  
  if (sort === 'priority' || sort === 'relevance') {
    // Add priority score field using cached data
    const priorityConditions: any[] = []
    
    // Build conditions for each league we have priority data for
    for (const [leagueId, priorityScore] of leaguePriorityMap.entries()) {
      if (leagueId === -1) continue // Skip timestamp entry
      
      priorityConditions.push({
        case: { $eq: ['$league_id', leagueId] },
        then: priorityScore
      })
    }
    
    pipeline.push({
      $addFields: {
        league_priority_score: {
          $switch: {
            branches: priorityConditions,
            default: 20 // Default priority for unknown leagues
          }
        }
      }
    })
    
    // Sort by priority first, then by time
    pipeline.push({
      $sort: {
        league_priority_score: -1,
        starting_at: 1
      }
    })
  } else {
    // Simple time-based sorting
    pipeline.push({
      $sort: { starting_at: sort === 'time' ? 1 : -1 }
    })
  }
  
  // Pagination
  pipeline.push({ $skip: skip })
  pipeline.push({ $limit: limit })
  
  // Project only needed fields
  pipeline.push({
    $project: {
      _id: 1,
      league_id: 1,
      starting_at: 1,
      participants: 1,
      scores: 1,
      venue: 1,
      state: 1,
      lineups: { $size: { $ifNull: ['$lineups', []] } },
      events: { $size: { $ifNull: ['$events', []] } }
    }
  })
  
  return pipeline
}

const matchesListProperHandler: APIRouteV1 = {
  path: '/v1/matches',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    const payload = await getPayload({ config })
    const queryParams = parseMatchListQuery(req)
    
    try {
      const startTime = Date.now()
      
      // Load league priorities from CMS (cached)
      const leagueLoadStart = Date.now()
      await loadLeaguePriorities(payload)
      console.log('League priorities loaded in:', Date.now() - leagueLoadStart, 'ms')
      
      // Build base query filters
      const query: any = {}
      
      // Date range filtering
      const dateFilters = buildDateFilters(queryParams.view, queryParams.date_from, queryParams.date_to)
      Object.assign(query, dateFilters)
      
      // League filtering
      if (queryParams.leagues.length > 0) {
        query.league_id = { $in: queryParams.leagues }
      }
      
      // Handle "only_featured" filtering
      if (queryParams.only_featured) {
        const featuredLeagueIds = Array.from(leagueCache.entries())
          .filter(([_, league]) => league.featured)
          .map(([id, _]) => id)
        
        if (featuredLeagueIds.length > 0) {
          query.league_id = query.league_id 
            ? { $in: featuredLeagueIds.filter(id => query.league_id.$in.includes(id)) }
            : { $in: featuredLeagueIds }
        } else {
          // No featured leagues, return empty
          return Response.json({
            docs: [],
            meta: {
              pagination: {
                page: queryParams.page,
                limit: queryParams.limit,
                total: 0,
                totalPages: 0,
                hasMorePages: false,
                hasPreviousPages: false,
                nextPage: null,
                previousPage: null
              }
            }
          })
        }
      }
      
      // Team filtering
      if (queryParams.teams.length > 0) {
        query.$or = [
          { 'participants.id': { $in: queryParams.teams } }
        ]
      }
      
      // Status filtering
      if (queryParams.status.length > 0) {
        query['state.state'] = { $in: queryParams.status }
      }
      
      // Search filtering (team names in MongoDB, league names in post-processing)
      if (queryParams.search) {
        query['participants.name'] = { $regex: queryParams.search, $options: 'i' }
      }
      
      console.log('Query built in:', Date.now() - startTime, 'ms')
      
      // Get total count
      const countStart = Date.now()
      const total = await payload.db.connection.collection('matches').countDocuments(query)
      console.log('Count query in:', Date.now() - countStart, 'ms')
      
      // Calculate pagination
      const skip = (queryParams.page - 1) * queryParams.limit
      const totalPages = Math.ceil(total / queryParams.limit)
      
      // Execute main query
      const queryStart = Date.now()
      const pipeline = buildPriorityAggregation(query, queryParams.sort, skip, queryParams.limit)
      const matches = await payload.db.connection.collection('matches').aggregate(pipeline).toArray()
      console.log('Main query in:', Date.now() - queryStart, 'ms')
      
      // Transform matches
      const transformStart = Date.now()
      
      const transformedMatches: MatchSummary[] = matches
        .map((match: any) => {
          const homeTeam = match.participants?.find((p: any) => p.meta?.location === 'home')
          const awayTeam = match.participants?.find((p: any) => p.meta?.location === 'away')
          
          const homeScore = homeTeam ? getFinalScore(match.scores || [], homeTeam.id) : null
          const awayScore = awayTeam ? getFinalScore(match.scores || [], awayTeam.id) : null
          
          const league = leagueCache.get(match.league_id)
          
          // Apply league name search filter if needed
          if (queryParams.search && league) {
            const searchTerm = queryParams.search.toLowerCase()
            const teamMatch = homeTeam?.name?.toLowerCase().includes(searchTerm) || 
                            awayTeam?.name?.toLowerCase().includes(searchTerm)
            const leagueMatch = league.name?.toLowerCase().includes(searchTerm)
            
            if (!teamMatch && !leagueMatch) {
              return null // Filter out this match
            }
          }
          
          return {
            id: match._id,
            starting_at: match.starting_at,
            state: match.state || { short_name: 'UNKNOWN', state: 'unknown' },
            home_team: homeTeam ? {
              id: homeTeam.id,
              name: homeTeam.name,
              short_code: homeTeam.short_code,
              image_path: homeTeam.image_path
            } : { id: 0, name: 'TBD' },
            away_team: awayTeam ? {
              id: awayTeam.id,
              name: awayTeam.name,
              short_code: awayTeam.short_code,
              image_path: awayTeam.image_path
            } : { id: 0, name: 'TBD' },
            score: {
              home: homeScore,
              away: awayScore
            },
            league: {
              id: league?.id || match.league_id,
              name: league?.name || 'Unknown League',
              image_path: league?.logo_path,
              country_id: league?.country_id,
              priority: league?.priority || 0,
              tier: league?.tier,
              featured: league?.featured || false
            },
            venue: match.venue ? {
              name: match.venue.name,
              city: match.venue.city_name
            } : undefined,
            has_lineups: (match.lineups || 0) > 0,
            has_events: (match.events || 0) > 0
          }
        })
        .filter(Boolean)
      
      console.log('Transform in:', Date.now() - transformStart, 'ms')
      
      // Get featured leagues if requested
      let featured_leagues: FeaturedLeague[] | undefined
      if (queryParams.include_featured) {
        const featuredStart = Date.now()
        
        const featuredLeagueIds = Array.from(leagueCache.entries())
          .filter(([_, league]) => league.featured)
          .map(([id, league]) => ({ id, league }))
          .sort((a, b) => (b.league.priority || 0) - (a.league.priority || 0))
          .slice(0, 10)
        
        featured_leagues = featuredLeagueIds.map(({ id, league }) => ({
          id,
          name: league.name,
          image_path: league.logo_path,
          match_count: transformedMatches.filter(m => m.league.id === id).length,
          priority: league.priority || 0
        }))
        
        console.log('Featured leagues in:', Date.now() - featuredStart, 'ms')
      }
      
      // Build pagination URLs
      const paginationUrls = buildPaginationUrls(req, queryParams, queryParams.page, totalPages)
      
      const response: MatchListResponse = {
        docs: transformedMatches,
        meta: {
          pagination: {
            page: queryParams.page,
            limit: queryParams.limit,
            total,
            totalPages,
            hasMorePages: queryParams.page < totalPages,
            hasPreviousPages: queryParams.page > 1,
            nextPage: queryParams.page < totalPages ? queryParams.page + 1 : null,
            previousPage: queryParams.page > 1 ? queryParams.page - 1 : null,
            nextPageUrl: paginationUrls.nextPageUrl,
            previousPageUrl: paginationUrls.previousPageUrl,
            firstPageUrl: paginationUrls.firstPageUrl,
            lastPageUrl: paginationUrls.lastPageUrl
          }
        },
        featured_leagues,
        filters_applied: {
          date_range: queryParams.date_from || queryParams.date_to ? {
            from: queryParams.date_from || '',
            to: queryParams.date_to || ''
          } : undefined,
          leagues: queryParams.leagues.length > 0 ? queryParams.leagues : undefined,
          teams: queryParams.teams.length > 0 ? queryParams.teams : undefined,
          status: queryParams.status.length > 0 ? queryParams.status : undefined,
          view: queryParams.view
        }
      }
      
      console.log('Total request time:', Date.now() - startTime, 'ms')
      return Response.json(response)
      
    } catch (err) {
      console.error('Error in matches list handler:', err)
      return Response.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}

export default matchesListProperHandler