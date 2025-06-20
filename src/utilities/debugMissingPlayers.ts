// import chalk from 'chalk'

export interface MissingPlayerInfo {
  playerId: number
  teamId: number
  teamName?: string
  jerseyNumber?: number
  positionId?: number
  context: 'squad' | 'stats' | 'sync' | 'other'
  timestamp: Date
  additionalInfo?: Record<string, any>
}

class MissingPlayersDebugger {
  private missingPlayers: Map<string, MissingPlayerInfo> = new Map()
  private isEnabled: boolean = false

  constructor() {
    // Enable debugging based on environment variable
    this.isEnabled = process.env.DEBUG_MISSING_PLAYERS === 'true'
  }

  /**
   * Log a missing player with structured information
   */
  logMissingPlayer(info: MissingPlayerInfo): void {
    if (!this.isEnabled) return

    const key = `${info.teamId}-${info.playerId}`
    this.missingPlayers.set(key, info)

    // Create a formatted log message
    const timestamp = new Date().toISOString()
    const teamInfo = info.teamName ? ` (${info.teamName})` : ''
    const jerseyInfo = info.jerseyNumber ? ` #${info.jerseyNumber}` : ''
    const positionInfo = info.positionId ? ` pos:${info.positionId}` : ''

    console.log(
      '[MISSING PLAYER]',
      `${timestamp}`,
      `Player ${info.playerId}`,
      `Team ${info.teamId}${teamInfo}`,
      `${jerseyInfo}${positionInfo}`,
      `Context: ${info.context}`,
      info.additionalInfo ? JSON.stringify(info.additionalInfo) : ''
    )
  }

  /**
   * Get all missing players grouped by team
   */
  getMissingPlayersByTeam(): Record<number, MissingPlayerInfo[]> {
    const grouped: Record<number, MissingPlayerInfo[]> = {}
    
    this.missingPlayers.forEach((info) => {
      if (!grouped[info.teamId]) {
        grouped[info.teamId] = []
      }
      grouped[info.teamId].push(info)
    })

    return grouped
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalMissing: number
    byContext: Record<string, number>
    byTeam: Record<number, number>
  } {
    const summary = {
      totalMissing: this.missingPlayers.size,
      byContext: {} as Record<string, number>,
      byTeam: {} as Record<number, number>,
    }

    this.missingPlayers.forEach((info) => {
      // Count by context
      summary.byContext[info.context] = (summary.byContext[info.context] || 0) + 1
      
      // Count by team
      summary.byTeam[info.teamId] = (summary.byTeam[info.teamId] || 0) + 1
    })

    return summary
  }

  /**
   * Clear the missing players cache
   */
  clear(): void {
    this.missingPlayers.clear()
  }

  /**
   * Export missing players as JSON
   */
  exportAsJson(): string {
    const data = {
      timestamp: new Date().toISOString(),
      summary: this.getSummary(),
      missingPlayers: Array.from(this.missingPlayers.values()),
      groupedByTeam: this.getMissingPlayersByTeam(),
    }
    return JSON.stringify(data, null, 2)
  }

  /**
   * Check if debugging is enabled
   */
  isDebuggingEnabled(): boolean {
    return this.isEnabled
  }
}

// Create a singleton instance
export const missingPlayersDebugger = new MissingPlayersDebugger()

// Helper function for quick logging
export function logMissingPlayer(
  playerId: number,
  teamId: number,
  context: 'squad' | 'stats' | 'sync' | 'other',
  additionalInfo?: Partial<MissingPlayerInfo>
): void {
  missingPlayersDebugger.logMissingPlayer({
    playerId,
    teamId,
    context,
    timestamp: new Date(),
    ...additionalInfo,
  })
}