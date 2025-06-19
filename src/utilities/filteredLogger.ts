import chalk from 'chalk'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type LogCategory = 'missing-players' | 'sync' | 'api' | 'db' | 'general'

interface LoggerConfig {
  enabledCategories: Set<LogCategory>
  minLevel: LogLevel
  colorize: boolean
}

class FilteredLogger {
  private config: LoggerConfig
  private readonly levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  }

  constructor() {
    // Load configuration from environment variables
    this.config = {
      enabledCategories: this.parseEnabledCategories(),
      minLevel: (process.env.LOG_LEVEL as LogLevel) || 'info',
      colorize: process.env.NO_COLOR !== 'true',
    }
  }

  private parseEnabledCategories(): Set<LogCategory> {
    const categories = process.env.LOG_CATEGORIES?.split(',').map(c => c.trim()) || ['general']
    return new Set(categories as LogCategory[])
  }

  private shouldLog(level: LogLevel, category: LogCategory): boolean {
    // Check if category is enabled
    if (!this.config.enabledCategories.has(category) && category !== 'general') {
      return false
    }

    // Check if level meets minimum threshold
    return this.levels[level] >= this.levels[this.config.minLevel]
  }

  private formatMessage(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data?: any
  ): string {
    const timestamp = new Date().toISOString()
    let output = `[${timestamp}] [${level.toUpperCase()}] [${category}] ${message}`

    if (data) {
      output += '\n' + JSON.stringify(data, null, 2)
    }

    if (this.config.colorize) {
      switch (level) {
        case 'debug':
          return chalk.gray(output)
        case 'info':
          return chalk.blue(output)
        case 'warn':
          return chalk.yellow(output)
        case 'error':
          return chalk.red(output)
      }
    }

    return output
  }

  log(level: LogLevel, category: LogCategory, message: string, data?: any): void {
    if (this.shouldLog(level, category)) {
      const formatted = this.formatMessage(level, category, message, data)
      
      switch (level) {
        case 'error':
          console.error(formatted)
          break
        case 'warn':
          console.warn(formatted)
          break
        default:
          console.log(formatted)
      }
    }
  }

  debug(category: LogCategory, message: string, data?: any): void {
    this.log('debug', category, message, data)
  }

  info(category: LogCategory, message: string, data?: any): void {
    this.log('info', category, message, data)
  }

  warn(category: LogCategory, message: string, data?: any): void {
    this.log('warn', category, message, data)
  }

  error(category: LogCategory, message: string, data?: any): void {
    this.log('error', category, message, data)
  }
}

// Create singleton instance
export const logger = new FilteredLogger()

// Convenience function for missing player logs
export function logMissingPlayerFiltered(
  playerId: number,
  teamId: number,
  context: string,
  additionalInfo?: Record<string, any>
): void {
  logger.warn('missing-players', `Missing player ${playerId} in team ${teamId} (${context})`, {
    playerId,
    teamId,
    context,
    ...additionalInfo,
  })
}