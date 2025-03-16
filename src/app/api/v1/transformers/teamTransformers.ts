import { getPositionGroup } from '@/constants/team'
import type {
  TeamCoach,
  TeamFixture,
  TeamFixturesResponse,
  TeamOverviewResponse,
  TeamPlayer,
  TeamResultsResponse,
  TeamSeason,
  TeamSquadBase,
  TeamStatsResponse,
  TeamTableResponse,
  TeamSquadResponse,
  TeamSquadByPosition,
  PositionGroup,
  StandingsData,
  StandingTable,
  StandingTableRow,
} from '../types/team'

interface RawTeam {
  id: number
  name: string
  activeseasons?: any[] | null
  seasons?: any[] | null
  upcoming?: any[] | null
  latest?: any[] | null
  players?: any[] | null
  coaches?: any[] | null
  statistics?: any | null
  standings?: Record<string, any> | null
}

export function transformTeamOverview(rawTeam: RawTeam): TeamOverviewResponse {
  if (!rawTeam?.id || !rawTeam?.name) {
    throw new Error('Invalid team data: missing required fields')
  }

  const squadData = transformTeamSquad(rawTeam)
  const tableData = transformTeamTable(rawTeam)
  const fixturesData = transformTeamFixtures(rawTeam)
  const resultsData = transformTeamResults(rawTeam)
  const statsData = transformTeamStats(rawTeam)

  return {
    id: String(rawTeam.id),
    name: rawTeam.name,
    squad: squadData,
    table: tableData,
    fixtures: fixturesData,
    results: resultsData,
    stats: statsData,
  }
}

export function transformTeamTable(rawTeam: RawTeam): TeamTableResponse {
  console.log('transformTeamTable called with:', {
    hasId: !!rawTeam?.id,
    hasName: !!rawTeam?.name,
    hasStandings: !!rawTeam?.standings,
    standingsType: rawTeam?.standings ? typeof rawTeam.standings : 'N/A',
    standingsKeyCount: rawTeam?.standings ? Object.keys(rawTeam.standings).length : 0,
  })

  const transformedStandings: Record<string, StandingsData> = {}

  if (rawTeam?.standings && typeof rawTeam.standings === 'object') {
    const seasonIds = Object.keys(rawTeam.standings)
    console.log(`Processing ${seasonIds.length} seasons:`, seasonIds)

    Object.entries(rawTeam.standings).forEach(([seasonId, standingsData]) => {
      console.log(`Processing season ${seasonId}:`, {
        hasData: !!standingsData,
        dataType: standingsData ? typeof standingsData : 'N/A',
        isArray: Array.isArray(standingsData),
        objectKeys:
          typeof standingsData === 'object' ? Object.keys(standingsData).slice(0, 5) : 'N/A',
      })

      // Handle different data structure
      try {
        // Check if this is an array or an array-like object with numeric keys (0, 1, 2, ...)
        const isArrayOrArrayLike =
          Array.isArray(standingsData) ||
          (typeof standingsData === 'object' &&
            !Array.isArray(standingsData) &&
            Object.keys(standingsData).every((key) => !isNaN(Number(key))))

        if (isArrayOrArrayLike) {
          console.log(
            `Season ${seasonId} appears to be an ${Array.isArray(standingsData) ? 'array' : 'array-like object'} with ${Array.isArray(standingsData) ? standingsData.length : Object.keys(standingsData).length} items`,
          )

          // Convert to array if it's not already one
          const standingsArray = Array.isArray(standingsData)
            ? standingsData
            : Object.values(standingsData)

          // Filter out any non-objects
          const validItems = standingsArray.filter((item) => item && typeof item === 'object')

          if (validItems.length > 0) {
            // Sample the first item to understand structure
            const sampleItem = validItems[0]
            console.log(
              'Sample standings item structure:',
              typeof sampleItem === 'object' && sampleItem !== null
                ? Object.keys(sampleItem)
                : 'Not an object',
            )

            // Log a few field values to help with debugging
            if (typeof sampleItem === 'object' && sampleItem !== null) {
              console.log('Sample data preview:')
              console.log('  position:', sampleItem.position)
              console.log('  participant_id:', sampleItem.participant_id)
              console.log('  team_name:', sampleItem.team_name)
              console.log('  points:', sampleItem.points)
            }

            // Create a simplified standings table structure
            const standingRows = validItems.map((row) => {
              // Log if participant_id is missing
              if (!row.participant_id) {
                console.log('Row missing participant_id:', row)
              }

              return {
                position: typeof row.position === 'number' ? row.position : 0,
                team_id: typeof row.participant_id === 'number' ? row.participant_id : 0,
                team_name: row.team_name || row.participant?.name || `Team ${row.participant_id}`,
                points: typeof row.points === 'number' ? row.points : 0,
                played:
                  typeof row.games === 'number'
                    ? row.games
                    : typeof row.played === 'number'
                      ? row.played
                      : 0,
                won:
                  typeof row.wins === 'number'
                    ? row.wins
                    : typeof row.won === 'number'
                      ? row.won
                      : 0,
                draw:
                  typeof row.draws === 'number'
                    ? row.draws
                    : typeof row.draw === 'number'
                      ? row.draw
                      : 0,
                lost:
                  typeof row.losses === 'number'
                    ? row.losses
                    : typeof row.lost === 'number'
                      ? row.lost
                      : 0,
                goals_for:
                  typeof row.goals_scored === 'number'
                    ? row.goals_scored
                    : typeof row.goals_for === 'number'
                      ? row.goals_for
                      : 0,
                goals_against: typeof row.goals_against === 'number' ? row.goals_against : 0,
                goal_difference: typeof row.goal_difference === 'number' ? row.goal_difference : 0,
                form: typeof row.form === 'string' ? row.form : undefined,
                current_streak:
                  typeof row.status === 'string'
                    ? row.status
                    : typeof row.current_streak === 'string'
                      ? row.current_streak
                      : undefined,
                clean_sheets: typeof row.clean_sheets === 'number' ? row.clean_sheets : undefined,
                failed_to_score: undefined, // This field might not exist in the data
              }
            })

            // If we have valid rows, add them to the result
            if (standingRows.length > 0) {
              transformedStandings[seasonId] = {
                id: parseInt(seasonId),
                name: `Season ${seasonId}`,
                type: 'league',
                league_id: validItems[0].league_id || 0,
                season_id: validItems[0].season_id || parseInt(seasonId),
                stage_id: validItems[0].stage_id || null,
                stage_name: validItems[0].stage_name || null,
                standings: [
                  {
                    id: 1, // Generate a placeholder ID
                    name: 'League Table',
                    type: 'total',
                    standings: standingRows,
                  },
                ],
              }
              console.log(
                `Successfully created standings for season ${seasonId} with ${standingRows.length} rows`,
              )
            } else {
              console.log(`No valid standings items found for season ${seasonId}`)
            }
          } else {
            console.log(`No valid standings items found for season ${seasonId}`)
          }
        } else if (standingsData && typeof standingsData === 'object') {
          // Try the original expected structure
          const data = standingsData as any

          console.log(`Season ${seasonId} data structure:`, {
            hasId: !!data.id,
            id: data.id,
            hasStandings: !!data.standings,
            hasStandingsData: !!data.standings?.data,
            standingsDataIsArray: Array.isArray(data.standings?.data),
            standingsDataLength: Array.isArray(data.standings?.data)
              ? data.standings.data.length
              : 0,
          })

          if (data.id && data.standings?.data && Array.isArray(data.standings.data)) {
            const tableCount = data.standings.data.length
            console.log(`Season ${seasonId} has ${tableCount} standing tables`)

            const transformedTables = data.standings.data
              .filter(
                (table: any) => table?.id && table?.name && Array.isArray(table?.standings?.data),
              )
              .map((table: any) => {
                console.log(`Table ${table.id} has ${table.standings.data.length} rows`)

                const rows = table.standings.data
                  .filter((row: any) => row)
                  .map((row: any) => {
                    // Check for participant_id which is critical
                    if (!row.participant_id) {
                      console.log('Row missing participant_id:', row)
                    }

                    return {
                      position: typeof row.position === 'number' ? row.position : 0,
                      team_id: typeof row.participant_id === 'number' ? row.participant_id : 0,
                      team_name:
                        row.team_name || row.participant?.name || `Team ${row.participant_id}`,
                      points: typeof row.points === 'number' ? row.points : 0,
                      played: typeof row.played === 'number' ? row.played : 0,
                      won: typeof row.won === 'number' ? row.won : 0,
                      draw: typeof row.draw === 'number' ? row.draw : 0,
                      lost: typeof row.lost === 'number' ? row.lost : 0,
                      goals_for: typeof row.goals_for === 'number' ? row.goals_for : 0,
                      goals_against: typeof row.goals_against === 'number' ? row.goals_against : 0,
                      goal_difference:
                        typeof row.goal_difference === 'number' ? row.goal_difference : 0,
                      form: typeof row.form === 'string' ? row.form : undefined,
                      current_streak:
                        typeof row.current_streak === 'string' ? row.current_streak : undefined,
                      clean_sheets:
                        typeof row.clean_sheets === 'number' ? row.clean_sheets : undefined,
                      failed_to_score:
                        typeof row.failed_to_score === 'number' ? row.failed_to_score : undefined,
                    }
                  })

                return {
                  id: table.id,
                  name: table.name,
                  type: table.type || '',
                  standings: rows,
                }
              })

            if (transformedTables.length > 0) {
              transformedStandings[seasonId] = {
                id: data.id,
                name: data.name || '',
                type: data.type || '',
                league_id: typeof data.league_id === 'number' ? data.league_id : 0,
                season_id: typeof data.season_id === 'number' ? data.season_id : 0,
                stage_id: data.stage_id !== undefined ? data.stage_id : null,
                stage_name: data.stage_name !== undefined ? data.stage_name : null,
                standings: transformedTables,
              }
              console.log(
                `Added standings for season ${seasonId} with ${transformedTables.length} tables`,
              )
            } else {
              console.log(`No valid standings tables found for season ${seasonId}`)
            }
          } else {
            console.log(`Season ${seasonId} missing required data structure`)
          }
        }
      } catch (error) {
        console.error(`Error transforming standings for season ${seasonId}:`, error)
      }
    })
  } else {
    console.log('No valid standings data in team object')
  }

  console.log('Final transformed standings result:', {
    seasonCount: Object.keys(transformedStandings).length,
    seasons: Object.keys(transformedStandings),
  })

  return transformedStandings
}

export function transformFixture(rawFixture: any): TeamFixture {
  if (!rawFixture?.id || !rawFixture?.date) {
    throw new Error('Invalid fixture data: missing required fields')
  }

  return {
    id: String(rawFixture.id),
    date: rawFixture.date,
  }
}

export function transformTeamFixtures(rawTeam: RawTeam): TeamFixturesResponse {
  if (!rawTeam?.upcoming) return []
  return Array.isArray(rawTeam.upcoming) ? rawTeam.upcoming.map(transformFixture) : []
}

export function transformTeamResults(rawTeam: RawTeam): TeamResultsResponse {
  if (!rawTeam?.latest) return []
  return Array.isArray(rawTeam.latest) ? rawTeam.latest.map(transformFixture) : []
}

export function transformPlayer(rawPlayer: any): TeamPlayer {
  if (!rawPlayer?.id) {
    throw new Error('Invalid player data: missing ID')
  }

  // Resolve the name based on priority:
  // 1. display_name
  // 2. name
  // 3. firstname + lastname
  const resolvedName =
    rawPlayer.display_name ||
    rawPlayer.name ||
    (rawPlayer.firstname && rawPlayer.lastname
      ? `${rawPlayer.firstname} ${rawPlayer.lastname}`
      : '') ||
    'Unknown Player'

  // Create the base player object with required fields
  const player: TeamPlayer = {
    id: String(rawPlayer.id),
    name: resolvedName,
  }

  // Add optional fields only if they exist and are valid
  if (typeof rawPlayer.position_id === 'number') {
    player.position_id = rawPlayer.position_id
  }
  if (typeof rawPlayer.detailed_position_id === 'number') {
    player.detailed_position_id = rawPlayer.detailed_position_id
  }
  if (typeof rawPlayer.common_name === 'string') {
    player.common_name = rawPlayer.common_name
  }
  if (typeof rawPlayer.firstname === 'string') {
    player.firstname = rawPlayer.firstname
  }
  if (typeof rawPlayer.lastname === 'string') {
    player.lastname = rawPlayer.lastname
  }
  if (typeof rawPlayer.display_name === 'string') {
    player.display_name = rawPlayer.display_name
  }
  if (typeof rawPlayer.image_path === 'string') {
    player.image_path = rawPlayer.image_path
  }
  if (typeof rawPlayer.captain === 'boolean') {
    player.captain = rawPlayer.captain
  }
  if (typeof rawPlayer.jersey_number === 'number') {
    player.jersey_number = rawPlayer.jersey_number
  }
  if (typeof rawPlayer.nationality?.name === 'string') {
    player.nationality_name = rawPlayer.nationality.name
  }
  if (typeof rawPlayer.nationality?.id === 'number') {
    player.nationality_id = rawPlayer.nationality.id
  }
  if (typeof rawPlayer.nationality?.image_path === 'string') {
    player.nationality_image_path = rawPlayer.nationality.image_path
  }
  if (typeof rawPlayer.nationality?.fifa_name === 'string') {
    // Extract first abbreviation from comma-delimited string
    player.nationality_fifa_name = rawPlayer.nationality.fifa_name.split(',')[0].trim()
  }

  return player
}

export function transformCoach(rawCoach: any): TeamCoach {
  if (!rawCoach?.id || !rawCoach?.name) {
    throw new Error('Invalid coach data: missing required fields')
  }

  return {
    id: String(rawCoach.id),
    name: rawCoach.name,
  }
}

export function transformTeamSquad(rawTeam: RawTeam): TeamSquadResponse {
  const squadByPosition: TeamSquadByPosition = {
    goalkeepers: [],
    defenders: [],
    midfielders: [],
    forwards: [],
  }

  if (Array.isArray(rawTeam.players)) {
    rawTeam.players.forEach((player) => {
      const transformedPlayer = transformPlayer(player)
      const group = getPositionGroup(transformedPlayer.position_id) as PositionGroup
      squadByPosition[group].push(transformedPlayer)
    })
  }

  return {
    players: squadByPosition,
    coaches: Array.isArray(rawTeam.coaches) ? rawTeam.coaches.map(transformCoach) : [],
  }
}

export function transformTeamStats(rawTeam: RawTeam): TeamStatsResponse {
  return rawTeam?.statistics || {}
}
