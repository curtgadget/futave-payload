import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { missingPlayersDebugger } from '@/utilities/debugMissingPlayers'
import { createMissingPlayersSync } from '@/services/sync/handlers/missingPlayers.sync'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const action = searchParams.get('action')

    // Check if debugging is enabled
    if (!missingPlayersDebugger.isDebuggingEnabled()) {
      return NextResponse.json(
        { 
          error: 'Missing players debugging is disabled. Set DEBUG_MISSING_PLAYERS=true to enable.',
          hint: 'Add DEBUG_MISSING_PLAYERS=true to your .env file'
        },
        { status: 403 }
      )
    }

    const payload = await getPayload({ config })

    // If action is 'analyze', perform a deep analysis
    if (action === 'analyze' && teamId) {
      const numericTeamId = parseInt(teamId, 10)
      
      // Get team data
      const team = await payload.findByID({
        collection: 'teams',
        id: teamId,
      })

      if (!team) {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 })
      }

      // Clear previous data for fresh analysis
      missingPlayersDebugger.clear()

      // Analyze squad players
      const squadPlayerIds = new Set<number>()
      if (team.players && Array.isArray(team.players)) {
        team.players.forEach((player: any) => {
          const playerId = player.player_id || player.id
          if (playerId) {
            squadPlayerIds.add(playerId)
          }
        })
      }

      // Get players from database
      const playersInDb = await payload.find({
        collection: 'players',
        where: {
          id: {
            in: Array.from(squadPlayerIds),
          },
        },
        pagination: false,
      })

      const foundPlayerIds = new Set(playersInDb.docs.map((p: any) => p.id))
      const missingPlayerIds = Array.from(squadPlayerIds).filter(id => !foundPlayerIds.has(id))

      // Log each missing player
      missingPlayerIds.forEach(playerId => {
        const squadPlayer: any = Array.isArray(team.players) ? team.players.find((p: any) =>
          (p.player_id || p.id) === playerId
        ) : undefined
        
        missingPlayersDebugger.logMissingPlayer({
          playerId,
          teamId: numericTeamId,
          teamName: team.name,
          jerseyNumber: squadPlayer?.jersey_number,
          positionId: squadPlayer?.position_id,
          context: 'squad',
          timestamp: new Date(),
          additionalInfo: {
            detailedPositionId: squadPlayer?.detailed_position_id,
            captain: squadPlayer?.captain,
          }
        })
      })

      return NextResponse.json({
        teamId: numericTeamId,
        teamName: team.name,
        totalSquadPlayers: squadPlayerIds.size,
        playersInDatabase: foundPlayerIds.size,
        missingPlayers: missingPlayerIds.length,
        missingPlayerIds,
        analysis: {
          percentageMissing: ((missingPlayerIds.length / squadPlayerIds.size) * 100).toFixed(1) + '%',
          summary: missingPlayersDebugger.getSummary(),
        }
      })
    }

    // If action is 'sync', sync missing players for a team
    if (action === 'sync' && teamId) {
      const numericTeamId = parseInt(teamId, 10)
      
      // Get team data
      const team = await payload.findByID({
        collection: 'teams',
        id: teamId,
      })

      if (!team) {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 })
      }

      // Get missing player IDs (similar to analyze)
      const squadPlayerIds = new Set<number>()
      if (team.players && Array.isArray(team.players)) {
        team.players.forEach((player: any) => {
          const playerId = player.player_id || player.id
          if (playerId) {
            squadPlayerIds.add(playerId)
          }
        })
      }

      // Get players from database
      const playersInDb = await payload.find({
        collection: 'players',
        where: {
          id: {
            in: Array.from(squadPlayerIds),
          },
        },
        pagination: false,
      })

      const foundPlayerIds = new Set(playersInDb.docs.map((p: any) => p.id))
      const missingPlayerIds = Array.from(squadPlayerIds).filter(id => !foundPlayerIds.has(id))

      if (missingPlayerIds.length === 0) {
        return NextResponse.json({
          message: 'No missing players to sync',
          teamId: numericTeamId,
          teamName: team.name,
        })
      }

      // Create sync service and execute
      const missingPlayersSync = createMissingPlayersSync({
        apiKey: process.env.SPORTMONKS_API_KEY || '',
        baseUrl: process.env.SPORTMONKS_BASE_URL,
      })

      const syncResult = await missingPlayersSync({
        playerIds: missingPlayerIds,
        teamId: numericTeamId,
        teamName: team.name,
        concurrency: 5,
      })

      return NextResponse.json({
        teamId: numericTeamId,
        teamName: team.name,
        syncResult,
      })
    }

    // If action is 'export', return all collected data
    if (action === 'export') {
      return new NextResponse(missingPlayersDebugger.exportAsJson(), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename=missing-players-debug.json'
        }
      })
    }

    // Default: return current summary
    return NextResponse.json({
      enabled: true,
      summary: missingPlayersDebugger.getSummary(),
      hint: 'Use ?action=analyze&teamId=9 to analyze a team, ?action=sync&teamId=9 to sync missing players, or ?action=export to download data'
    })

  } catch (error) {
    console.error('Error in missing players debug endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}