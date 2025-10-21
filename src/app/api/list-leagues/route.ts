/**
 * List Leagues API
 * 
 * Simple endpoint to list all leagues with their IDs for debugging
 * 
 * GET /api/list-leagues - List all leagues with ID, name, and current featured status
 */

import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET(request: Request) {
  try {
    const payload = await getPayload({ config })
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const search = url.searchParams.get('search')
    
    const query: any = {}
    
    // Add search filter if provided
    if (search) {
      query.name = { contains: search }
    }
    
    // Get leagues with minimal data
    const leagues = await payload.find({
      collection: 'leagues',
      where: query,
      sort: 'name',
      limit
    })
    
    // Also get total count and some debug info
    const totalCount = await payload.db.connection.collection('leagues').countDocuments()
    const featuredCount = await payload.db.connection.collection('leagues').countDocuments({ featured: true })
    
    // Get sample from direct MongoDB to debug ID structure
    const mongoSample = await payload.db.connection.collection('leagues').find({}, { 
      projection: { _id: 1, id: 1, name: 1, featured: 1 } 
    }).limit(3).toArray()
    
    return Response.json({
      success: true,
      total_leagues: totalCount,
      featured_count: featuredCount,
      showing: leagues.docs.length,
      debug: {
        mongo_sample: mongoSample,
        query_used: query
      },
      leagues: leagues.docs.map(league => ({
        id: league.id,
        name: league.name,
        featured: league.featured || false,
        priority: league.priority || 0,
        tier: league.tier || 'unknown',
        country_id: league.country_id || null
      }))
    })
    
  } catch (error) {
    console.error('Error listing leagues:', error)
    return Response.json(
      { success: false, error: 'Failed to list leagues' },
      { status: 500 }
    )
  }
}