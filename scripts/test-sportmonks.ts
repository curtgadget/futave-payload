#!/usr/bin/env node
import { createSportmonksClient } from '../src/services/sportmonks/client'
import { SPORTMONKS_FOOTBALL_BASE_URL } from '../src/constants/api'
import { SportmonksPlayer, SportmonksMatch, SportmonksTeam } from '../src/services/sportmonks/client/types'
import * as dotenv from 'dotenv'
import chalk from 'chalk'

// Load environment variables
dotenv.config()

interface TestOptions {
  endpoint?: string
  detailed?: boolean
  help?: boolean
}

function parseArgs(): TestOptions {
  const args = process.argv.slice(2)
  const options: TestOptions = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const value = args[i + 1]

    switch (arg) {
      case '--endpoint':
      case '-e':
        options.endpoint = value
        i++
        break
      case '--detailed':
      case '-d':
        options.detailed = true
        break
      case '--help':
      case '-h':
        options.help = true
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
  console.log(chalk.cyan('Sportmonks API Test Script'))
  console.log(chalk.gray('=========================='))
  console.log()
  console.log('Usage:')
  console.log(chalk.green('  node scripts/test-sportmonks.ts [options]'))
  console.log()
  console.log('Options:')
  console.log(chalk.yellow('  -e, --endpoint <name>  ') + 'Test specific endpoint (players, teams, matches)')
  console.log(chalk.yellow('  -d, --detailed         ') + 'Show detailed response data')
  console.log(chalk.yellow('  -h, --help            ') + 'Show this help message')
  console.log()
  console.log('Examples:')
  console.log(chalk.gray('  # Test all endpoints'))
  console.log(chalk.green('  node scripts/test-sportmonks.ts'))
  console.log()
  console.log(chalk.gray('  # Test specific endpoint with detailed output'))
  console.log(chalk.green('  node scripts/test-sportmonks.ts -e players -d'))
  console.log()
}

async function testEndpoint(
  client: any, 
  endpoint: string, 
  limit: number = 25,
  include?: string
): Promise<{ success: boolean; data?: any[]; error?: string; duration: number }> {
  const startTime = Date.now()
  
  try {
    console.log(`  Testing ${endpoint}...`)
    
    const params: any = { per_page: limit }
    if (include) {
      params.include = include
    }
    
    const response = await client.get(endpoint, params)
    const duration = Date.now() - startTime
    
    if (!response.data || !Array.isArray(response.data)) {
      return { 
        success: false, 
        error: 'Invalid response format', 
        duration 
      }
    }
    
    return { 
      success: true, 
      data: response.data, 
      duration 
    }
  } catch (error) {
    const duration = Date.now() - startTime
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      duration 
    }
  }
}

async function testRateLimit(client: any): Promise<void> {
  console.log(chalk.yellow('📊 Testing rate limit handling...'))
  
  const startTime = Date.now()
  const promises = Array.from({ length: 10 }, (_, i) => 
    client.get('/teams', { per_page: 5, page: i + 1 })
      .then(() => ({ success: true, index: i }))
      .catch((error: any) => ({ success: false, index: i, error: error.message }))
  )
  
  const results = await Promise.all(promises)
  const duration = Date.now() - startTime
  
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  
  console.log(`  Concurrent requests: 10`)
  console.log(`  Successful: ${chalk.green(successful)}`)
  console.log(`  Failed: ${chalk.red(failed)}`)
  console.log(`  Duration: ${chalk.yellow(duration)}ms`)
  
  if (failed > 0) {
    console.log(`  ${chalk.red('Sample errors:')}`)
    results
      .filter(r => !r.success)
      .slice(0, 3)
      .forEach(r => console.log(`    • ${r.error}`))
  }
}

async function testPagination(client: any): Promise<void> {
  console.log(chalk.yellow('📄 Testing pagination...'))
  
  try {
    // Test manual pagination
    const page1 = await client.get('/players', { per_page: 25, page: 1 })
    const page2 = await client.get('/players', { per_page: 25, page: 2 })
    
    const page1Ids = new Set(page1.data?.map((p: any) => p.id) || [])
    const page2Ids = new Set(page2.data?.map((p: any) => p.id) || [])
    
    const overlapping = [...page1Ids].filter(id => page2Ids.has(id))
    
    console.log(`  Page 1 items: ${chalk.yellow(page1.data?.length || 0)}`)
    console.log(`  Page 2 items: ${chalk.yellow(page2.data?.length || 0)}`)
    console.log(`  Overlapping IDs: ${overlapping.length > 0 ? chalk.red(overlapping.length) : chalk.green('0')}`)
    
    if (overlapping.length > 0) {
      console.log(`  ${chalk.red('Warning: Found duplicate items across pages!')}`)
    }
    
    // Test fetchAllPages
    console.log(`  Testing fetchAllPages (limited to 3 pages)...`)
    const allPlayers = await client.fetchAllPages<SportmonksPlayer>('/players', {
      include: 'nationality;position',
      per_page: 25
    }, 3) // Limit to 3 pages for testing
    
    const uniqueIds = new Set(allPlayers.map((p: SportmonksPlayer) => p.id))
    
    console.log(`  Total fetched: ${chalk.yellow(allPlayers.length)}`)
    console.log(`  Unique IDs: ${chalk.yellow(uniqueIds.size)}`)
    console.log(`  Duplicates: ${allPlayers.length !== uniqueIds.size ? chalk.red('Yes') : chalk.green('No')}`)
    
  } catch (error) {
    console.log(`  ${chalk.red('Error:')} ${error}`)
  }
}

async function runTests() {
  const options = parseArgs()
  
  if (options.help) {
    printUsage()
    return
  }

  console.log(chalk.cyan('🏈 Sportmonks API Test Suite'))
  console.log(chalk.gray('============================'))
  console.log()

  const apiKey = process.env.SPORTMONKS_API_KEY || ''
  if (!apiKey) {
    console.error(chalk.red('❌ SPORTMONKS_API_KEY environment variable is required'))
    process.exit(1)
  }

  const client = createSportmonksClient({
    apiKey,
    baseUrl: process.env.SPORTMONKS_BASE_URL || SPORTMONKS_FOOTBALL_BASE_URL,
  })

  console.log(chalk.blue('Configuration:'))
  console.log(`  API Key: ${chalk.yellow(apiKey.substring(0, 8))}...`)
  console.log(`  Base URL: ${chalk.yellow(process.env.SPORTMONKS_BASE_URL || SPORTMONKS_FOOTBALL_BASE_URL)}`)
  console.log()

  const endpoints = [
    { name: 'players', include: 'nationality;position' },
    { name: 'teams', include: 'league' },
    { name: 'matches', include: 'league;participants' },
    { name: 'leagues', include: 'sport' },
  ]

  // Test specific endpoint if requested
  if (options.endpoint) {
    const endpoint = endpoints.find(e => e.name === options.endpoint)
    if (!endpoint) {
      console.error(chalk.red(`❌ Unknown endpoint: ${options.endpoint}`))
      console.log(chalk.gray('Available endpoints: ') + endpoints.map(e => e.name).join(', '))
      process.exit(1)
    }
    
    console.log(chalk.yellow(`🔍 Testing ${endpoint.name} endpoint...`))
    const result = await testEndpoint(client, `/${endpoint.name}`, 25, endpoint.include)
    
    if (result.success) {
      console.log(`  ${chalk.green('✅ Success')} (${result.duration}ms)`)
      console.log(`  Items returned: ${chalk.yellow(result.data?.length || 0)}`)
      
      if (options.detailed && result.data && result.data.length > 0) {
        console.log()
        console.log(chalk.blue('Sample data:'))
        console.log(JSON.stringify(result.data[0], null, 2))
      }
    } else {
      console.log(`  ${chalk.red('❌ Failed')} (${result.duration}ms)`)
      console.log(`  Error: ${chalk.red(result.error)}`)
    }
    
    return
  }

  // Test all endpoints
  console.log(chalk.yellow('🔍 Testing API endpoints...'))
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(client, `/${endpoint.name}`, 25, endpoint.include)
    
    if (result.success) {
      console.log(`  ${chalk.green('✅')} ${endpoint.name.padEnd(10)} (${result.duration}ms) - ${result.data?.length || 0} items`)
      
      if (options.detailed && result.data && result.data.length > 0) {
        const sample = result.data[0]
        const keys = Object.keys(sample).slice(0, 5)
        console.log(`      Sample fields: ${chalk.gray(keys.join(', '))}${keys.length < Object.keys(sample).length ? '...' : ''}`)
      }
    } else {
      console.log(`  ${chalk.red('❌')} ${endpoint.name.padEnd(10)} (${result.duration}ms) - ${chalk.red(result.error)}`)
    }
  }

  console.log()
  await testRateLimit(client)
  
  console.log()
  await testPagination(client)
  
  console.log()
  console.log(chalk.green('🎉 Test suite completed!'))
}

// Handle CLI execution
if (require.main === module) {
  runTests()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(chalk.red('Fatal error:'), error)
      process.exit(1)
    })
}

export { runTests }