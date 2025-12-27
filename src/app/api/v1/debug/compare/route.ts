import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { createSportmonksClient } from '@/services/sportmonks/client'
import { SPORTMONKS_FOOTBALL_BASE_URL } from '@/constants/api'

type EntityType = 'fixtures' | 'teams' | 'players' | 'standings' | 'playerstats'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const entity = (searchParams.get('entity') as EntityType) || 'fixtures'
    const debug = searchParams.get('debug') === 'true'

    if (!teamId) {
      return NextResponse.json(
        {
          error: 'Missing required parameter: teamId',
          hint: 'Usage: /api/v1/debug/compare?teamId=147671&entity=fixtures',
          supportedEntities: ['fixtures', 'teams', 'players', 'standings', 'playerstats'],
        },
        { status: 400 },
      )
    }

    const numericTeamId = parseInt(teamId, 10)
    if (isNaN(numericTeamId)) {
      return NextResponse.json({ error: 'Invalid team ID format' }, { status: 400 })
    }

    // Initialize clients
    const payload = await getPayload({ config })
    const sportmonksClient = createSportmonksClient({
      apiKey: process.env.SPORTMONKS_API_KEY || '',
      baseUrl: process.env.SPORTMONKS_BASE_URL || SPORTMONKS_FOOTBALL_BASE_URL,
    })

    // Route to appropriate comparison handler
    switch (entity) {
      case 'fixtures':
        return await compareFixtures(numericTeamId, payload, sportmonksClient)
      case 'teams':
        return await compareTeams(numericTeamId, payload, sportmonksClient)
      case 'players':
        return await comparePlayers(numericTeamId, payload, sportmonksClient)
      case 'standings':
        return await compareStandings(numericTeamId, payload, sportmonksClient, debug)
      case 'playerstats':
        return await comparePlayerStats(numericTeamId, payload, sportmonksClient, debug)
      default:
        return NextResponse.json(
          {
            error: `Unsupported entity type: ${entity}`,
            supportedEntities: ['fixtures', 'teams', 'players', 'standings', 'playerstats'],
          },
          { status: 400 },
        )
    }
  } catch (error) {
    console.error('Error in compare debug endpoint:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function compareFixtures(teamId: number, payload: any, sportmonksClient: any) {
  // Fetch local fixtures
  let team
  try {
    team = await payload.findByID({
      collection: 'teams',
      id: teamId.toString(),
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Not Found')) {
      return NextResponse.json(
        { error: `Team ${teamId} not found in local database` },
        { status: 404 },
      )
    }
    throw error
  }

  if (!team) {
    return NextResponse.json(
      { error: `Team ${teamId} not found in local database` },
      { status: 404 },
    )
  }

  const localUpcoming = Array.isArray(team.upcoming) ? team.upcoming : []
  const localLatest = Array.isArray(team.latest) ? team.latest : []
  const localFixtureIds = new Set([
    ...localUpcoming.map((f: any) => f.id),
    ...localLatest.map((f: any) => f.id),
  ])

  // Fetch Sportmonks team with fixtures (using latest and upcoming includes)
  try {
    const sportmonksResponse = await sportmonksClient.fetchFromApi(`/teams/${teamId}`, {
      include: 'latest;upcoming',
    })

    const sportmonksTeam = sportmonksResponse.data
    const sportmonksLatest = Array.isArray(sportmonksTeam?.latest) ? sportmonksTeam.latest : []
    const sportmonksUpcoming = Array.isArray(sportmonksTeam?.upcoming)
      ? sportmonksTeam.upcoming
      : []
    const sportmonksFixtures = [...sportmonksLatest, ...sportmonksUpcoming]
    const sportmonksFixtureIds = new Set(sportmonksFixtures.map((f: any) => f.id))

    // Find differences
    const missingInLocal = sportmonksFixtures
      .filter((f: any) => !localFixtureIds.has(f.id))
      .map((f: any) => ({
        id: f.id,
        starting_at: f.starting_at,
        state: f.state?.short_name || 'unknown',
        home_team: f.participants?.find((p: any) => p.meta?.location === 'home')?.name || 'Unknown',
        away_team: f.participants?.find((p: any) => p.meta?.location === 'away')?.name || 'Unknown',
        league: f.league?.name || 'Unknown',
      }))

    const missingInSportmonks = Array.from(localFixtureIds).filter(
      (id) => !sportmonksFixtureIds.has(id),
    )

    // Generate sync recommendations
    const syncRecommendations = []
    if (missingInLocal.length > 0) {
      syncRecommendations.push({
        job: 'syncMatches',
        reason: `${missingInLocal.length} fixture(s) missing in local database`,
        command: 'GET /api/queue-jobs/sync (includes syncMatches)',
        sample: missingInLocal.slice(0, 3),
      })
    }

    return NextResponse.json({
      teamId,
      teamName: team.name,
      entity: 'fixtures',
      comparison: {
        local: {
          total: localFixtureIds.size,
          upcoming: localUpcoming.length,
          latest: localLatest.length,
          fixtureIds: Array.from(localFixtureIds)
            .sort((a, b) => b - a)
            .slice(0, 20),
        },
        sportmonks: {
          total: sportmonksFixtures.length,
          upcoming: sportmonksUpcoming.length,
          latest: sportmonksLatest.length,
          fixtureIds: Array.from(sportmonksFixtureIds)
            .sort((a, b) => b - a)
            .slice(0, 20),
        },
        discrepancies: {
          missingInLocal: {
            count: missingInLocal.length,
            fixtures: missingInLocal.slice(0, 10), // Show first 10
          },
          missingInSportmonks: {
            count: missingInSportmonks.length,
            fixtureIds: missingInSportmonks.slice(0, 10),
          },
          totalDifference: Math.abs(localFixtureIds.size - sportmonksFixtures.length),
        },
      },
      syncRecommendations: syncRecommendations.length > 0 ? syncRecommendations : undefined,
      analysis: {
        syncNeeded: missingInLocal.length > 0 || missingInSportmonks.length > 0,
        recommendation:
          missingInLocal.length > 0
            ? `Run syncMatches to add ${missingInLocal.length} missing fixtures`
            : 'Local data appears up to date',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch from Sportmonks API',
        details: error instanceof Error ? error.message : 'Unknown error',
        localData: {
          total: localFixtureIds.size,
          upcoming: localUpcoming.length,
          latest: localLatest.length,
        },
      },
      { status: 500 },
    )
  }
}

async function compareTeams(teamId: number, payload: any, sportmonksClient: any) {
  // Fetch local team
  let localTeam
  try {
    localTeam = await payload.findByID({
      collection: 'teams',
      id: teamId.toString(),
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Not Found')) {
      return NextResponse.json(
        { error: `Team ${teamId} not found in local database` },
        { status: 404 },
      )
    }
    throw error
  }

  if (!localTeam) {
    return NextResponse.json(
      { error: `Team ${teamId} not found in local database` },
      { status: 404 },
    )
  }

  // Fetch from Sportmonks
  try {
    const sportmonksResponse = await sportmonksClient.fetchFromApi(`/teams/${teamId}`, {
      include: 'country;sport;venue;coaches;activeseasons',
    })

    const sportmonksTeam = sportmonksResponse.data

    return NextResponse.json({
      teamId,
      entity: 'teams',
      comparison: {
        local: {
          name: localTeam.name,
          country: localTeam.country,
          founded: localTeam.founded,
          playersCount: Array.isArray(localTeam.players) ? localTeam.players.length : 0,
          coachesCount: Array.isArray(localTeam.coaches) ? localTeam.coaches.length : 0,
          updatedAt: localTeam.updatedAt,
        },
        sportmonks: {
          name: sportmonksTeam.name,
          country: sportmonksTeam.country?.name,
          founded: sportmonksTeam.founded,
          coachesCount: Array.isArray(sportmonksTeam.coaches) ? sportmonksTeam.coaches.length : 0,
        },
        discrepancies: {
          nameMismatch: localTeam.name !== sportmonksTeam.name,
          foundedMismatch: localTeam.founded !== sportmonksTeam.founded,
        },
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch from Sportmonks API',
        details: error instanceof Error ? error.message : 'Unknown error',
        localData: {
          name: localTeam.name,
          country: localTeam.country,
          founded: localTeam.founded,
        },
      },
      { status: 500 },
    )
  }
}

async function comparePlayers(teamId: number, payload: any, sportmonksClient: any) {
  // Fetch local team with players
  let team
  try {
    team = await payload.findByID({
      collection: 'teams',
      id: teamId.toString(),
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Not Found')) {
      return NextResponse.json(
        { error: `Team ${teamId} not found in local database` },
        { status: 404 },
      )
    }
    throw error
  }

  if (!team) {
    return NextResponse.json(
      { error: `Team ${teamId} not found in local database` },
      { status: 404 },
    )
  }

  const localPlayerIds = new Set<number>()
  if (Array.isArray(team.players)) {
    team.players.forEach((p: any) => {
      const playerId = p.player_id || p.id
      if (playerId) localPlayerIds.add(playerId)
    })
  }

  // Fetch from Sportmonks
  try {
    const sportmonksResponse = await sportmonksClient.fetchFromApi(`/teams/${teamId}`, {
      include: 'players',
    })

    const sportmonksPlayers = sportmonksResponse.data?.players || []
    const sportmonksPlayerIds = new Set<number>(sportmonksPlayers.map((p: any) => p.player_id))

    const missingInLocal = Array.from(sportmonksPlayerIds).filter((id) => !localPlayerIds.has(id))
    const missingInSportmonks = Array.from(localPlayerIds).filter(
      (id) => !sportmonksPlayerIds.has(id),
    )

    // Generate sync recommendations
    const syncRecommendations = []
    if (missingInLocal.length > 0) {
      syncRecommendations.push({
        job: 'syncPlayers',
        reason: `${missingInLocal.length} player(s) missing in local database`,
        command: 'GET /api/queue-jobs/sync (includes syncPlayers)',
        missingPlayerIds: missingInLocal.slice(0, 10),
      })
    }

    return NextResponse.json({
      teamId,
      teamName: team.name,
      entity: 'players',
      comparison: {
        local: {
          total: localPlayerIds.size,
          playerIds: Array.from(localPlayerIds).slice(0, 20),
        },
        sportmonks: {
          total: sportmonksPlayers.length,
          playerIds: Array.from(sportmonksPlayerIds).slice(0, 20),
        },
        discrepancies: {
          missingInLocal: {
            count: missingInLocal.length,
            playerIds: missingInLocal.slice(0, 10),
          },
          missingInSportmonks: {
            count: missingInSportmonks.length,
            playerIds: missingInSportmonks.slice(0, 10),
          },
          totalDifference: Math.abs(localPlayerIds.size - sportmonksPlayers.length),
        },
      },
      syncRecommendations: syncRecommendations.length > 0 ? syncRecommendations : undefined,
      analysis: {
        syncNeeded: missingInLocal.length > 0,
        recommendation:
          missingInLocal.length > 0
            ? `Run syncPlayers to add ${missingInLocal.length} missing players`
            : 'Local player data appears up to date',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch from Sportmonks API',
        details: error instanceof Error ? error.message : 'Unknown error',
        localData: {
          total: localPlayerIds.size,
        },
      },
      { status: 500 },
    )
  }
}

async function compareStandings(
  teamId: number,
  payload: any,
  sportmonksClient: any,
  debug = false,
) {
  // Get team to find its active seasons and standings
  let team
  try {
    team = await payload.findByID({
      collection: 'teams',
      id: teamId.toString(),
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Not Found')) {
      return NextResponse.json(
        { error: `Team ${teamId} not found in local database` },
        { status: 404 },
      )
    }
    throw error
  }

  if (!team) {
    return NextResponse.json(
      { error: `Team ${teamId} not found in local database` },
      { status: 404 },
    )
  }

  // Get active seasons from team
  const activeSeasons = Array.isArray(team.activeseasons) ? team.activeseasons : []

  if (activeSeasons.length === 0) {
    return NextResponse.json({
      teamId,
      teamName: team.name,
      entity: 'standings',
      message: 'No active seasons found for this team',
      hint: 'Team may not be currently active in any leagues',
    })
  }

  // Get league IDs from active seasons
  const leagueIds: number[] = []
  activeSeasons.forEach((season: any) => {
    const leagueId = season.league_id || season.league?.id
    if (leagueId && !leagueIds.includes(leagueId)) {
      leagueIds.push(leagueId)
    }
  })

  // Fetch local standings from leaguesstandings collection
  const localLeagueStandings = await payload.find({
    collection: 'leaguesstandings',
    where: {
      leagueId: { in: leagueIds },
    },
  })

  // Build a map of season ID -> local standings data
  const localStandingsBySeasonId: Record<number, any> = {}
  localLeagueStandings.docs.forEach((doc: any) => {
    if (doc.standings && typeof doc.standings === 'object') {
      Object.entries(doc.standings).forEach(([seasonId, seasonData]) => {
        localStandingsBySeasonId[parseInt(seasonId, 10)] = seasonData
      })
    }
  })

  // Fetch standings from Sportmonks for active seasons
  const standingsComparison = []

  for (const season of activeSeasons) {
    const seasonId = season.id

    try {
      // Fetch from Sportmonks
      const sportmonksStandings = await sportmonksClient.fetchFromApi(
        `/standings/seasons/${seasonId}`,
        { include: 'participant;details' },
      )

      const sportmonksData = sportmonksStandings.data || []
      const localData = localStandingsBySeasonId[seasonId] || []

      // Find the team's position in standings
      const findTeamPosition = (standings: any[], debug = false) => {
        if (debug) {
          console.log(
            `[DEBUG] Searching for team ${teamId} in standings with ${standings?.length || 0} entries`,
          )
          if (standings?.length > 0) {
            console.log(`[DEBUG] First entry participant_id:`, standings[0].participant_id)
          }
        }

        // The standings array contains objects where each object IS a team's standing
        // participant_id, position, points are at the top level
        const teamStanding = standings.find(
          (standing: any) =>
            standing.participant?.id === teamId || standing.participant_id === teamId,
        )

        if (teamStanding) {
          // Extract stats from the details array
          const getDetailValue = (typeId: number) => {
            const detail = teamStanding.details?.find((d: any) => d.type_id === typeId)
            return detail?.value
          }

          return {
            position: teamStanding.position,
            points: teamStanding.points,
            played: getDetailValue(129) || 0, // games played
            wins: getDetailValue(130) || 0, // wins
            draws: getDetailValue(131) || 0, // draws
            losses: getDetailValue(132) || 0, // losses
          }
        }

        return null
      }

      const sportmonksTeamData = findTeamPosition(sportmonksData, debug)
      const localTeamData = findTeamPosition(
        Array.isArray(localData) ? localData : [localData],
        debug,
      )

      // Check if standings data is actually populated
      const hasRealData = sportmonksData.some(
        (standing: any) => standing.position !== null && standing.position !== undefined,
      )

      const comparisonEntry: any = {
        seasonId,
        seasonName: season.name || `Season ${seasonId}`,
        leagueName: season.league?.name || 'Unknown League',
        local: {
          hasData: !!localTeamData,
          teamPosition: localTeamData,
          totalEntries: Array.isArray(localData) ? localData.length : 0,
        },
        sportmonks: {
          hasData: !!sportmonksTeamData,
          teamPosition: sportmonksTeamData,
          totalEntries: sportmonksData.length,
        },
        match: JSON.stringify(localTeamData) === JSON.stringify(sportmonksTeamData),
        note:
          !hasRealData && sportmonksData.length > 0
            ? 'Season structure exists but standings not yet populated (season may not have started)'
            : undefined,
      }

      // Add debug info if requested
      if (debug) {
        // Show raw structure to understand data format
        const sportmonksFirstGroup = sportmonksData[0]
        const localFirstGroup = Array.isArray(localData) ? localData[0] : null

        comparisonEntry.debug = {
          sportmonksGroupsCount: sportmonksData.length,
          localGroupsCount: Array.isArray(localData) ? localData.length : 0,
          sportmonksRawStructure: sportmonksFirstGroup
            ? {
                keys: Object.keys(sportmonksFirstGroup),
                hasDetails: !!sportmonksFirstGroup.details,
                detailsLength: sportmonksFirstGroup.details?.length,
                firstDetail: sportmonksFirstGroup.details?.[0],
              }
            : null,
          localRawStructure: localFirstGroup
            ? {
                keys: Object.keys(localFirstGroup),
                hasDetails: !!localFirstGroup.details,
                detailsLength: localFirstGroup.details?.length,
                firstDetail: localFirstGroup.details?.[0],
              }
            : null,
          sportmonksFirstEntriesSample: sportmonksData.slice(0, 3).map((s: any) => ({
            participant_id: s.participant_id,
            position: s.position,
            points: s.points,
          })),
          localFirstEntriesSample: Array.isArray(localData)
            ? localData.slice(0, 3).map((s: any) => ({
                participant_id: s.participant_id,
                position: s.position,
                points: s.points,
              }))
            : null,
        }
      }

      standingsComparison.push(comparisonEntry)
    } catch (error) {
      standingsComparison.push({
        seasonId,
        seasonName: season.name || `Season ${seasonId}`,
        error: error instanceof Error ? error.message : 'Failed to fetch standings',
        local: { hasData: !!localStandingsBySeasonId[seasonId] },
        sportmonks: { hasData: false },
      })
    }
  }

  const mismatches = standingsComparison.filter((s) => !s.match && !s.error)

  // Generate sync recommendations
  const syncRecommendations = []
  if (mismatches.length > 0) {
    syncRecommendations.push({
      job: 'syncTeams',
      reason: `${mismatches.length} season(s) have mismatched standings data`,
      command: 'GET /api/queue-jobs/sync (includes syncTeams)',
      note: 'Team sync updates standings from league data',
      affectedSeasons: mismatches.slice(0, 3).map((m) => ({
        seasonId: m.seasonId,
        seasonName: m.seasonName,
        leagueName: m.leagueName,
      })),
    })
  }

  return NextResponse.json({
    teamId,
    teamName: team.name,
    entity: 'standings',
    activeSeasons: activeSeasons.length,
    comparison: standingsComparison,
    summary: {
      totalSeasons: standingsComparison.length,
      matching: standingsComparison.filter((s) => s.match).length,
      mismatched: mismatches.length,
      errors: standingsComparison.filter((s) => s.error).length,
    },
    syncRecommendations: syncRecommendations.length > 0 ? syncRecommendations : undefined,
    analysis: {
      syncNeeded: mismatches.length > 0,
      recommendation:
        mismatches.length > 0
          ? `Run syncTeams to update ${mismatches.length} season(s) with mismatched standings`
          : 'Standings data appears up to date',
    },
  })
}

async function comparePlayerStats(
  teamId: number,
  payload: any,
  sportmonksClient: any,
  debug = false,
) {
  // Fetch local team with players and their statistics
  let team
  try {
    team = await payload.findByID({
      collection: 'teams',
      id: teamId.toString(),
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Not Found')) {
      return NextResponse.json(
        { error: `Team ${teamId} not found in local database` },
        { status: 404 },
      )
    }
    throw error
  }

  if (!team) {
    return NextResponse.json(
      { error: `Team ${teamId} not found in local database` },
      { status: 404 },
    )
  }

  const localPlayers = Array.isArray(team.players) ? team.players : []

  if (localPlayers.length === 0) {
    return NextResponse.json({
      teamId,
      teamName: team.name,
      entity: 'playerstats',
      message: 'No players found in local database',
      hint: 'Team may need player sync',
    })
  }

  // Get active season IDs to filter statistics
  const activeSeasons = Array.isArray(team.activeseasons) ? team.activeseasons : []
  const activeSeasonIds = new Set(activeSeasons.map((s: any) => s.id))

  // Build local player stats map
  const localPlayerStats: Record<number, any> = {}

  for (const player of localPlayers) {
    const playerId = player.player_id || player.id
    if (!playerId) continue

    // Fetch full player data with statistics
    try {
      const playerDoc = await payload.findByID({
        collection: 'players',
        id: playerId.toString(),
      })

      if (playerDoc && playerDoc.statistics) {
        // Filter to active seasons and aggregate stats
        const seasonStats = Array.isArray(playerDoc.statistics)
          ? playerDoc.statistics.filter((stat: any) => activeSeasonIds.has(stat.season_id))
          : []

        // Aggregate statistics across active seasons
        let totalGoals = 0
        let totalAssists = 0
        let totalAppearances = 0
        let totalMinutes = 0

        seasonStats.forEach((stat: any) => {
          if (stat.details && Array.isArray(stat.details)) {
            const getStatValue = (typeId: number) => {
              const detail = stat.details.find((d: any) => d.type_id === typeId)
              return detail?.value
            }

            // Type IDs from constants/metadataType.ts
            const goals = getStatValue(52) // GOALS type_id
            const assists = getStatValue(79) // ASSISTS type_id
            const appearances = getStatValue(321) // APPEARANCES type_id
            const minutes = getStatValue(119) // MINUTES_PLAYED type_id

            // Extract values - most stats are objects with total/value properties
            if (goals) {
              totalGoals += typeof goals === 'object' ? goals.total || 0 : goals
            }
            if (assists) {
              totalAssists += typeof assists === 'object' ? assists.total || assists : assists
            }
            if (appearances) {
              totalAppearances +=
                typeof appearances === 'object' ? appearances.total || 0 : appearances
            }
            if (minutes) {
              totalMinutes += typeof minutes === 'object' ? minutes.total || 0 : minutes
            }
          }
        })

        localPlayerStats[playerId] = {
          name: playerDoc.display_name || playerDoc.common_name || 'Unknown',
          goals: totalGoals,
          assists: totalAssists,
          appearances: totalAppearances,
          minutes: totalMinutes,
          seasons: seasonStats.length,
        }
      }
    } catch (error) {
      console.error(`Failed to fetch player ${playerId}:`, error)
    }
  }

  // Fetch from Sportmonks - since we can't efficiently get all player stats in one call,
  // we'll sample a few players with the most activity
  try {
    const sportmonksPlayerStats: Record<number, any> = {}

    // Get top players by goals to sample for comparison
    const topPlayers = Object.entries(localPlayerStats)
      .sort(([, a]: any, [, b]: any) => b.goals + b.assists - (a.goals + a.assists))
      .slice(0, 10)
      .map(([playerId]) => Number(playerId))

    // Fetch individual player stats from Sportmonks for comparison sample
    for (const playerId of topPlayers) {
      try {
        const playerResponse = await sportmonksClient.fetchFromApi(`/players/${playerId}`, {
          include: 'statistics.details',
        })

        const player = playerResponse.data
        if (!player) continue

        const seasonStats = Array.isArray(player.statistics)
          ? player.statistics.filter((stat: any) => activeSeasonIds.has(stat.season_id))
          : []

        let totalGoals = 0
        let totalAssists = 0
        let totalAppearances = 0
        let totalMinutes = 0

        seasonStats.forEach((stat: any) => {
          if (stat.details && Array.isArray(stat.details)) {
            const getStatValue = (typeId: number) => {
              const detail = stat.details.find((d: any) => d.type_id === typeId)
              return detail?.value
            }

            const goals = getStatValue(52)
            const assists = getStatValue(79)
            const appearances = getStatValue(321)
            const minutes = getStatValue(119)

            if (goals) {
              totalGoals += typeof goals === 'object' ? goals.total || 0 : goals
            }
            if (assists) {
              totalAssists += typeof assists === 'object' ? assists.total || assists : assists
            }
            if (appearances) {
              totalAppearances +=
                typeof appearances === 'object' ? appearances.total || 0 : appearances
            }
            if (minutes) {
              totalMinutes += typeof minutes === 'object' ? minutes.total || 0 : minutes
            }
          }
        })

        sportmonksPlayerStats[playerId] = {
          name: player.display_name || player.common_name || 'Unknown',
          goals: totalGoals,
          assists: totalAssists,
          appearances: totalAppearances,
          minutes: totalMinutes,
          seasons: seasonStats.length,
        }
      } catch (playerError) {
        console.error(`Failed to fetch player ${playerId} from Sportmonks:`, playerError)
      }
    }

    // Compare player statistics
    const allPlayerIds = new Set([
      ...Object.keys(localPlayerStats).map(Number),
      ...Object.keys(sportmonksPlayerStats).map(Number),
    ])

    const playerComparisons = []
    const discrepancies = []

    for (const playerId of Array.from(allPlayerIds)) {
      const local = localPlayerStats[playerId]
      const sportmonks = sportmonksPlayerStats[playerId]

      const comparison: any = {
        playerId,
        name: local?.name || sportmonks?.name || 'Unknown',
        local: local || { goals: 0, assists: 0, appearances: 0, minutes: 0, seasons: 0 },
        sportmonks: sportmonks || { goals: 0, assists: 0, appearances: 0, minutes: 0, seasons: 0 },
      }

      // Check for discrepancies
      const hasDiscrepancy =
        (local?.goals || 0) !== (sportmonks?.goals || 0) ||
        (local?.assists || 0) !== (sportmonks?.assists || 0) ||
        (local?.appearances || 0) !== (sportmonks?.appearances || 0) ||
        (local?.minutes || 0) !== (sportmonks?.minutes || 0)

      comparison.match = !hasDiscrepancy && !!local && !!sportmonks

      if (hasDiscrepancy || !local || !sportmonks) {
        comparison.differences = {
          goals: (local?.goals || 0) - (sportmonks?.goals || 0),
          assists: (local?.assists || 0) - (sportmonks?.assists || 0),
          appearances: (local?.appearances || 0) - (sportmonks?.appearances || 0),
          minutes: (local?.minutes || 0) - (sportmonks?.minutes || 0),
        }
        discrepancies.push(comparison)
      }

      playerComparisons.push(comparison)
    }

    // Generate sync recommendations
    const syncRecommendations = []
    if (discrepancies.length > 0) {
      const playersWithStatDiffs = discrepancies.filter(
        (d) =>
          d.differences &&
          (d.differences.goals !== 0 ||
            d.differences.assists !== 0 ||
            d.differences.appearances !== 0),
      )

      if (playersWithStatDiffs.length > 0) {
        syncRecommendations.push({
          job: 'syncPlayers',
          reason: `${playersWithStatDiffs.length} player(s) have outdated statistics`,
          command: 'POST /api/queue-jobs/sync with task=syncPlayers',
          affectedPlayers: playersWithStatDiffs.slice(0, 5).map((p) => ({
            id: p.playerId,
            name: p.name,
            differences: p.differences,
          })),
        })
      }
    }

    return NextResponse.json({
      teamId,
      teamName: team.name,
      entity: 'playerstats',
      note: 'Comparing top 10 players by goals+assists (full comparison would require many API calls)',
      activeSeasons: activeSeasons.map((s: any) => ({
        id: s.id,
        name: s.name,
      })),
      comparison: {
        totalLocalPlayers: Object.keys(localPlayerStats).length,
        playersCompared: Object.keys(sportmonksPlayerStats).length,
        matching: playerComparisons.filter((p) => p.match).length,
        withDiscrepancies: discrepancies.length,
      },
      discrepancies: discrepancies.length > 0 ? discrepancies : undefined,
      allComparedPlayers: debug ? playerComparisons.filter((p) => p.sportmonks) : undefined,
      localOnlyPlayers: debug
        ? playerComparisons
            .filter((p) => !p.sportmonks)
            .map((p) => ({
              playerId: p.playerId,
              name: p.name,
              stats: p.local,
            }))
        : undefined,
      syncRecommendations: syncRecommendations.length > 0 ? syncRecommendations : undefined,
      analysis: {
        syncNeeded: discrepancies.length > 0,
        recommendation:
          discrepancies.length > 0
            ? `${discrepancies.length} player(s) have mismatched statistics - run syncPlayers job to update`
            : `Top ${Object.keys(sportmonksPlayerStats).length} players' statistics match Sportmonks`,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch from Sportmonks API',
        details: error instanceof Error ? error.message : 'Unknown error',
        localData: {
          playersWithStats: Object.keys(localPlayerStats).length,
          sample: Object.values(localPlayerStats).slice(0, 3),
        },
      },
      { status: 500 },
    )
  }
}
