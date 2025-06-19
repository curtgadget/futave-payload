#!/usr/bin/env node
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { createMatchSyncWithWaveScore } from '../src/services/sync/handlers/matchWithWaveScore.sync'
import chalk from 'chalk'

interface SyncOptions {
  daysBack?: number
  daysAhead?: number
  waveScores?: boolean
  onlyFuture?: boolean
  startDate?: string
  endDate?: string
}

function parseArgs(): SyncOptions {
  const args = process.argv.slice(2)
  const options: SyncOptions = {
    daysBack: 30,
    daysAhead: 30,
    waveScores: true,
    onlyFuture: false
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const value = args[i + 1]

    switch (arg) {
      case '--days-back':
      case '-b':
        options.daysBack = parseInt(value, 10)
        i++
        break
      case '--days-ahead':
      case '-a':
        options.daysAhead = parseInt(value, 10)
        i++
        break
      case '--start-date':
      case '-s':
        options.startDate = value
        i++
        break
      case '--end-date':
      case '-e':
        options.endDate = value
        i++
        break
      case '--no-waves':
        options.waveScores = false
        break
      case '--only-future':
        options.onlyFuture = true
        break
      case '--help':
      case '-h':
        printUsage()
        process.exit(0)
        break
      default:
        if (arg.startsWith('-')) {
          console.error(chalk.red(`Unknown option: ${arg}`))
          printUsage()
          process.exit(1)
        }
    }
  }

  return options
}

function printUsage() {
  console.log(chalk.cyan('Match Sync Script'))
  console.log(chalk.gray('================'))
  console.log()
  console.log('Usage:')
  console.log(chalk.green('  node scripts/sync-matches.ts [options]'))
  console.log()
  console.log('Options:')
  console.log(chalk.yellow('  -b, --days-back <num>     ') + 'Days back from today (default: 30)')
  console.log(chalk.yellow('  -a, --days-ahead <num>    ') + 'Days ahead from today (default: 30)')
  console.log(chalk.yellow('  -s, --start-date <date>   ') + 'Start date (YYYY-MM-DD format)')
  console.log(chalk.yellow('  -e, --end-date <date>     ') + 'End date (YYYY-MM-DD format)')
  console.log(chalk.yellow('  --no-waves               ') + 'Skip wave score calculation')
  console.log(chalk.yellow('  --only-future            ') + 'Only sync future matches')
  console.log(chalk.yellow('  -h, --help               ') + 'Show this help message')
  console.log()
  console.log('Examples:')
  console.log(chalk.gray('  # Sync last 7 days and next 14 days'))
  console.log(chalk.green('  node scripts/sync-matches.ts -b 7 -a 14'))
  console.log()
  console.log(chalk.gray('  # Sync specific date range'))
  console.log(chalk.green('  node scripts/sync-matches.ts -s 2024-01-01 -e 2024-01-31'))
  console.log()
  console.log(chalk.gray('  # Sync only future matches with wave scores'))
  console.log(chalk.green('  node scripts/sync-matches.ts --only-future -a 60'))
  console.log()
}

function calculateDateRange(options: SyncOptions): { startDate: string; endDate: string } {
  if (options.startDate && options.endDate) {
    return { startDate: options.startDate, endDate: options.endDate }
  }

  const now = new Date()
  const startDate = new Date(now.getTime() - (options.daysBack || 30) * 24 * 60 * 60 * 1000)
  const endDate = new Date(now.getTime() + (options.daysAhead || 30) * 24 * 60 * 60 * 1000)

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  }
}

async function syncMatches() {
  const options = parseArgs()
  const payload = await getPayload({ config })
  const { startDate, endDate } = calculateDateRange(options)
  
  console.log(chalk.cyan('🏈 Starting Match Sync'))
  console.log(chalk.gray('==================='))
  console.log()
  console.log(chalk.blue('Configuration:'))
  console.log(`  Date range: ${chalk.yellow(startDate)} to ${chalk.yellow(endDate)}`)
  console.log(`  Days back: ${chalk.yellow(options.daysBack || 'custom')}`)
  console.log(`  Days ahead: ${chalk.yellow(options.daysAhead || 'custom')}`)
  console.log(`  Wave scores: ${options.waveScores ? chalk.green('enabled') : chalk.red('disabled')}`)
  console.log(`  Future only: ${options.onlyFuture ? chalk.green('yes') : chalk.gray('no')}`)
  console.log()
  
  const apiConfig = {
    apiKey: process.env.SPORTMONKS_API_KEY || '',
    baseUrl: process.env.SPORTMONKS_BASE_URL,
  }

  if (!apiConfig.apiKey) {
    console.error(chalk.red('❌ SPORTMONKS_API_KEY environment variable is required'))
    process.exit(1)
  }
  
  try {
    // Phase 1: Sync match data
    console.log(chalk.cyan('Phase 1: Syncing match data...'))
    const matchSync = createMatchSyncWithWaveScore(
      apiConfig,
      payload,
      startDate,
      endDate,
      {
        calculateWaveScores: false, // First pass without wave scores
        onlyFutureMatches: options.onlyFuture,
        maxDaysAhead: options.daysAhead || 30
      }
    )
    
    const result = await matchSync.sync()
    console.log()
    console.log(chalk.green('✅ Match sync completed!'))
    console.log(`  Created: ${chalk.yellow(result.stats.created)}`)
    console.log(`  Updated: ${chalk.yellow(result.stats.updated)}`)
    console.log(`  Failed: ${chalk.red(result.stats.failed)}`)
    
    if (result.stats.failed > 0) {
      console.log(chalk.red(`\n⚠️  ${result.stats.failed} matches failed to sync`))
      result.stats.errors.slice(0, 3).forEach(error => {
        console.log(chalk.red(`  • ${error.error}`))
      })
      if (result.stats.errors.length > 3) {
        console.log(chalk.gray(`  ... and ${result.stats.errors.length - 3} more errors`))
      }
    }
    
    // Phase 2: Calculate wave scores (if enabled and we have data)
    if (options.waveScores && (result.stats.created > 0 || result.stats.updated > 0)) {
      console.log()
      console.log(chalk.cyan('Phase 2: Calculating wave scores for future matches...'))
      
      const today = new Date().toISOString().split('T')[0]
      const waveStartDate = options.onlyFuture ? today : startDate
      
      const waveSync = createMatchSyncWithWaveScore(
        apiConfig,
        payload,
        waveStartDate,
        endDate,
        {
          calculateWaveScores: true,
          onlyFutureMatches: true,
          maxDaysAhead: options.daysAhead || 30
        }
      )
      
      const waveResult = await waveSync.sync()
      console.log()
      console.log(chalk.green('🌊 Wave score calculation completed!'))
      console.log(`  Updated with wave scores: ${chalk.yellow(waveResult.stats.updated)}`)
      
      if (waveResult.stats.failed > 0) {
        console.log(chalk.red(`  Failed: ${waveResult.stats.failed}`))
      }
    }
    
    // Show top wave matches if wave scores were calculated
    if (options.waveScores) {
      console.log()
      console.log(chalk.cyan('🏆 Top matches by wave score:'))
      const matches = await payload.find({
        collection: 'matches',
        where: {
          'wave_score.total': { exists: true }
        },
        sort: '-wave_score.total',
        limit: 5
      })
      
      if (matches.docs.length > 0) {
        matches.docs.forEach((match: any, index: number) => {
          const participants = match.participants as any[]
          const home = participants?.find(p => p.meta?.location === 'home')
          const away = participants?.find(p => p.meta?.location === 'away')
          const tier = match.wave_score.tier
          const tierColor = tier === 'S-Tier' ? 'magenta' : tier === 'A-Tier' ? 'blue' : tier === 'B-Tier' ? 'yellow' : 'gray'
          console.log(`  ${index + 1}. ${home?.name || 'TBD'} vs ${away?.name || 'TBD'}`)
          console.log(`     Score: ${chalk.yellow(match.wave_score.total)} (${chalk[tierColor](tier)})`)
        })
      } else {
        console.log(chalk.gray('  No matches with wave scores found.'))
      }
    }
    
  } catch (error) {
    console.error()
    console.error(chalk.red('❌ Sync failed:'), error)
    process.exit(1)
  }
  
  console.log()
  console.log(chalk.green('🎉 All done!'))
}

// Handle CLI execution
if (require.main === module) {
  syncMatches()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(chalk.red('Fatal error:'), error)
      process.exit(1)
    })
}

export { syncMatches }