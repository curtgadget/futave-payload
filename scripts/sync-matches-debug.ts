#!/usr/bin/env node
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { createMatchSyncWithWaveScore } from '../src/services/sync/handlers/matchWithWaveScore.sync'

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
          console.error(`Unknown option: ${arg}`)
          printUsage()
          process.exit(1)
        }
    }
  }

  return options
}

function printUsage() {
  console.log('Match Sync Script')
  console.log('================')
  console.log()
  console.log('Usage:')
  console.log('  node scripts/sync-matches-debug.ts [options]')
  console.log()
  console.log('Options:')
  console.log('  -b, --days-back <num>      Days back from today (default: 30)')
  console.log('  -a, --days-ahead <num>     Days ahead from today (default: 30)')
  console.log('  -s, --start-date <date>    Start date (YYYY-MM-DD format)')
  console.log('  -e, --end-date <date>      End date (YYYY-MM-DD format)')
  console.log('  --no-waves                Skip wave score calculation')
  console.log('  --only-future             Only sync future matches')
  console.log('  -h, --help                Show this help message')
  console.log()
  console.log('Examples:')
  console.log('  # Sync last 7 days and next 14 days')
  console.log('  node scripts/sync-matches-debug.ts -b 7 -a 14')
  console.log()
  console.log('  # Sync specific date range')
  console.log('  node scripts/sync-matches-debug.ts -s 2024-01-01 -e 2024-01-31')
  console.log()
  console.log('  # Sync only future matches with wave scores')
  console.log('  node scripts/sync-matches-debug.ts --only-future -a 60')
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

// Override console methods to ensure visibility
const originalLog = console.log
const originalInfo = console.info
const originalWarn = console.warn
const originalError = console.error

console.log = (...args: any[]) => {
  originalLog('[LOG]', new Date().toISOString(), ...args)
}

console.info = (...args: any[]) => {
  originalInfo('[INFO]', new Date().toISOString(), ...args)
}

console.warn = (...args: any[]) => {
  originalWarn('[WARN]', new Date().toISOString(), ...args)
}

console.error = (...args: any[]) => {
  originalError('[ERROR]', new Date().toISOString(), ...args)
}

async function syncMatches() {
  console.log('=== STARTING MATCH SYNC DEBUG ===')
  
  const options = parseArgs()
  console.log('Parsed options:', options)
  
  const { startDate, endDate } = calculateDateRange(options)
  
  console.log('🏈 Starting Match Sync')
  console.log('===================')
  console.log()
  console.log('Configuration:')
  console.log(`  Date range: ${startDate} to ${endDate}`)
  console.log(`  Days back: ${options.daysBack || 'custom'}`)
  console.log(`  Days ahead: ${options.daysAhead || 'custom'}`)
  console.log(`  Wave scores: ${options.waveScores ? 'enabled' : 'disabled'}`)
  console.log(`  Future only: ${options.onlyFuture ? 'yes' : 'no'}`)
  console.log()
  
  const apiConfig = {
    apiKey: process.env.SPORTMONKS_API_KEY || '',
    baseUrl: process.env.SPORTMONKS_BASE_URL,
  }

  if (!apiConfig.apiKey) {
    console.error('❌ SPORTMONKS_API_KEY environment variable is required')
    process.exit(1)
  }

  console.log('API Config loaded successfully')
  console.log(`  Base URL: ${apiConfig.baseUrl || 'default'}`)
  console.log(`  API Key: ${apiConfig.apiKey.substring(0, 8)}...`)
  
  try {
    console.log('Getting Payload instance...')
    const payload = await getPayload({ config })
    console.log('✅ Payload instance created')
    
    // Phase 1: Sync match data
    console.log('\n=== Phase 1: Syncing match data ===')
    console.log(`Creating match sync service for date range: ${startDate} to ${endDate}`)
    
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
    
    console.log('Starting sync operation...')
    console.log('NOTE: Progress will be logged below. This may take a while...')
    console.log('---')
    
    const result = await matchSync.sync()
    
    console.log('---')
    console.log('\n✅ Match sync completed!')
    console.log(`  Created: ${result.stats.created}`)
    console.log(`  Updated: ${result.stats.updated}`)
    console.log(`  Failed: ${result.stats.failed}`)
    console.log(`  Duration: ${result.stats.endTime ? (result.stats.endTime - result.stats.startTime) / 1000 : 'N/A'}s`)
    
    if (result.stats.failed > 0) {
      console.log(`\n⚠️  ${result.stats.failed} matches failed to sync`)
      result.stats.errors.slice(0, 3).forEach(error => {
        console.log(`  • ${error.error}`)
      })
      if (result.stats.errors.length > 3) {
        console.log(`  ... and ${result.stats.errors.length - 3} more errors`)
      }
    }
    
    // Phase 2: Calculate wave scores (if enabled and we have data)
    if (options.waveScores && (result.stats.created > 0 || result.stats.updated > 0)) {
      console.log('\n=== Phase 2: Calculating wave scores for future matches ===')
      
      const today = new Date().toISOString().split('T')[0]
      const waveStartDate = options.onlyFuture ? today : startDate
      
      console.log(`Creating wave score sync for date range: ${waveStartDate} to ${endDate}`)
      
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
      
      console.log('Starting wave score calculation...')
      console.log('---')
      
      const waveResult = await waveSync.sync()
      
      console.log('---')
      console.log('\n🌊 Wave score calculation completed!')
      console.log(`  Updated with wave scores: ${waveResult.stats.updated}`)
      
      if (waveResult.stats.failed > 0) {
        console.log(`  Failed: ${waveResult.stats.failed}`)
      }
    }
    
    // Show top wave matches if wave scores were calculated
    if (options.waveScores) {
      console.log('\n🏆 Top matches by wave score:')
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
          console.log(`  ${index + 1}. ${home?.name || 'TBD'} vs ${away?.name || 'TBD'}`)
          console.log(`     Score: ${match.wave_score.total} (${tier})`)
        })
      } else {
        console.log('  No matches with wave scores found.')
      }
    }
    
  } catch (error) {
    console.error()
    console.error('❌ Sync failed:', error)
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack)
    }
    process.exit(1)
  }
  
  console.log()
  console.log('🎉 All done!')
  console.log('=== END OF MATCH SYNC DEBUG ===')
}

// Handle CLI execution
syncMatches()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

export { syncMatches }