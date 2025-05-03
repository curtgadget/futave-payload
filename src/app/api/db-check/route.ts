import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

interface Player {
  id: number
  name: string
  createdAt: Date
  [key: string]: any
}

export async function GET() {
  try {
    const payload = await getPayload({ config })

    // Get counts for different collections
    const playerCount = await payload.db.collections.players.countDocuments()
    const teamCount = (await payload.db.collections.teams?.countDocuments()) || 0
    const matchCount = (await payload.db.collections.matches?.countDocuments()) || 0

    // Get a sample of the latest players
    const latestPlayers = (await payload.db.collections.players
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()
      .exec()) as unknown as Player[]

    return NextResponse.json({
      success: true,
      counts: {
        players: playerCount,
        teams: teamCount,
        matches: matchCount,
      },
      latestPlayers: latestPlayers.map((player: Player) => ({
        id: player.id,
        name: player.name,
        createdAt: player.createdAt,
      })),
    })
  } catch (error) {
    console.error('Error fetching database info:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
