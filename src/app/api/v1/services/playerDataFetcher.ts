import type {
  PlayerDataFetcher,
  PlayerListDataFetcher,
  PlayerOverviewResponse,
  PlayerStatsResponse,
  PlayerCareerResponse,
  PlayersListResponse,
  PlayerSeasonStats,
  PlayerTrophy,
} from '../types/player'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { MetadataTypeIds } from '@/constants/metadataType'
import { convertCmToFeetInches, convertKgToPounds } from '../utils'

// Types for statistics data from Sportmonks
type StatisticDetail = {
  id: number
  type_id: number
  value: any
}

type PlayerStatistic = {
  id: number
  player_id: number
  team_id: number
  season_id: number
  position_id: number | null
  jersey_number: number
  details: StatisticDetail[]
}

// Helper function to extract stat value by type_id
function getStatValue(details: StatisticDetail[], typeId: number): any {
  const detail = details.find((d) => d.type_id === typeId)
  return detail?.value || null
}

// Helper function to extract foot preference from metadata
function getFootPreference(metadata: any[]): 'left' | 'right' | 'both' | undefined {
  if (!metadata || !Array.isArray(metadata)) return undefined

  const footMetadata = metadata.find((m) => m.type_id === MetadataTypeIds.PREFERRED_FOOT)
  if (!footMetadata || !footMetadata.values) return undefined

  const foot = footMetadata.values.toLowerCase()
  if (foot === 'left' || foot === 'right' || foot === 'both') {
    return foot as 'left' | 'right' | 'both'
  }

  return undefined
}

// Helper function to calculate age from date of birth
function calculateAge(dateOfBirth: string): number {
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

// Helper function to batch fetch all related data for a player
async function fetchPlayerRelatedData(player: any, payload: any, includeStatistics = true) {
  const teamIds = new Set<number>()
  const leagueIds = new Set<number>()
  
  // From trophies
  if (player.trophies && player.trophies.length > 0) {
    player.trophies.forEach((trophy: any) => {
      if (trophy.team_id) teamIds.add(trophy.team_id)
      if (trophy.league_id) leagueIds.add(trophy.league_id)
    })
  }
  
  // From statistics
  if (includeStatistics && player.statistics && player.statistics.length > 0) {
    player.statistics.forEach((stat: any) => {
      if (stat.team_id) teamIds.add(stat.team_id)
    })
  }
  
  // Batch fetch all teams
  const teamsMap = new Map()
  if (teamIds.size > 0) {
    const teams = await payload.find({
      collection: 'teams',
      where: {
        id: { in: Array.from(teamIds) }
      },
      limit: teamIds.size
    })
    
    teams.docs.forEach((team: any) => {
      teamsMap.set(team.id || team._id, team)
      // Collect league IDs from activeseasons
      if (team.activeseasons && Array.isArray(team.activeseasons)) {
        team.activeseasons.forEach((season: any) => {
          if (season.league_id) leagueIds.add(season.league_id)
        })
      }
    })
  }
  
  // Batch fetch all leagues
  const leaguesMap = new Map()
  const countryIds = new Set<number>()
  if (leagueIds.size > 0) {
    const leagues = await payload.find({
      collection: 'leagues',
      where: {
        id: { in: Array.from(leagueIds) }
      },
      limit: leagueIds.size
    })
    
    leagues.docs.forEach((league: any) => {
      leaguesMap.set(league.id || league._id, league)
      if (league.country_id) countryIds.add(league.country_id)
    })
  }
  
  // Batch fetch all countries
  const countriesMap = new Map()
  if (countryIds.size > 0) {
    const countries = await payload.find({
      collection: 'countries',
      where: {
        id: { in: Array.from(countryIds) }
      },
      limit: countryIds.size
    })
    
    countries.docs.forEach((country: any) => {
      countriesMap.set(country.id || country._id, country)
    })
  }
  
  return { teamsMap, leaguesMap, countriesMap }
}

// Helper function to format trophies using cached data
function formatTrophiesFromCache(trophies: any[], teamsMap: Map<any, any>, leaguesMap: Map<any, any>, countriesMap: Map<any, any>): PlayerTrophy[] {
  if (!trophies || trophies.length === 0) return []
  
  return trophies.map((trophy: any) => {
    const team = teamsMap.get(trophy.team_id)
    const league = leaguesMap.get(trophy.league_id)
    const country = team?.country_id ? countriesMap.get(team.country_id) : null
    
    return {
      team: {
        id: trophy.team_id?.toString() || '',
        name: team?.name || `Team ${trophy.team_id}`,
        logo: team?.logo_path,
        country: country?.name
      },
      league: {
        id: trophy.league_id?.toString() || '',
        name: league?.name || `League ${trophy.league_id}`,
        logo: league?.logo_path
      },
      season: {
        id: trophy.season_id?.toString() || '',
        name: trophy.season?.name || `Season ${trophy.season_id}`
      },
      trophy: {
        id: trophy.trophy_id?.toString() || '',
        position: trophy.trophy?.position || trophy.position || 0,
        name: trophy.trophy?.name || 'Trophy'
      }
    }
  })
}


// Helper function to convert player data to API format
function formatPlayerData(player: any, trophies?: PlayerTrophy[]): {
  id: string
  name: string
  position?: string
  nationality?: string
  photo?: string
  jersey_number?: number
  date_of_birth?: string
  age?: number
  height?: {
    metric: string
    imperial: string
  }
  weight?: {
    metric: string
    imperial: string
  }
  foot?: 'left' | 'right' | 'both'
  trophies?: PlayerTrophy[]
} {
  return {
    id: player._id?.toString() || player.id?.toString() || 'unknown',
    name: player.display_name || player.name,
    position: player.position_name || undefined,
    nationality: player.nationality?.name || undefined,
    photo: player.image_path || undefined,
    jersey_number: undefined, // This comes from team statistics
    date_of_birth: player.date_of_birth
      ? new Date(player.date_of_birth).toISOString().split('T')[0]
      : undefined,
    age: player.date_of_birth ? calculateAge(player.date_of_birth) : undefined,
    height: player.height
      ? {
          metric: `${player.height} cm`,
          imperial: convertCmToFeetInches(player.height),
        }
      : undefined,
    weight: player.weight
      ? {
          metric: `${player.weight} kg`,
          imperial: convertKgToPounds(player.weight),
        }
      : undefined,
    foot: getFootPreference(player.metadata),
    trophies: trophies,
  }
}

// Helper function to convert statistics to season stats format
function formatSeasonStats(
  stats: PlayerStatistic[],
  teams: any[] = [],
  leagues: any[] = [],
): PlayerSeasonStats[] {
  return stats.map((stat) => {
    const team = teams.find((t) => (t._id || t.id) === stat.team_id || t.id === stat.team_id.toString())
    const goals = getStatValue(stat.details, 52) // Goals
    const appearances = getStatValue(stat.details, 322) // Appearances
    const minutes = getStatValue(stat.details, 119) // Minutes played
    const assists = getStatValue(stat.details, 79) // Assists (if available)
    const yellowCards = getStatValue(stat.details, 84) // Yellow cards
    const redCards = getStatValue(stat.details, 83) // Red cards

    // Find league for this stat
    let league = leagues.length > 0 ? leagues[0] : null // For now, use the first league if available
    
    // If we have team data with activeseasons, try to find the specific league for this season
    if (team && team.activeseasons && Array.isArray(team.activeseasons)) {
      const activeSeason = team.activeseasons.find((s: any) => s.id === stat.season_id)
      if (activeSeason && activeSeason.league_id) {
        const specificLeague = leagues.find((l: any) => (l._id || l.id) === activeSeason.league_id)
        if (specificLeague) {
          league = specificLeague
        }
      }
    }

    return {
      season: {
        id: stat.season_id.toString(),
        name: `Season ${stat.season_id}`, // TODO: Get actual season name
      },
      team: {
        id: stat.team_id.toString(),
        name: team?.name || `Team ${stat.team_id}`,
        logo: team?.logo_path,
      },
      league: {
        id: league?.id?.toString() || league?._id?.toString() || '1',
        name: league?.name || 'League',
        logo: league?.logo_path,
      },
      appearances: appearances?.total || 0,
      minutes_played: minutes?.total || 0,
      goals: goals?.goals || 0,
      assists: assists || 0,
      yellow_cards: yellowCards?.total || 0,
      red_cards: redCards?.total || 0,
      jersey_number: stat.jersey_number,
      rating: undefined, // Not available in current format
    }
  })
}

/**
 * Service for fetching player-related data from MongoDB
 */
export const playerDataFetcher: PlayerDataFetcher = {
  getOverview: async (playerId: string): Promise<PlayerOverviewResponse> => {
    const payload = await getPayload({ config })

    try {
      // Fetch player data from MongoDB
      const player = await payload.db.findOne({
        collection: 'players',
        where: { _id: { equals: parseInt(playerId) } },
      })

      if (!player) {
        throw new Error(`No player found with ID: ${playerId}`)
      }

      // Get the most recent stat for current team stats
      const recentStat = player.statistics && player.statistics.length > 0
        ? player.statistics.sort((a: any, b: any) => b.season_id - a.season_id)[0]
        : null

      // Batch fetch all related data
      const { teamsMap, leaguesMap, countriesMap } = await fetchPlayerRelatedData(player, payload, !!recentStat)
      
      // Format trophies with cached data
      const formattedTrophies = formatTrophiesFromCache(player.trophies || [], teamsMap, leaguesMap, countriesMap)
      const baseData = formatPlayerData(player, formattedTrophies)

      // Format current team stats with cached data
      let currentTeamStats: PlayerSeasonStats | undefined
      if (recentStat) {
        const team = teamsMap.get(recentStat.team_id)
        let leagues: any[] = []
        
        if (team && team.activeseasons) {
          const activeSeason = team.activeseasons.find((s: any) => s.id === recentStat.season_id)
          if (activeSeason && activeSeason.league_id) {
            const league = leaguesMap.get(activeSeason.league_id)
            if (league) leagues.push(league)
          }
        }
        
        const formattedStats = formatSeasonStats([recentStat], team ? [team] : [], leagues)
        currentTeamStats = formattedStats[0]
      }

      return {
        ...baseData,
        description: undefined, // Not available in current data
        current_team_stats: currentTeamStats,
      }
    } catch (error) {
      console.error('Error fetching player overview:', error)
      throw new Error(
        `Failed to fetch player overview: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  },

  getStats: async (playerId: string, seasonId?: string): Promise<PlayerStatsResponse> => {
    const payload = await getPayload({ config })

    try {
      // Fetch player data from MongoDB
      const player = await payload.db.findOne({
        collection: 'players',
        where: { _id: { equals: parseInt(playerId) } },
      })

      if (!player) {
        throw new Error(`No player found with ID: ${playerId}`)
      }

      // Filter statistics by season if provided
      let statistics = player.statistics || []
      if (seasonId) {
        statistics = statistics.filter((stat: any) => stat.season_id.toString() === seasonId)
      }

      // Batch fetch all related data
      const { teamsMap, leaguesMap, countriesMap } = await fetchPlayerRelatedData(player, payload)
      
      // Format trophies with cached data
      const formattedTrophies = formatTrophiesFromCache(player.trophies || [], teamsMap, leaguesMap, countriesMap)
      const baseData = formatPlayerData(player, formattedTrophies)
      
      // Convert maps to arrays for formatSeasonStats
      const teams = Array.from(teamsMap.values())
      const leagues = Array.from(leaguesMap.values())
      
      // Format all season statistics
      const formattedStats = formatSeasonStats(statistics, teams, leagues)

      // Get unique seasons
      const seasons = Array.from(new Set(statistics.map((stat: any) => stat.season_id))).map(
        (id) => ({
          id: id.toString(),
          name: `Season ${id}`, // TODO: Get actual season names
        }),
      )

      return {
        ...baseData,
        stats: formattedStats,
        seasons: seasons,
      }
    } catch (error) {
      console.error('Error fetching player stats:', error)
      throw new Error(
        `Failed to fetch player stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  },

  getCareer: async (playerId: string): Promise<PlayerCareerResponse> => {
    const payload = await getPayload({ config })

    try {
      // Fetch player data from MongoDB
      const player = await payload.db.findOne({
        collection: 'players',
        where: { _id: { equals: parseInt(playerId) } },
      })

      if (!player) {
        throw new Error(`No player found with ID: ${playerId}`)
      }

      // Batch fetch all related data
      const { teamsMap, leaguesMap, countriesMap } = await fetchPlayerRelatedData(player, payload)
      
      // Format trophies with cached data
      const formattedTrophies = formatTrophiesFromCache(player.trophies || [], teamsMap, leaguesMap, countriesMap)
      const baseData = formatPlayerData(player, formattedTrophies)

      // Convert statistics to career format
      const career = (player.statistics || []).map((stat: PlayerStatistic) => {
        const goals = getStatValue(stat.details, 52) // Goals
        const appearances = getStatValue(stat.details, 322) // Appearances
        const assists = getStatValue(stat.details, 79) // Assists
        const minutes = getStatValue(stat.details, 119) // Minutes played
        const team = teamsMap.get(stat.team_id)
        
        // Find league for this season
        let league = null
        let country = null
        if (team && team.activeseasons && Array.isArray(team.activeseasons)) {
          const activeSeason = team.activeseasons.find((s: any) => s.id === stat.season_id)
          if (activeSeason && activeSeason.league_id) {
            league = leaguesMap.get(activeSeason.league_id)
            if (league && league.country_id) {
              country = countriesMap.get(league.country_id)
            }
          }
        }

        return {
          team: {
            id: stat.team_id.toString(),
            name: team?.name || `Team ${stat.team_id}`,
            logo: team?.logo_path,
          },
          league: {
            id: league?.id?.toString() || league?._id?.toString() || '1',
            name: league?.name || 'League',
            logo: league?.logo_path,
            country: country?.name || 'Country',
          },
          season: {
            id: stat.season_id.toString(),
            name: `Season ${stat.season_id}`, // TODO: Get actual season name
          },
          start_date: undefined, // Not available in current data
          end_date: undefined, // Not available in current data
          appearances: appearances?.total || 0,
          goals: goals?.goals || 0,
          assists: assists || 0,
          minutes_played: minutes?.total || 0,
        }
      })

      // Sort by season_id descending (most recent first)
      career.sort((a, b) => parseInt(b.season.id) - parseInt(a.season.id))

      return {
        ...baseData,
        career: career,
      }
    } catch (error) {
      console.error('Error fetching player career:', error)
      throw new Error(
        `Failed to fetch player career: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  },
}

/**
 * Service for fetching list of players from MongoDB
 */
export const playerListDataFetcher: PlayerListDataFetcher = {
  getPlayers: async (options: {
    page: number
    limit: number
    teamId?: string
    countryId?: string
    position?: string
    search?: string
  }): Promise<PlayersListResponse> => {
    const { page, limit, teamId, countryId, position, search } = options
    const payload = await getPayload({ config })

    try {
      // Build query conditions
      const where: any = {}

      if (teamId) {
        // Filter by team (check if player has statistics for this team)
        where['statistics.team_id'] = { equals: parseInt(teamId) }
      }

      if (countryId) {
        where.nationality_id = { equals: parseInt(countryId) }
      }

      if (position) {
        where.position_id = { equals: parseInt(position) }
      }

      if (search) {
        where.or = [
          { name: { contains: search } },
          { display_name: { contains: search } },
          { common_name: { contains: search } },
        ]
      }

      // Get total count for pagination
      const totalItems = await payload.db.count({
        collection: 'players',
        where,
      })

      // Fetch players with pagination
      const result = await payload.db.find({
        collection: 'players',
        where,
        limit,
        skip: (page - 1) * limit,
        sort: { name: 1 },
      })

      // Format player data
      const formattedPlayers = result.docs.map((player: any) => {
        const baseData = formatPlayerData(player)

        // Get jersey number from most recent statistics if available
        let jerseyNumber: number | undefined
        if (player.statistics && player.statistics.length > 0) {
          const recentStat = player.statistics.sort(
            (a: any, b: any) => b.season_id - a.season_id,
          )[0]
          jerseyNumber = recentStat.jersey_number
        }

        return {
          ...baseData,
          jersey_number: jerseyNumber,
          team: undefined, // TODO: Get current team from statistics
        }
      })

      return {
        data: formattedPlayers,
        meta: {
          pagination: {
            page,
            limit,
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
          },
        },
      }
    } catch (error) {
      console.error('Error fetching players list:', error)
      throw new Error(
        `Failed to fetch players list: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  },
}
