/**
 * League Priorities Initialization Endpoint
 * 
 * This endpoint initializes league priorities for testing and development.
 * It's designed to be run once to set up reasonable defaults for the 
 * limited trial API data we have.
 * 
 * GET /api/init-league-priorities
 */

import { getPayload } from 'payload'
import config from '@payload-config'
import { initializeLeaguePriorities } from '@/app/api/v1/utils/leaguePrioritization'

export async function GET() {
  try {
    const payload = await getPayload({ config })
    
    // Initialize league priorities
    await initializeLeaguePriorities(payload)
    
    return Response.json({ 
      success: true, 
      message: 'League priorities initialized successfully',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error initializing league priorities:', error)
    return Response.json(
      { 
        success: false, 
        error: 'Failed to initialize league priorities',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}