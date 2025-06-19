#!/usr/bin/env node

import { spawn } from 'child_process'
import chalk from 'chalk'

const args = process.argv.slice(2)
const command = args[0]

function printUsage() {
  console.log(chalk.cyan('Missing Players Debug Tool'))
  console.log(chalk.gray('========================='))
  console.log()
  console.log('Usage:')
  console.log(chalk.green('  pnpm debug-players on') + '     - Enable debug logging')
  console.log(chalk.green('  pnpm debug-players off') + '    - Disable debug logging')
  console.log(chalk.green('  pnpm debug-players analyze <teamId>') + ' - Analyze a specific team')
  console.log(chalk.green('  pnpm debug-players sync <teamId>') + '    - Sync missing players for a team')
  console.log(chalk.green('  pnpm debug-players export') + ' - Export debug data')
  console.log()
}

async function runAnalysis(teamId?: string) {
  const baseUrl = 'http://localhost:3000/api/v1/debug/missing-players'
  let url = baseUrl

  if (teamId) {
    url = `${baseUrl}?action=analyze&teamId=${teamId}`
  } else {
    url = `${baseUrl}?action=export`
  }

  try {
    const response = await fetch(url)
    const data = await response.json()
    
    if (!response.ok) {
      console.error(chalk.red('Error:'), data.error)
      if (data.hint) {
        console.log(chalk.yellow('Hint:'), data.hint)
      }
      return
    }

    console.log(chalk.green('Debug Data:'))
    console.log(JSON.stringify(data, null, 2))
  } catch (error) {
    console.error(chalk.red('Failed to fetch debug data:'), error)
  }
}

async function runSync(teamId: string) {
  const url = `http://localhost:3000/api/v1/debug/missing-players?action=sync&teamId=${teamId}`

  try {
    console.log(chalk.yellow('Starting sync... This may take a while depending on the number of missing players.'))
    
    const response = await fetch(url)
    const data = await response.json()
    
    if (!response.ok) {
      console.error(chalk.red('Error:'), data.error)
      if (data.hint) {
        console.log(chalk.yellow('Hint:'), data.hint)
      }
      return
    }

    // Display sync results
    if (data.syncResult) {
      const { stats } = data.syncResult
      console.log()
      console.log(chalk.green('✓ Sync completed!'))
      console.log()
      console.log(chalk.blue('Team:'), `${data.teamName} (ID: ${data.teamId})`)
      console.log(chalk.blue('Results:'))
      console.log(`  • Requested: ${stats.requested} players`)
      console.log(`  • Fetched: ${stats.fetched} players`)
      console.log(chalk.green(`  • Created: ${stats.created} new players`))
      console.log(chalk.yellow(`  • Updated: ${stats.updated} existing players`))
      
      if (stats.failed > 0) {
        console.log(chalk.red(`  • Failed: ${stats.failed} players`))
        if (stats.errors.length > 0) {
          console.log()
          console.log(chalk.red('Errors:'))
          stats.errors.forEach((err: any) => {
            console.log(chalk.red(`  • Player ${err.playerId}: ${err.error}`))
          })
        }
      }
    } else {
      console.log(chalk.green('Response:'))
      console.log(JSON.stringify(data, null, 2))
    }
  } catch (error) {
    console.error(chalk.red('Failed to sync players:'), error)
  }
}

async function main() {
  switch (command) {
    case 'on':
      console.log(chalk.green('Enabling missing players debug mode...'))
      console.log(chalk.yellow('Add this to your .env file:'))
      console.log(chalk.cyan('DEBUG_MISSING_PLAYERS=true'))
      console.log()
      console.log(chalk.gray('Then restart your development server'))
      break

    case 'off':
      console.log(chalk.red('Disabling missing players debug mode...'))
      console.log(chalk.yellow('Remove this from your .env file:'))
      console.log(chalk.cyan('DEBUG_MISSING_PLAYERS=true'))
      console.log()
      console.log(chalk.gray('Then restart your development server'))
      break

    case 'analyze':
      const teamId = args[1]
      if (!teamId) {
        console.error(chalk.red('Error: Please provide a team ID'))
        console.log(chalk.gray('Example: pnpm debug-players analyze 9'))
        process.exit(1)
      }
      console.log(chalk.cyan(`Analyzing team ${teamId}...`))
      await runAnalysis(teamId)
      break

    case 'sync':
      const syncTeamId = args[1]
      if (!syncTeamId) {
        console.error(chalk.red('Error: Please provide a team ID'))
        console.log(chalk.gray('Example: pnpm debug-players sync 9'))
        process.exit(1)
      }
      console.log(chalk.cyan(`Syncing missing players for team ${syncTeamId}...`))
      await runSync(syncTeamId)
      break

    case 'export':
      console.log(chalk.cyan('Exporting debug data...'))
      await runAnalysis()
      break

    default:
      printUsage()
  }
}

main().catch(console.error)