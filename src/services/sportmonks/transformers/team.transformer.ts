import { SportmonksTeam } from '../client/types'
import { getPayload } from 'payload'
import payloadConfig from '@/payload.config'

export type TransformedTeam = {
  id: number
  name: string
  logo_path: string
  country_id: number | null
  coaches: unknown | null
  players: unknown | null
  latest: unknown | null
  upcoming: unknown | null
  seasons: unknown | null
  activeseasons: unknown | null
  statistics: unknown | null
  trophies: unknown | null
  socials: unknown | null
  rankings: unknown | null
  standings: unknown | null
  season_map: { id: number; name: string }[] | null
}

export async function transformTeam(team: SportmonksTeam): Promise<TransformedTeam> {
  // Create season_map array by extracting id, name, and league_id from each season
  let season_map: { id: number; name: string }[] | null = null

  if (team.seasons && Array.isArray(team.seasons)) {
    // Extract the seasons with their league_ids
    const seasonsWithLeagueIds = team.seasons.map((season: any) => ({
      id: season.id,
      name: season.name,
      league_id: season.league_id,
      starting_at: season.starting_at,
    }))

    // Get a map of league ids to league names
    const leagueIds = seasonsWithLeagueIds
      .map((season) => season.league_id)
      .filter((id): id is number => id !== undefined && id !== null)

    const leagueNamesMap = new Map<number, string>()

    if (leagueIds.length > 0) {
      try {
        const payload = await getPayload({ config: payloadConfig })
        const leaguesResult = await payload.find({
          collection: 'leagues',
          where: {
            id: {
              in: leagueIds,
            },
          },
        })

        // Create a map of league ID to league name
        leaguesResult.docs.forEach((league: any) => {
          if (league.id && league.name) {
            leagueNamesMap.set(league.id, league.name)
          }
        })
      } catch (error) {
        console.error('Error fetching league names:', error)
      }
    }

    // Create the season_map with concatenated names and sort by starting_at
    season_map = seasonsWithLeagueIds
      .map((season) => ({
        id: season.id,
        name: leagueNamesMap.has(season.league_id)
          ? `${leagueNamesMap.get(season.league_id)} ${season.name}`
          : season.name,
      }))
      // Sort by starting_at if available, newest first
      .sort((a, b) => {
        const seasonA = seasonsWithLeagueIds.find((s) => s.id === a.id)
        const seasonB = seasonsWithLeagueIds.find((s) => s.id === b.id)

        if (seasonA?.starting_at && seasonB?.starting_at) {
          return new Date(seasonB.starting_at).getTime() - new Date(seasonA.starting_at).getTime()
        }
        return 0
      })
  }

  return {
    id: team.id,
    name: team.name,
    logo_path: team.image_path,
    country_id: team.country_id || null,
    coaches: team.coaches || null,
    players: team.players || null,
    latest: team.latest || null,
    upcoming: team.upcoming || null,
    seasons: team.seasons || null,
    activeseasons: team.activeseasons || null,
    statistics: team.statistics || null,
    trophies: team.trophies || null,
    socials: team.socials || null,
    rankings: team.rankings || null,
    standings: team.standings || null,
    season_map,
  }
}

export async function validateTeam(team: SportmonksTeam): Promise<void> {
  const requiredFields = ['id', 'name', 'image_path', 'country_id']
  const missingFields = requiredFields.filter((field) => !(field in team))

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields in team data: ${missingFields.join(', ')}`)
  }

  if (typeof team.id !== 'number' || team.id <= 0) {
    throw new Error('Invalid team ID')
  }

  if (typeof team.name !== 'string' || team.name.trim() === '') {
    throw new Error('Invalid team name')
  }

  if (typeof team.image_path !== 'string') {
    throw new Error('Invalid team logo path')
  }

  if (typeof team.country_id !== 'number' || team.country_id <= 0) {
    throw new Error('Invalid country ID')
  }
}
