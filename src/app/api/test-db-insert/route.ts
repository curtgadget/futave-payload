import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

interface Player {
  id: number
  sport_id: number
  name: string
  [key: string]: any
}

export async function GET() {
  try {
    const payload = await getPayload({ config })

    // Get existing player IDs
    const existingPlayers = (await payload.db.collections.players
      .find({})
      .lean()
      .exec()) as unknown as Player[]

    const existingIds = existingPlayers.map((p: Player) => p.id)

    console.log(`Found ${existingIds.length} existing players`)

    // Create test players with IDs that don't exist yet
    const newPlayers = []
    for (let i = 1; i <= 10; i++) {
      const testId = 10000 + i
      if (!existingIds.includes(testId)) {
        newPlayers.push({
          id: testId,
          sport_id: 1,
          name: `Test Player ${i}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }
    }

    console.log(`Inserting ${newPlayers.length} new test players`)

    if (newPlayers.length > 0) {
      // Try direct MongoDB insert
      const result = (await payload.db.collections.players.insertMany(newPlayers)) as unknown as {
        insertedCount: number
        insertedIds: Record<string, number>
      }

      return NextResponse.json({
        success: true,
        inserted: result.insertedCount,
        newPlayerIds: newPlayers.map((p: any) => p.id),
      })
    } else {
      return NextResponse.json({
        success: true,
        message: 'No new players to insert',
      })
    }
  } catch (error) {
    console.error('Error inserting test players:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
