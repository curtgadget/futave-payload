import { getPositionGroup } from '@/constants/team'
import {
  STANDING_DETAIL_TYPES,
  STANDING_DETAIL_NAME_PATTERNS,
  matchesDetailPattern,
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

/**
 * Helper function to format team form data into a standard W/D/L format
 * Handles different input formats from the Sportmonks API
 */
function formatTeamForm(formData: any): string | undefined {
  // Log the form data type for debugging
  console.log(
    'Form data type:',
    typeof formData,
    Array.isArray(formData) ? `(array of ${formData.length} items)` : '',
    formData && typeof formData === 'object' && formData.data ? `(contains data property)` : '',
  )

  // If formData is null or undefined
  if (!formData) {
    console.log('Form data is null or undefined')
    return undefined
  }

  // If formData is already a string with content, just return it
  if (typeof formData === 'string' && formData.length > 0) {
    // Check if the string appears to be already in W/D/L format
    if (/^[WDLwdl-]+$/.test(formData)) {
      console.log('Form data is already in W/D/L format:', formData)
      return formData.toUpperCase()
    }

    // Otherwise, log it for debugging
    console.log('Form data is a string but not in expected format:', formData)
    return formData
  }

  // Handle the specific format where form is an array of objects with form and sort_order properties
  if (Array.isArray(formData) && formData.length > 0) {
    // Log sample of the array
    console.log('Form array sample (first item):', JSON.stringify(formData[0]))

    // Check if the array contains objects with 'form' property
    if (typeof formData[0]?.form === 'string') {
      console.log('Processing form array with form property. Items:', formData.length)

      // Sort by sort_order in ascending order (oldest to newest)
      const sortedFormData = [...formData].sort((a, b) => {
        // Handle the case where sort_order might be missing
        const orderA = typeof a.sort_order === 'number' ? a.sort_order : 0
        const orderB = typeof b.sort_order === 'number' ? b.sort_order : 0
        return orderA - orderB // Ascending order
      })

      // Log the sort orders
      console.log(
        'Sort orders after sorting:',
        sortedFormData.map((item) => item.sort_order),
      )

      // Take the 5 most recent matches (last 5 in the sorted array)
      const lastFiveMatches = sortedFormData.slice(Math.max(0, sortedFormData.length - 5))

      // Extract form values
      const recentForm = lastFiveMatches.map((entry) => entry.form?.toUpperCase() || '-')

      console.log('Extracted form values in chronological order:', recentForm)
      return recentForm.join('')
    }
  }

  // If formData is a different kind of array or has a data property that's an array
  const formArray = Array.isArray(formData)
    ? formData
    : formData?.data && Array.isArray(formData.data)
      ? formData.data
      : null

  if (formArray && formArray.length > 0) {
    console.log('Processing formArray with length:', formArray.length)
    console.log('First item in formArray:', JSON.stringify(formArray[0]))

    // Check if we're dealing with the format where the array contains objects with form and sort_order
    if (typeof formArray[0]?.form === 'string' && 'sort_order' in formArray[0]) {
      console.log(
        'Processing form.data array with form property structure. Items:',
        formArray.length,
      )

      // Sort by sort_order in ascending order (oldest to newest)
      const sortedFormArray = [...formArray].sort((a, b) => {
        const orderA = typeof a.sort_order === 'number' ? a.sort_order : 0
        const orderB = typeof b.sort_order === 'number' ? b.sort_order : 0
        return orderA - orderB // Ascending order
      })

      // Log the sort orders
      console.log(
        'Sort orders after sorting:',
        sortedFormArray.map((item) => item.sort_order),
      )

      // Take the 5 most recent matches (last 5 in the sorted array)
      const lastFiveMatches = sortedFormArray.slice(Math.max(0, sortedFormArray.length - 5))

      // Extract form values
      const recentForm = lastFiveMatches.map((entry) => entry.form?.toUpperCase() || '-')

      console.log('Extracted form values from data array in chronological order:', recentForm)
      return recentForm.join('')
    }

    // Handle other array formats as before - assume newest entries are first in array
    console.log('Processing formArray as generic array, assuming newest entries are first')

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
    const formString = formValues.reverse().join('')
    console.log('Generated form string from generic array:', formString)
    return formString
  }

  // If we couldn't find any form data
  console.log('Could not extract form data from the provided input')
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
  console.log('transformTeamTable called with:', {
    hasStandings: !!rawTeam.standings,
    standingsType: rawTeam.standings ? typeof rawTeam.standings : 'N/A',
    standingsKeyCount: rawTeam.standings ? Object.keys(rawTeam.standings).length : 0,
  })

  const transformedStandings: TeamTableResponse = {}

  if (
    rawTeam.standings &&
    typeof rawTeam.standings === 'object' &&
    Object.keys(rawTeam.standings).length > 0
  ) {
    console.log('Processing standings data with seasons:', Object.keys(rawTeam.standings))

    Object.entries(rawTeam.standings).forEach(([seasonId, standingsData]) => {
      console.log(`Processing season ${seasonId}:`, {
        type: typeof standingsData,
        isArray: Array.isArray(standingsData),
        keys:
          typeof standingsData === 'object' && !Array.isArray(standingsData)
            ? Object.keys(standingsData)
            : 'N/A',
      })

      try {
        // Try the array processing path
        if (Array.isArray(standingsData) && standingsData.length > 0) {
          console.log(`Season ${seasonId} has array data with ${standingsData.length} items`)

          // Filter for valid standing items
          const validItems = standingsData.filter((item) => {
            return (
              item &&
              typeof item === 'object' &&
              (typeof item.participant_id === 'number' || typeof item.team_id === 'number')
            )
          })

          if (validItems.length > 0) {
            console.log(`Found ${validItems.length} valid standings items for season ${seasonId}`)

            // Create a simplified standings table structure
            const standingRows = validItems.map((row) => {
              // Log if participant_id is missing
              if (!row.participant_id) {
                console.log('Row missing participant_id:', row)
              }

              // Use the participant data for team information when available
              const participant = row.participant || {}

              // Format form data (if available) into WDLWL format
              const formattedForm = formatTeamForm(row.form)
              if (formattedForm) {
                console.log(`Team ${row.participant_id} processed form:`, formattedForm)
              }

              // Extract and process details
              const detailValues = extractStandingDetails(row.details)

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
                  typeof row.goals_against === 'number'
                    ? row.goals_against
                    : detailValues.goals_against,
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
                  typeof row.clean_sheets === 'number'
                    ? row.clean_sheets
                    : detailValues.clean_sheets,
                failed_to_score:
                  typeof row.failed_to_score === 'number'
                    ? row.failed_to_score
                    : detailValues.failed_to_score,
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
        }
        // Try the original expected structure
        else {
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

                    // Use participant data for enhanced team information
                    const participant = row.participant || {}

                    // Format form data (if available) into WDLWL format
                    const formattedForm = formatTeamForm(row.form)
                    if (formattedForm) {
                      console.log(`Team ${row.participant_id} processed form:`, formattedForm)
                    }

                    // Extract and process details
                    const detailValues = extractStandingDetails(row.details)

                    // Get raw values from the row, then fall back to calculated values from details
                    return {
                      position: typeof row.position === 'number' ? row.position : 0,
                      team_id: typeof row.participant_id === 'number' ? row.participant_id : 0,
                      team_name: row.team_name || participant?.name || `Team ${row.participant_id}`,
                      team_logo_path: participant?.image_path || null,
                      points: typeof row.points === 'number' ? row.points : 0,
                      played:
                        typeof row.played === 'number'
                          ? row.played
                          : detailValues.played > 0
                            ? detailValues.played
                            : detailValues.won + detailValues.draw + detailValues.lost,
                      won: typeof row.won === 'number' ? row.won : detailValues.won,
                      draw: typeof row.draw === 'number' ? row.draw : detailValues.draw,
                      lost: typeof row.lost === 'number' ? row.lost : detailValues.lost,
                      goals_for:
                        typeof row.goals_for === 'number' ? row.goals_for : detailValues.goals_for,
                      goals_against:
                        typeof row.goals_against === 'number'
                          ? row.goals_against
                          : detailValues.goals_against,
                      goal_difference:
                        typeof row.goal_difference === 'number'
                          ? row.goal_difference
                          : detailValues.goals_for - detailValues.goals_against,
                      form: formattedForm,
                      current_streak:
                        typeof row.current_streak === 'string' ? row.current_streak : undefined,
                      clean_sheets:
                        typeof row.clean_sheets === 'number'
                          ? row.clean_sheets
                          : detailValues.clean_sheets,
                      failed_to_score:
                        typeof row.failed_to_score === 'number'
                          ? row.failed_to_score
                          : detailValues.failed_to_score,
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
    console.log(`Processing ${details.length} detail items`)

    // First, extract all values into a map for easier lookup
    const detailsMap = new Map<number, number>()
    const detailsNameMap = new Map<string, number>()
    const allTypeIds: number[] = []

    // Debug: log all detail items and collect all type IDs
    details.forEach((detail: any) => {
      if (typeof detail.value === 'number' && detail.type_id) {
        const value = detail.value
        const typeId = detail.type_id
        const typeName = detail.type?.name || 'Unknown'

        console.log(`Detail: ID=${typeId}, Name="${typeName}", Value=${value}`)

        detailsMap.set(typeId, value)
        allTypeIds.push(typeId)
        if (detail.type?.name) {
          detailsNameMap.set(typeName.toLowerCase(), value)
        }
      }
    })

    // Log all found type IDs for debugging
    console.log('All type IDs found:', allTypeIds)

    // Process by both ID and name pattern for maximum coverage

    // 1. Process by ID first (more reliable)

    // Matches played - priority for overall
    if (detailsMap.has(STANDING_DETAIL_TYPES.OVERALL_MATCHES_PLAYED)) {
      played = detailsMap.get(STANDING_DETAIL_TYPES.OVERALL_MATCHES_PLAYED) || 0
    } else if (
      detailsMap.has(STANDING_DETAIL_TYPES.HOME_MATCHES_PLAYED) &&
      detailsMap.has(STANDING_DETAIL_TYPES.AWAY_MATCHES_PLAYED)
    ) {
      // If we have both home and away, sum them
      const homePlayed = detailsMap.get(STANDING_DETAIL_TYPES.HOME_MATCHES_PLAYED) || 0
      const awayPlayed = detailsMap.get(STANDING_DETAIL_TYPES.AWAY_MATCHES_PLAYED) || 0
      played = homePlayed + awayPlayed
    }

    // Wins - Check both standard and alternative IDs
    if (detailsMap.has(STANDING_DETAIL_TYPES.OVERALL_WON)) {
      won = detailsMap.get(STANDING_DETAIL_TYPES.OVERALL_WON) || 0
      console.log('Found won using standard ID:', won)
    } else if (detailsMap.has(STANDING_DETAIL_TYPES.ALT_OVERALL_WON)) {
      won = detailsMap.get(STANDING_DETAIL_TYPES.ALT_OVERALL_WON) || 0
      console.log('Found won using alternative ID:', won)
    } else if (
      detailsMap.has(STANDING_DETAIL_TYPES.HOME_WON) &&
      detailsMap.has(STANDING_DETAIL_TYPES.AWAY_WON)
    ) {
      const homeWon = detailsMap.get(STANDING_DETAIL_TYPES.HOME_WON) || 0
      const awayWon = detailsMap.get(STANDING_DETAIL_TYPES.AWAY_WON) || 0
      won = homeWon + awayWon
      console.log('Calculated won from home + away:', won)
    } else if (
      detailsMap.has(STANDING_DETAIL_TYPES.ALT_HOME_WON) &&
      detailsMap.has(STANDING_DETAIL_TYPES.ALT_AWAY_WON)
    ) {
      const homeWon = detailsMap.get(STANDING_DETAIL_TYPES.ALT_HOME_WON) || 0
      const awayWon = detailsMap.get(STANDING_DETAIL_TYPES.ALT_AWAY_WON) || 0
      won = homeWon + awayWon
      console.log('Calculated won from alternative home + away:', won)
    }

    // Draws - Check both standard and alternative IDs
    if (detailsMap.has(STANDING_DETAIL_TYPES.OVERALL_DRAW)) {
      draw = detailsMap.get(STANDING_DETAIL_TYPES.OVERALL_DRAW) || 0
      console.log('Found draw using standard ID:', draw)
    } else if (detailsMap.has(STANDING_DETAIL_TYPES.ALT_OVERALL_DRAW)) {
      draw = detailsMap.get(STANDING_DETAIL_TYPES.ALT_OVERALL_DRAW) || 0
      console.log('Found draw using alternative ID:', draw)
    } else if (
      detailsMap.has(STANDING_DETAIL_TYPES.HOME_DRAW) &&
      detailsMap.has(STANDING_DETAIL_TYPES.AWAY_DRAW)
    ) {
      const homeDraw = detailsMap.get(STANDING_DETAIL_TYPES.HOME_DRAW) || 0
      const awayDraw = detailsMap.get(STANDING_DETAIL_TYPES.AWAY_DRAW) || 0
      draw = homeDraw + awayDraw
      console.log('Calculated draw from home + away:', draw)
    } else if (
      detailsMap.has(STANDING_DETAIL_TYPES.ALT_HOME_DRAW) &&
      detailsMap.has(STANDING_DETAIL_TYPES.ALT_AWAY_DRAW)
    ) {
      const homeDraw = detailsMap.get(STANDING_DETAIL_TYPES.ALT_HOME_DRAW) || 0
      const awayDraw = detailsMap.get(STANDING_DETAIL_TYPES.ALT_AWAY_DRAW) || 0
      draw = homeDraw + awayDraw
      console.log('Calculated draw from alternative home + away:', draw)
    }

    // Losses - Check both standard and alternative IDs
    if (detailsMap.has(STANDING_DETAIL_TYPES.OVERALL_LOST)) {
      lost = detailsMap.get(STANDING_DETAIL_TYPES.OVERALL_LOST) || 0
      console.log('Found lost using standard ID:', lost)
    } else if (detailsMap.has(STANDING_DETAIL_TYPES.ALT_OVERALL_LOST)) {
      lost = detailsMap.get(STANDING_DETAIL_TYPES.ALT_OVERALL_LOST) || 0
      console.log('Found lost using alternative ID:', lost)
    } else if (
      detailsMap.has(STANDING_DETAIL_TYPES.HOME_LOST) &&
      detailsMap.has(STANDING_DETAIL_TYPES.AWAY_LOST)
    ) {
      const homeLost = detailsMap.get(STANDING_DETAIL_TYPES.HOME_LOST) || 0
      const awayLost = detailsMap.get(STANDING_DETAIL_TYPES.AWAY_LOST) || 0
      lost = homeLost + awayLost
      console.log('Calculated lost from home + away:', lost)
    } else if (
      detailsMap.has(STANDING_DETAIL_TYPES.ALT_HOME_LOST) &&
      detailsMap.has(STANDING_DETAIL_TYPES.ALT_AWAY_LOST)
    ) {
      const homeLost = detailsMap.get(STANDING_DETAIL_TYPES.ALT_HOME_LOST) || 0
      const awayLost = detailsMap.get(STANDING_DETAIL_TYPES.ALT_AWAY_LOST) || 0
      lost = homeLost + awayLost
      console.log('Calculated lost from alternative home + away:', lost)
    }

    // Look for wins/draws/losses in name-based details if still not found
    if (won === 0 || draw === 0 || lost === 0) {
      // Try finding by text pattern matching if ID matching failed
      details.forEach((detail: any) => {
        if (typeof detail.value !== 'number' || !detail.type?.name) {
          return
        }

        const value = detail.value
        const typeName = detail.type.name.toLowerCase()

        // Check for wins
        if (won === 0 && matchesDetailPattern(typeName, STANDING_DETAIL_NAME_PATTERNS.WON)) {
          won = value
          console.log('Found won using name pattern match:', typeName, value)
        }

        // Check for draws
        if (draw === 0 && matchesDetailPattern(typeName, STANDING_DETAIL_NAME_PATTERNS.DRAW)) {
          draw = value
          console.log('Found draw using name pattern match:', typeName, value)
        }

        // Check for losses
        if (lost === 0 && matchesDetailPattern(typeName, STANDING_DETAIL_NAME_PATTERNS.LOST)) {
          lost = value
          console.log('Found lost using name pattern match:', typeName, value)
        }
      })
    }

    // Goals for - priority for overall
    if (detailsMap.has(STANDING_DETAIL_TYPES.OVERALL_GOALS_FOR)) {
      goals_for = detailsMap.get(STANDING_DETAIL_TYPES.OVERALL_GOALS_FOR) || 0
      console.log('Found goals_for using ID:', goals_for)
    } else if (
      detailsMap.has(STANDING_DETAIL_TYPES.HOME_GOALS_FOR) &&
      detailsMap.has(STANDING_DETAIL_TYPES.AWAY_GOALS_FOR)
    ) {
      // If we have both home and away, sum them
      const homeGoalsFor = detailsMap.get(STANDING_DETAIL_TYPES.HOME_GOALS_FOR) || 0
      const awayGoalsFor = detailsMap.get(STANDING_DETAIL_TYPES.AWAY_GOALS_FOR) || 0
      goals_for = homeGoalsFor + awayGoalsFor
      console.log('Calculated goals_for from home + away:', goals_for)
    }

    // Goals against - priority for overall
    if (detailsMap.has(STANDING_DETAIL_TYPES.OVERALL_GOALS_AGAINST)) {
      goals_against = detailsMap.get(STANDING_DETAIL_TYPES.OVERALL_GOALS_AGAINST) || 0
      console.log('Found goals_against using ID:', goals_against)
    } else if (
      detailsMap.has(STANDING_DETAIL_TYPES.HOME_GOALS_AGAINST) &&
      detailsMap.has(STANDING_DETAIL_TYPES.AWAY_GOALS_AGAINST)
    ) {
      // If we have both home and away, sum them
      const homeGoalsAgainst = detailsMap.get(STANDING_DETAIL_TYPES.HOME_GOALS_AGAINST) || 0
      const awayGoalsAgainst = detailsMap.get(STANDING_DETAIL_TYPES.AWAY_GOALS_AGAINST) || 0
      goals_against = homeGoalsAgainst + awayGoalsAgainst
      console.log('Calculated goals_against from home + away:', goals_against)
    }

    // If no direct detail values found for w/d/l, use played and points to infer
    if (played > 0 && (won === 0 || draw === 0 || lost === 0)) {
      // If we found played, but not wins, draws or losses, let's try a different approach
      // Look for a value with a name like "Wins" or "Won"
      console.log('Attempting to infer missing W/D/L values...')

      // For each detail, check for naming patterns
      for (const detail of details) {
        if (typeof detail.value !== 'number' || !detail.type?.name) continue

        const typeName = detail.type.name.toLowerCase()
        const value = detail.value

        if (won === 0 && /\b(win|won|victory)\b/.test(typeName)) {
          won = value
          console.log('Inferred won value from name match:', typeName, value)
        } else if (draw === 0 && /\b(draw|drawn|tie|tied)\b/.test(typeName)) {
          draw = value
          console.log('Inferred draw value from name match:', typeName, value)
        } else if (lost === 0 && /\b(lost|loss|losses|defeat)\b/.test(typeName)) {
          lost = value
          console.log('Inferred lost value from name match:', typeName, value)
        }
      }

      // If we still couldn't find all values, calculate the missing one
      if (played > 0) {
        if (won > 0 && draw > 0 && lost === 0) {
          lost = played - won - draw
          console.log('Calculated lost from played - won - draw:', lost)
        } else if (won > 0 && lost > 0 && draw === 0) {
          draw = played - won - lost
          console.log('Calculated draw from played - won - lost:', draw)
        } else if (draw > 0 && lost > 0 && won === 0) {
          won = played - draw - lost
          console.log('Calculated won from played - draw - lost:', won)
        }
      }
    }

    // Clean sheets - priority for overall
    if (detailsMap.has(STANDING_DETAIL_TYPES.OVERALL_CLEAN_SHEETS)) {
      clean_sheets = detailsMap.get(STANDING_DETAIL_TYPES.OVERALL_CLEAN_SHEETS)
    } else if (
      detailsMap.has(STANDING_DETAIL_TYPES.HOME_CLEAN_SHEETS) &&
      detailsMap.has(STANDING_DETAIL_TYPES.AWAY_CLEAN_SHEETS)
    ) {
      // If we have both home and away, sum them
      const homeCleanSheets = detailsMap.get(STANDING_DETAIL_TYPES.HOME_CLEAN_SHEETS) || 0
      const awayCleanSheets = detailsMap.get(STANDING_DETAIL_TYPES.AWAY_CLEAN_SHEETS) || 0
      clean_sheets = homeCleanSheets + awayCleanSheets
    } else {
      // Try finding by name
      details.forEach((detail: any) => {
        if (typeof detail.value !== 'number' || !detail.type?.name) return

        const typeName = detail.type.name.toLowerCase()
        if (
          clean_sheets === undefined &&
          matchesDetailPattern(typeName, STANDING_DETAIL_NAME_PATTERNS.CLEAN_SHEETS)
        ) {
          clean_sheets = detail.value
        }
      })
    }

    // Failed to score - priority for overall
    if (detailsMap.has(STANDING_DETAIL_TYPES.OVERALL_FAILED_TO_SCORE)) {
      failed_to_score = detailsMap.get(STANDING_DETAIL_TYPES.OVERALL_FAILED_TO_SCORE)
    } else if (
      detailsMap.has(STANDING_DETAIL_TYPES.HOME_FAILED_TO_SCORE) &&
      detailsMap.has(STANDING_DETAIL_TYPES.AWAY_FAILED_TO_SCORE)
    ) {
      // If we have both home and away, sum them
      const homeFailedToScore = detailsMap.get(STANDING_DETAIL_TYPES.HOME_FAILED_TO_SCORE) || 0
      const awayFailedToScore = detailsMap.get(STANDING_DETAIL_TYPES.AWAY_FAILED_TO_SCORE) || 0
      failed_to_score = homeFailedToScore + awayFailedToScore
    } else {
      // Try finding by name
      details.forEach((detail: any) => {
        if (typeof detail.value !== 'number' || !detail.type?.name) return

        const typeName = detail.type.name.toLowerCase()
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
      console.log('Calculated played from won + draw + lost:', played)
    }

    // Log the final values we'll use
    console.log('Final calculated standing values:', {
      played,
      won,
      draw,
      lost,
      goals_for,
      goals_against,
      clean_sheets,
      failed_to_score,
    })
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
