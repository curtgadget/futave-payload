#!/usr/bin/env node
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { createRivalWithH2HSync } from '../src/services/sync/handlers/rivalWithH2H.sync'

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

async function syncRivals() {
  console.log('=== STARTING RIVALS & H2H SYNC ===')
  
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
    
    // Create rivals sync with H2H
    console.log('\n=== Starting Rivals & H2H sync ===')
    console.log('Default TTLs:')
    console.log('  - Rival data: 90 days')
    console.log('  - H2H data: 7 days')
    console.log('')
    
    const rivalSync = createRivalWithH2HSync(apiConfig, {
      h2hTtlDays: 7,
      rivalDataTtlDays: 90
    })
    
    console.log('Starting sync operation...')
    console.log('NOTE: This will check TTLs first and skip if data is fresh')
    console.log('---')
    
    const result = await rivalSync.sync()
    
    console.log('---')
    console.log('\n✅ Rivals & H2H sync completed!')
    console.log(`  Success: ${result.success}`)
    console.log(`  Message: ${result.message}`)
    
    if (result.stats) {
      console.log('\nSync Stats:')
      console.log(`  Rivals created: ${result.stats.created}`)
      console.log(`  Rivals updated: ${result.stats.updated}`)
      console.log(`  Failed: ${result.stats.failed}`)
      
      if ('h2hPairs' in result.stats) {
        console.log(`  H2H pairs processed: ${(result.stats as any).h2hPairs}`)
        console.log(`  H2H synced: ${(result.stats as any).h2hSynced}`)
        console.log(`  H2H failed: ${(result.stats as any).h2hFailed}`)
      }
      
      if ('rivalDataSkipped' in result.stats && (result.stats as any).rivalDataSkipped) {
        console.log('  ℹ️  Rival data sync was skipped (within TTL)')
      }

      if ('h2hDataSkipped' in result.stats && (result.stats as any).h2hDataSkipped) {
        console.log('  ℹ️  H2H data sync was skipped (within TTL)')
      }
      
      const duration = result.stats.endTime ? (result.stats.endTime - result.stats.startTime) / 1000 : 'N/A'
      console.log(`  Duration: ${duration}s`)
    }
    
    if (result.stats && result.stats.failed > 0) {
      console.log(`\n⚠️  ${result.stats.failed} items failed to sync`)
      result.stats.errors.slice(0, 3).forEach(error => {
        console.log(`  • ${error.error}`)
      })
      if (result.stats.errors.length > 3) {
        console.log(`  ... and ${result.stats.errors.length - 3} more errors`)
      }
    }
    
    // Check sync metadata status
    console.log('\n=== Checking Sync Metadata ===')
    const syncMetadata = await payload.find({
      collection: 'sync-metadata',
      limit: 10
    })
    
    if (syncMetadata.docs.length > 0) {
      console.log('Current sync metadata:')
      syncMetadata.docs.forEach((doc: any) => {
        const lastSync = new Date(doc.lastSyncAt)
        const daysSince = Math.round((Date.now() - lastSync.getTime()) / (1000 * 60 * 60 * 24))
        console.log(`  - ${doc.syncType}: Last synced ${daysSince} days ago (TTL: ${doc.ttlDays} days)`)
      })
    } else {
      console.log('No sync metadata found')
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
  console.log('=== END OF RIVALS & H2H SYNC ===')
}

// Handle CLI execution
syncRivals()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

export { syncRivals }