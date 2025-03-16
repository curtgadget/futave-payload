import { getPositionGroup } from '@/constants/team'
import {
  STANDING_DETAIL_TYPES,
  STANDING_DETAIL_NAME_PATTERNS,
  matchesDetailPattern,
  LEAGUE_QUALIFICATION_RULES,
  QualificationRule,
  RULE_TYPE_ID_MAP,
} from '@/constants/sportmonks'
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

// Add the missing type definitions
type QualificationStatus = {
  type: string
  name: string
  color: string
}

type SportmonksStandingRow = {
  position: number
  rule?: any
  // Add other properties as needed
}

/**
 * Helper function to format team form data into a standard W/D/L format
 * Handles different input formats from the Sportmonks API
 */
function formatTeamForm(formData: any): string | undefined {
  // If formData is null or undefined
  if (!formData) {
    return undefined
  }

  // If formData is already a string with content, just return it
  if (typeof formData === 'string' && formData.length > 0) {
    // Check if the string appears to be already in W/D/L format
    if (/^[WDLwdl-]+$/.test(formData)) {
      return formData.toUpperCase()
    }
    return formData
  }

  // Handle the specific format where form is an array of objects with form and sort_order properties
  if (Array.isArray(formData) && formData.length > 0 && typeof formData[0]?.form === 'string') {
    // Sort by sort_order in ascending order (oldest to newest)
    const sortedFormData = [...formData].sort((a, b) => {
      // Handle the case where sort_order might be missing
      const orderA = typeof a.sort_order === 'number' ? a.sort_order : 0
      const orderB = typeof b.sort_order === 'number' ? b.sort_order : 0
      return orderA - orderB // Ascending order
    })

    // Take the 5 most recent matches (last 5 in the sorted array)
    const lastFiveMatches = sortedFormData.slice(Math.max(0, sortedFormData.length - 5))

    // Extract form values
    return lastFiveMatches.map((entry) => entry.form?.toUpperCase() || '-').join('')
  }

  // If formData is a different kind of array or has a data property that's an array
  const formArray = Array.isArray(formData)
    ? formData
    : formData?.data && Array.isArray(formData.data)
      ? formData.data
      : null

  if (formArray && formArray.length > 0) {
    // Check if we're dealing with the format where the array contains objects with form and sort_order
    if (typeof formArray[0]?.form === 'string' && 'sort_order' in formArray[0]) {
      // Sort by sort_order in ascending order (oldest to newest)
      const sortedFormArray = [...formArray].sort((a, b) => {
        const orderA = typeof a.sort_order === 'number' ? a.sort_order : 0
        const orderB = typeof b.sort_order === 'number' ? b.sort_order : 0
        return orderA - orderB // Ascending order
      })

      // Take the 5 most recent matches (last 5 in the sorted array)
      const lastFiveMatches = sortedFormArray.slice(Math.max(0, sortedFormArray.length - 5))

      // Extract form values
      return lastFiveMatches.map((entry) => entry.form?.toUpperCase() || '-').join('')
    }

    // Handle other array formats - assume newest entries are first in array
    // We reverse the final result to make most recent match appear on the right
    const formValues = formArray.slice(0, 5).map((entry: any) => {
      // If entry is a string, assume it's already a result code
      if (typeof entry === 'string') {
        if (entry.toLowerCase() === 'w' || entry.toLowerCase() === 'win') return 'W'
        if (entry.toLowerCase() === 'd' || entry.toLowerCase() === 'draw') return 'D'
        if (entry.toLowerCase() === 'l' || entry.toLowerCase() === 'loss') return 'L'
        return entry.toUpperCase().charAt(0) || '-'
      }

      // If entry is an object with a result property
      if (entry && typeof entry === 'object') {
        if (typeof entry.form === 'string') {
          return entry.form.toUpperCase()
        }

        const result = typeof entry.result === 'string' ? entry.result.toLowerCase() : ''

        if (result === 'w' || result === 'win') return 'W'
        if (result === 'd' || result === 'draw') return 'D'
        if (result === 'l' || result === 'loss') return 'L'

        // Try other possible properties if result is not found
        if (entry.outcome) {
          const outcome = entry.outcome.toLowerCase()
          if (outcome.includes('win')) return 'W'
          if (outcome.includes('draw')) return 'D'
          if (outcome.includes('loss') || outcome.includes('lose')) return 'L'
        }

        return result.charAt(0).toUpperCase() || '-'
      }

      return '-' // Default if we can't determine the result
    })

    // Reverse to have most recent match on the right
    return formValues.reverse().join('')
  }

  // If we couldn't find any form data
  return undefined
}

/**
 * Determines the qualification status of a team based on its position and league rules
 */
function determineQualificationStatus(
  row: SportmonksStandingRow,
  leagueId?: number,
  table?: any,
): { type: string; name: string; color?: string } | undefined {
  // No rule data available
  if (!row.rule) {
    return undefined
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`Rule data for position ${row.position}:`, row.rule)
  }

  // Check for type_id field (the approach observed in the logs)
  if (typeof row.rule.type_id === 'number') {
    const typeId = row.rule.type_id

    // Before using our direct mapping, handle special cases for specific leagues

    // Handle Scottish Premiership (league ID 501)
    // Their API just gives us Championship/Relegation round info, but we want to show specific qualifications
    if (leagueId === 501) {
      if (typeId === 183) {
        // Championship Round (top 6)
        // Based on position, determine the specific European qualification
        if (row.position === 1) {
          return {
            type: 'champions_league_qualifying',
            name: 'Champions League Qualifying',
            color: '#1E74D3',
          }
        } else if (row.position === 2 || row.position === 3) {
          return {
            type: 'europa_league_qualifying',
            name: 'Europa League Qualifying',
            color: '#FF5733',
          }
        } else if (row.position === 4) {
          return {
            type: 'conference_league_qualifying',
            name: 'Conference League Qualifying',
            color: '#24B71E',
          }
        } else {
          // Positions 5-6 get the general "Championship Round" status
          return RULE_TYPE_ID_MAP[typeId]
        }
      } else if (typeId === 184) {
        // Relegation Round (bottom 6)
        // Based on position, determine specific relegation statuses
        if (row.position === 12) {
          return {
            type: 'relegation',
            name: 'Relegation',
            color: '#FF0000',
          }
        } else if (row.position === 11) {
          return {
            type: 'relegation_playoff',
            name: 'Relegation Playoff',
            color: '#FFA500',
          }
        } else {
          // Positions 7-10 get the general "Relegation Round" status
          return RULE_TYPE_ID_MAP[typeId]
        }
      }
    }

    // For direct UEFA competition or relegation status, use the mapping directly
    if (typeId === 180 || typeId === 181 || typeId === 182) {
      return RULE_TYPE_ID_MAP[typeId]
    }

    // For all other type IDs that we have mappings for
    if (RULE_TYPE_ID_MAP[typeId]) {
      return RULE_TYPE_ID_MAP[typeId]
    }

    // If we don't have a mapping but it's a new type ID, log it in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Unknown rule type_id: ${typeId} for position ${row.position}`)
    }
  }

  // Check for type field (this was our original expectation, keeping as fallback)
  if (row.rule.type) {
    const ruleType = row.rule.type?.toLowerCase()

    // Set up qualification type and color based on rule type
    if (ruleType.includes('champions league')) {
      return {
        type: 'champions_league',
        name: 'Champions League Qualification',
        color: '#2A44FF',
      }
    }

    if (ruleType.includes('europa league')) {
      return {
        type: 'europa_league',
        name: 'Europa League Qualification',
        color: '#FF5733',
      }
    }

    if (ruleType.includes('conference league')) {
      return {
        type: 'conference_league',
        name: 'Conference League Qualification',
        color: '#24B71E',
      }
    }

    if (ruleType.includes('relegation')) {
      // Check if it's relegation playoff
      if (ruleType.includes('playoff')) {
        return {
          type: 'relegation_risk',
          name: 'Relegation Playoff',
          color: '#FFA500',
        }
      }

      // Direct relegation
      return {
        type: 'relegation',
        name: 'Relegation',
        color: '#FF0000',
      }
    }
  }

  // If we have position and leagueId, look for league-specific qualification rules
  if (row.position && leagueId) {
    // Check if we have specific rules for this league
    const leagueRules = LEAGUE_QUALIFICATION_RULES[leagueId]
    if (leagueRules) {
      // Find the rule that matches this position
      for (const rule of leagueRules) {
        if (rule.positions.includes(row.position)) {
          return {
            type: rule.type,
            name: rule.name,
            color: rule.color,
          }
        }
      }
    }

    // If no league-specific rule is found, use generic position-based logic
    // as a last resort
    const totalTeams = table?.standings?.length || 20 // Default to 20 if unknown

    // Top 4 are typically Champions League in major leagues
    if (row.position <= 4) {
      return {
        type: 'champions_league',
        name: 'Champions League',
        color: '#1E74D3',
      }
    }

    // 5-6 are typically Europa League
    if (row.position === 5 || row.position === 6) {
      return {
        type: 'europa_league',
        name: 'Europa League',
        color: '#FF5733',
      }
    }

    // Conference League often for position 7
    if (row.position === 7) {
      return {
        type: 'conference_league',
        name: 'Conference League',
        color: '#24B71E',
      }
    }

    // Bottom 3 teams are typically relegated
    if (row.position > totalTeams - 3) {
      return {
        type: 'relegation',
        name: 'Relegation',
        color: '#FF0000',
      }
    }

    // Team just above relegation might be in a playoff
    if (row.position === totalTeams - 3) {
      return {
        type: 'relegation_risk',
        name: 'Relegation Playoff',
        color: '#FFA500',
      }
    }
  }

  // No qualification status could be determined
  return undefined
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
  const transformedStandings: TeamTableResponse = {}

  if (
    !rawTeam.standings ||
    typeof rawTeam.standings !== 'object' ||
    Object.keys(rawTeam.standings).length === 0
  ) {
    return transformedStandings
  }

  /**
   * Helper function to create a standard standing row from any standing object format
   */
  const createStandingRow = (row: any, table: any = null): StandingTableRow => {
    // Use the participant data for team information when available
    const participant = row.participant || {}

    // Format form data
    const formattedForm = formatTeamForm(row.form)

    // Extract and process details
    const detailValues = extractStandingDetails(row.details)

    // Determine qualification status (Champions League, relegation, etc.)
    const leagueId = table?.league_id || (rawTeam as any).league_id
    const qualificationStatus = determineQualificationStatus(row, leagueId, table)

    // Get raw values from the row, then fall back to calculated values from details
    return {
      position: typeof row.position === 'number' ? row.position : 0,
      team_id: typeof row.participant_id === 'number' ? row.participant_id : 0,
      team_name: row.team_name || participant?.name || `Team ${row.participant_id}`,
      team_logo_path: participant?.image_path || null,
      points: typeof row.points === 'number' ? row.points : 0,
      played:
        typeof row.games === 'number'
          ? row.games
          : typeof row.played === 'number'
            ? row.played
            : detailValues.played > 0
              ? detailValues.played
              : detailValues.won + detailValues.draw + detailValues.lost,
      won: typeof row.won === 'number' ? row.won : detailValues.won,
      draw: typeof row.draw === 'number' ? row.draw : detailValues.draw,
      lost: typeof row.lost === 'number' ? row.lost : detailValues.lost,
      goals_for:
        typeof row.goals_scored === 'number'
          ? row.goals_scored
          : typeof row.goals_for === 'number'
            ? row.goals_for
            : detailValues.goals_for,
      goals_against:
        typeof row.goals_against === 'number' ? row.goals_against : detailValues.goals_against,
      goal_difference:
        typeof row.goal_difference === 'number'
          ? row.goal_difference
          : detailValues.goals_for - detailValues.goals_against,
      form: formattedForm,
      current_streak:
        typeof row.status === 'string'
          ? row.status
          : typeof row.current_streak === 'string'
            ? row.current_streak
            : undefined,
      clean_sheets:
        typeof row.clean_sheets === 'number' ? row.clean_sheets : detailValues.clean_sheets,
      failed_to_score:
        typeof row.failed_to_score === 'number'
          ? row.failed_to_score
          : detailValues.failed_to_score,
      qualification_status: qualificationStatus,
    }
  }

  // Process each season's standings data
  Object.entries(rawTeam.standings).forEach(([seasonId, standingsData]) => {
    try {
      // Try the array processing path
      if (Array.isArray(standingsData) && standingsData.length > 0) {
        // Filter for valid standing items
        const validItems = standingsData.filter(
          (item) =>
            item &&
            typeof item === 'object' &&
            (typeof item.participant_id === 'number' || typeof item.team_id === 'number'),
        )

        if (validItems.length > 0) {
          // Create a simplified standings table structure
          const standingRows = validItems.map((item: any) => createStandingRow(item))

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
          }
        }
      }
      // Try the original expected structure
      else {
        const data = standingsData as any

        if (data.id && data.standings?.data && Array.isArray(data.standings.data)) {
          const transformedTables = data.standings.data
            .filter(
              (table: any) => table?.id && table?.name && Array.isArray(table?.standings?.data),
            )
            .map((table: any) => {
              const rows = table.standings.data
                .filter((row: any) => row)
                .map((item: any) => createStandingRow(item, table))

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
          }
        }
      }
    } catch (error) {
      console.error(`Error transforming standings for season ${seasonId}:`, error)
    }
  })

  return transformedStandings
}

/**
 * Helper function to extract standing details from the details array
 */
function extractStandingDetails(details: any[]): {
  played: number
  won: number
  draw: number
  lost: number
  goals_for: number
  goals_against: number
  clean_sheets: number | undefined
  failed_to_score: number | undefined
} {
  // Default values
  let played = 0
  let won = 0
  let draw = 0
  let lost = 0
  let goals_for = 0
  let goals_against = 0
  let clean_sheets: number | undefined = undefined
  let failed_to_score: number | undefined = undefined

  // Process details array if it exists
  if (Array.isArray(details) && details.length > 0) {
    // First, extract all values into a map for easier lookup
    const detailsMap = new Map<number, number>()
    const detailsNameMap = new Map<string, number>()

    // Build maps of type IDs and names to values
    details.forEach((detail: any) => {
      if (typeof detail.value === 'number' && detail.type_id) {
        detailsMap.set(detail.type_id, detail.value)
        if (detail.type?.name) {
          detailsNameMap.set(detail.type.name.toLowerCase(), detail.value)
        }
      }
    })

    // Helper function to check for a detail by type ID or alternative ID
    const getDetailValue = (
      primaryTypeId: number,
      alternativeTypeId?: number,
    ): number | undefined => {
      if (detailsMap.has(primaryTypeId)) {
        return detailsMap.get(primaryTypeId)
      }
      if (alternativeTypeId !== undefined && detailsMap.has(alternativeTypeId)) {
        return detailsMap.get(alternativeTypeId)
      }
      return undefined
    }

    // Helper function to get combined home/away value
    const getCombinedHomeAwayValue = (
      homeTypeId: number,
      awayTypeId: number,
      altHomeTypeId?: number,
      altAwayTypeId?: number,
    ): number | undefined => {
      const homeValue = getDetailValue(homeTypeId, altHomeTypeId) || 0
      const awayValue = getDetailValue(awayTypeId, altAwayTypeId) || 0

      if (homeValue > 0 || awayValue > 0) {
        return homeValue + awayValue
      }
      return undefined
    }

    // 1. Process by ID first (more reliable)

    // Matches played
    played =
      getDetailValue(STANDING_DETAIL_TYPES.OVERALL_MATCHES_PLAYED) ||
      getCombinedHomeAwayValue(
        STANDING_DETAIL_TYPES.HOME_MATCHES_PLAYED,
        STANDING_DETAIL_TYPES.AWAY_MATCHES_PLAYED,
      ) ||
      0

    // Wins
    won =
      getDetailValue(STANDING_DETAIL_TYPES.OVERALL_WON, STANDING_DETAIL_TYPES.ALT_OVERALL_WON) ||
      getCombinedHomeAwayValue(
        STANDING_DETAIL_TYPES.HOME_WON,
        STANDING_DETAIL_TYPES.AWAY_WON,
        STANDING_DETAIL_TYPES.ALT_HOME_WON,
        STANDING_DETAIL_TYPES.ALT_AWAY_WON,
      ) ||
      0

    // Draws
    draw =
      getDetailValue(STANDING_DETAIL_TYPES.OVERALL_DRAW, STANDING_DETAIL_TYPES.ALT_OVERALL_DRAW) ||
      getCombinedHomeAwayValue(
        STANDING_DETAIL_TYPES.HOME_DRAW,
        STANDING_DETAIL_TYPES.AWAY_DRAW,
        STANDING_DETAIL_TYPES.ALT_HOME_DRAW,
        STANDING_DETAIL_TYPES.ALT_AWAY_DRAW,
      ) ||
      0

    // Losses
    lost =
      getDetailValue(STANDING_DETAIL_TYPES.OVERALL_LOST, STANDING_DETAIL_TYPES.ALT_OVERALL_LOST) ||
      getCombinedHomeAwayValue(
        STANDING_DETAIL_TYPES.HOME_LOST,
        STANDING_DETAIL_TYPES.AWAY_LOST,
        STANDING_DETAIL_TYPES.ALT_HOME_LOST,
        STANDING_DETAIL_TYPES.ALT_AWAY_LOST,
      ) ||
      0

    // Goals for
    goals_for =
      getDetailValue(STANDING_DETAIL_TYPES.OVERALL_GOALS_FOR) ||
      getCombinedHomeAwayValue(
        STANDING_DETAIL_TYPES.HOME_GOALS_FOR,
        STANDING_DETAIL_TYPES.AWAY_GOALS_FOR,
      ) ||
      0

    // Goals against
    goals_against =
      getDetailValue(STANDING_DETAIL_TYPES.OVERALL_GOALS_AGAINST) ||
      getCombinedHomeAwayValue(
        STANDING_DETAIL_TYPES.HOME_GOALS_AGAINST,
        STANDING_DETAIL_TYPES.AWAY_GOALS_AGAINST,
      ) ||
      0

    // If values aren't set, try name-based matching
    if (won === 0 || draw === 0 || lost === 0) {
      // Try finding by text pattern matching if ID matching failed
      details.forEach((detail: any) => {
        if (typeof detail.value !== 'number' || !detail.type?.name) return

        const value = detail.value
        const typeName = detail.type.name.toLowerCase()

        // Check for wins, draws, losses using name patterns
        if (won === 0 && matchesDetailPattern(typeName, STANDING_DETAIL_NAME_PATTERNS.WON)) {
          won = value
        }
        if (draw === 0 && matchesDetailPattern(typeName, STANDING_DETAIL_NAME_PATTERNS.DRAW)) {
          draw = value
        }
        if (lost === 0 && matchesDetailPattern(typeName, STANDING_DETAIL_NAME_PATTERNS.LOST)) {
          lost = value
        }
      })
    }

    // Clean sheets
    clean_sheets =
      getDetailValue(STANDING_DETAIL_TYPES.OVERALL_CLEAN_SHEETS) ||
      getCombinedHomeAwayValue(
        STANDING_DETAIL_TYPES.HOME_CLEAN_SHEETS,
        STANDING_DETAIL_TYPES.AWAY_CLEAN_SHEETS,
      )

    // Failed to score
    failed_to_score =
      getDetailValue(STANDING_DETAIL_TYPES.OVERALL_FAILED_TO_SCORE) ||
      getCombinedHomeAwayValue(
        STANDING_DETAIL_TYPES.HOME_FAILED_TO_SCORE,
        STANDING_DETAIL_TYPES.AWAY_FAILED_TO_SCORE,
      )

    // If clean sheets or failed to score not found by ID, try by name
    if (clean_sheets === undefined || failed_to_score === undefined) {
      details.forEach((detail: any) => {
        if (typeof detail.value !== 'number' || !detail.type?.name) return

        const typeName = detail.type.name.toLowerCase()

        if (
          clean_sheets === undefined &&
          matchesDetailPattern(typeName, STANDING_DETAIL_NAME_PATTERNS.CLEAN_SHEETS)
        ) {
          clean_sheets = detail.value
        }

        if (
          failed_to_score === undefined &&
          matchesDetailPattern(typeName, STANDING_DETAIL_NAME_PATTERNS.FAILED_TO_SCORE)
        ) {
          failed_to_score = detail.value
        }
      })
    }

    // If played is still 0 but we have results data, calculate from those
    if (played === 0 && (won > 0 || draw > 0 || lost > 0)) {
      played = won + draw + lost
    }

    // If we have played but missing one of W/D/L, calculate it
    if (played > 0) {
      if (won > 0 && draw > 0 && lost === 0) {
        lost = played - won - draw
      } else if (won > 0 && lost > 0 && draw === 0) {
        draw = played - won - lost
      } else if (draw > 0 && lost > 0 && won === 0) {
        won = played - draw - lost
      }
    }
  }

  return {
    played,
    won,
    draw,
    lost,
    goals_for,
    goals_against,
    clean_sheets,
    failed_to_score,
  }
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
