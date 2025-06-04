import type { APIRouteV1 } from './index'
import type { PayloadRequest } from 'payload'
import { getPayload } from 'payload'
import config from '@payload-config'
import { MetadataTypeIds } from '@/constants/metadataType'

// Draft MatchDetailResponse type (should be moved to a types file)
export interface MatchDetailResponse {
  id: number
  league: {
    id: number
    name: string
    logo_path?: string | null
    country_id?: number
  }
  homeTeam: {
    id: number
    name: string
    logo_path?: string | null
    country_id?: number
  }
  awayTeam: {
    id: number
    name: string
    logo_path?: string | null
    country_id?: number
  }
  score: {
    home: number | null
    away: number | null
    halfTime?: {
      home: number | null
      away: number | null
    }
    [key: string]: any
  }
  status: string
  startingAt: string
  venue?: {
    name?: string
    city?: string
    [key: string]: any
  }
  waveScore?: number | null
  events?: any[]
  lineups?: any
  stats?: any
  avenue?: any
  teamForm?: {
    home: string[]
    away: string[]
  }
  historicMatchups?: Array<{
    date: string
    score: { home: number; away: number }
    [key: string]: any
  }>
  metadata?: any
  [key: string]: any
}

// Helper to parse params from req.url if not present
function getParams(req: PayloadRequest): { id: string; tab?: string } {
  if ((req as any).params) return (req as any).params
  if (!req.url) return { id: '' }
  const url = new URL(req.url, 'http://localhost')
  const parts = url.pathname.split('/')
  // /api/v1/match/:id/:tab?
  const idx = parts.findIndex((p) => p === 'match')
  const id = parts[idx + 1] || ''
  const tab = parts[idx + 2]
  return { id, tab }
}

// Helper to get final score for a participant (must be top-level)
function getFinalScore(scoresArr: any[], participantId: number) {
  if (!Array.isArray(scoresArr)) return null
  const secondHalf = scoresArr.find(
    (s) => s.participant_id === participantId && s.description === '2ND_HALF',
  )
  if (secondHalf) return secondHalf.score?.goals ?? null
  const current = scoresArr.find(
    (s) => s.participant_id === participantId && s.description === 'CURRENT',
  )
  if (current) return current.score?.goals ?? null
  return null
}

// Helper to extract coach for a specific team from coaches array
function extractCoachForTeam(teamId: number, coachesArr: any[]): any {
  if (!Array.isArray(coachesArr)) return null
  
  // Find coach whose meta.participant_id matches the team ID
  const coach = coachesArr.find((c: any) => c.meta?.participant_id === teamId)
  
  if (coach) {
    return {
      coach_id: coach.id,
      coach_name: coach.display_name || coach.name || coach.common_name,
      image_path: coach.image_path,
      nationality_id: coach.nationality_id,
      date_of_birth: coach.date_of_birth,
    }
  }
  
  return null
}

// Helper to group lineup and attach events to each player
function groupLineupWithEvents(
  teamId: number,
  formation: string | null,
  eventsArr: any[],
  lineupsArr: any[],
  sidelinedArr: any[] = [],
  coachesArr: any[] = [],
): any {
  const teamLineup = lineupsArr.filter((p: any) => p.team_id === teamId)
  const attachEvents = (player: any) => ({
    ...player,
    events: eventsArr.filter((e: any) => e.player_id === player.player_id),
  })
  const startingXI = teamLineup
    .filter((p: any) => p.type_id === 11)
    .map((p: any) =>
      attachEvents({
        player_id: p.player_id,
        player_name: p.player_name,
        jersey_number: p.jersey_number,
        position_id: p.position_id,
        formation_field: p.formation_field,
        formation_position: p.formation_position,
      }),
    )
  const bench = teamLineup
    .filter((p: any) => p.type_id === 12)
    .map((p: any) =>
      attachEvents({
        player_id: p.player_id,
        player_name: p.player_name,
        jersey_number: p.jersey_number,
        position_id: p.position_id,
        formation_field: p.formation_field,
        formation_position: p.formation_position,
      }),
    )
  const sidelined = sidelinedArr
    .filter((p: any) => p.participant_id === teamId)
    .map((p: any) => ({
      player_id: p.sideline?.player_id,
      type_id: p.sideline?.type_id,
      category: p.sideline?.category,
      start_date: p.sideline?.start_date,
      end_date: p.sideline?.end_date,
      games_missed: p.sideline?.games_missed,
      completed: p.sideline?.completed,
    }))
  
  // Extract coach for this team
  const coach = extractCoachForTeam(teamId, coachesArr)
  
  return {
    formation,
    startingXI,
    bench,
    sidelined,
    coach,
  }
}

const getMatchHandler: APIRouteV1 = {
  path: '/v1/match/:id/:tab?',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    const payload = await getPayload({ config })
    const { id, tab } = getParams(req)
    const tabName = tab || 'overview'

    // Debug logging removed for production

    try {
      // Fetch match by ID, populate relations
      const match = await payload.findByID({
        collection: 'matches',
        id,
        depth: 2,
      })
      if (!match) {
        return Response.json({ error: 'Match not found' }, { status: 404 })
      }

      // Debug: print only the top-level keys of match removed for production

      // Extract home/away team info from participants
      let homeTeamData: any = null
      let awayTeamData: any = null
      if (Array.isArray(match.participants)) {
        for (const pRaw of match.participants) {
          const p = pRaw as any
          if (p && p.meta?.location === 'home') homeTeamData = p
          if (p && p.meta?.location === 'away') awayTeamData = p
        }
      }

      const scoresArr = Array.isArray(match.scores) ? match.scores : []
      const homeScore = homeTeamData ? getFinalScore(scoresArr, homeTeamData.id) : null
      const awayScore = awayTeamData ? getFinalScore(scoresArr, awayTeamData.id) : null

      // Fetch teams
      const [homeTeam, awayTeam] = await Promise.all([
        homeTeamData ? payload.findByID({ collection: 'teams', id: homeTeamData.id }) : null,
        awayTeamData ? payload.findByID({ collection: 'teams', id: awayTeamData.id }) : null,
      ])

      // Fetch league (handle both object and ID)
      let leagueId: number | undefined = undefined
      if (typeof match.league_id === 'number') leagueId = match.league_id
      else if (match.league && typeof match.league === 'object' && 'id' in match.league)
        leagueId = (match.league as any).id
      const league = leagueId
        ? await payload.findByID({ collection: 'leagues', id: leagueId })
        : null

      // Fetch team form (stub, replace with real fetcher)
      const teamForm = {
        home: [],
        away: [],
      }
      // Fetch historic matchups (stub, replace with real query)
      const historicMatchups: MatchDetailResponse['historicMatchups'] = []

      // Compose response for overview
      if (tabName === 'overview') {
        // Defensive helpers for country_id
        const safeCountry = (val: any): number | undefined =>
          typeof val === 'number' ? val : undefined
        // Extract formation from metadata (type_id 159 or type.code === 'formation')
        let homeFormation: string | null = null
        let awayFormation: string | null = null
        if (Array.isArray(match.metadata)) {
          const formationMeta = match.metadata.find(
            (m: any) => m.type_id === 159 || (m.type && m.type.code === 'formation'),
          )
          if (
            formationMeta &&
            typeof (formationMeta as any).values === 'object' &&
            (formationMeta as any).values !== null
          ) {
            homeFormation = (formationMeta as any).values.home || null
            awayFormation = (formationMeta as any).values.away || null
          }
        }
        const lineupsArr = Array.isArray(match.lineups) ? match.lineups : []
        const eventsArr = Array.isArray(match.events) ? match.events : []
        const sidelinedArr = Array.isArray(match.sidelined) ? match.sidelined : []
        const coachesArr = Array.isArray(match.coaches) ? match.coaches : []
        const homeLineup = homeTeamData
          ? groupLineupWithEvents(homeTeamData.id, homeFormation, eventsArr, lineupsArr, sidelinedArr, coachesArr)
          : { formation: null, startingXI: [], bench: [], sidelined: [], coach: null }
        const awayLineup = awayTeamData
          ? groupLineupWithEvents(awayTeamData.id, awayFormation, eventsArr, lineupsArr, sidelinedArr, coachesArr)
          : { formation: null, startingXI: [], bench: [], sidelined: [], coach: null }
        const response: MatchDetailResponse = {
          id: match.id,
          league: league
            ? {
                id: league.id,
                name: league.name,
                logo_path: league.logo_path ?? null,
                country_id: safeCountry(league.country_id),
              }
            : { id: 0, name: '', logo_path: null, country_id: undefined },
          homeTeam: homeTeamData
            ? {
                id: homeTeamData.id,
                name: homeTeamData.name,
                logo_path: homeTeamData.image_path ?? null,
                country_id: safeCountry(homeTeamData.country_id),
              }
            : { id: 0, name: '', logo_path: null, country_id: undefined },
          awayTeam: awayTeamData
            ? {
                id: awayTeamData.id,
                name: awayTeamData.name,
                logo_path: awayTeamData.image_path ?? null,
                country_id: safeCountry(awayTeamData.country_id),
              }
            : { id: 0, name: '', logo_path: null, country_id: undefined },
          score: {
            home: homeScore,
            away: awayScore,
          },
          status:
            (match.state && typeof match.state === 'object' && 'short_name' in match.state
              ? (match.state as any).short_name
              : undefined) ||
            (match.state && typeof match.state === 'object' && 'state' in match.state
              ? (match.state as any).state
              : 'UNKNOWN'),
          startingAt: match.starting_at,
          venue: match.venue && typeof match.venue === 'object' ? match.venue : undefined,
          waveScore: (match as any).waveScore ?? null,
          events: Array.isArray(match.events) ? match.events : [],
          teamForm,
          historicMatchups,
          metadata: match.metadata || undefined,
          lineups: { home: homeLineup, away: awayLineup },
        }
        return Response.json({ data: response })
      }

      // Debug and inspect lineups for the 'lineups' tab
      if (tabName === 'lineups') {
        const lineupsArr = Array.isArray(match.lineups) ? match.lineups : []
        const eventsArr = Array.isArray(match.events) ? match.events : []
        const sidelinedArr = Array.isArray(match.sidelined) ? match.sidelined : []
        const coachesArr = Array.isArray(match.coaches) ? match.coaches : []
        // Extract formation from metadata (type_id 159 or type.code === 'formation')
        let homeFormation: string | null = null
        let awayFormation: string | null = null
        if (Array.isArray(match.metadata)) {
          const formationMeta = match.metadata.find(
            (m: any) => m.type_id === 159 || (m.type && m.type.code === 'formation'),
          )
          if (
            formationMeta &&
            typeof (formationMeta as any).values === 'object' &&
            (formationMeta as any).values !== null
          ) {
            homeFormation = (formationMeta as any).values.home || null
            awayFormation = (formationMeta as any).values.away || null
          }
        }
        const home = homeTeamData
          ? groupLineupWithEvents(homeTeamData.id, homeFormation, eventsArr, lineupsArr, sidelinedArr, coachesArr)
          : { formation: null, startingXI: [], bench: [], sidelined: [], coach: null }
        const away = awayTeamData
          ? groupLineupWithEvents(awayTeamData.id, awayFormation, eventsArr, lineupsArr, sidelinedArr, coachesArr)
          : { formation: null, startingXI: [], bench: [], sidelined: [], coach: null }
        return Response.json({ lineups: { home, away } })
      }

      // Other tabs (to be implemented)
      return Response.json({ error: 'Tab not implemented yet' }, { status: 400 })
    } catch (err) {
      console.error('Error in match handler:', err)
      return Response.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
}

export default getMatchHandler
