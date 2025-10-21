/**
 * Featured Leagues Management API
 * 
 * Lightweight endpoint to manage featured leagues without using the heavy admin UI
 * 
 * GET /api/manage-featured-leagues - List current featured leagues
 * POST /api/manage-featured-leagues - Set featured leagues
 * PATCH /api/manage-featured-leagues - Update specific leagues
 */

import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET() {
  try {
    const payload = await getPayload({ config })
    
    // Get all featured leagues with minimal data using direct MongoDB
    const featuredLeagues = await payload.db.connection.collection('leagues').find(
      { featured: true },
      { 
        projection: { _id: 1, name: 1, featured: 1, priority: 1, tier: 1 },
        sort: { priority: -1 }
      }
    ).toArray()
    
    return Response.json({
      success: true,
      count: featuredLeagues.length,
      featured_leagues: featuredLeagues.map(league => ({
        id: league._id,
        name: league.name,
        priority: league.priority || 0,
        tier: league.tier || 'unknown'
      }))
    })
    
  } catch (error) {
    console.error('Error fetching featured leagues:', error)
    return Response.json(
      { success: false, error: 'Failed to fetch featured leagues' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const payload = await getPayload({ config })
    const body = await request.json()
    
    const { league_ids, clear_existing = true } = body
    
    if (!Array.isArray(league_ids)) {
      return Response.json(
        { success: false, error: 'league_ids must be an array' },
        { status: 400 }
      )
    }
    
    // Convert to numbers to ensure correct type
    const numericLeagueIds = league_ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id))
    
    console.log('Received league_ids:', league_ids)
    console.log('Converted to numeric:', numericLeagueIds)
    
    // Check if leagues exist first
    const existingLeagues = await payload.db.connection.collection('leagues').find(
      { id: { $in: numericLeagueIds } },
      { projection: { id: 1, name: 1, featured: 1 } }
    ).toArray()
    
    console.log('Found existing leagues:', existingLeagues.length)
    console.log('Existing leagues:', existingLeagues)
    
    if (existingLeagues.length === 0) {
      return Response.json({
        success: false,
        error: 'No leagues found with provided IDs',
        provided_ids: numericLeagueIds,
        debug: {
          total_leagues_in_db: await payload.db.connection.collection('leagues').countDocuments(),
          sample_league_ids: await payload.db.connection.collection('leagues').find({}, { projection: { _id: 1, name: 1 } }).limit(5).toArray()
        }
      })
    }
    
    // Clear existing featured leagues if requested
    if (clear_existing) {
      const clearResult = await payload.db.connection.collection('leagues').updateMany(
        { featured: true },
        { $set: { featured: false } }
      )
      console.log('Cleared existing featured leagues:', clearResult.modifiedCount)
    }
    
    // Set new featured leagues using the IDs that actually exist
    const existingIds = existingLeagues.map(league => league._id)
    const result = await payload.db.connection.collection('leagues').updateMany(
      { _id: { $in: existingIds } },
      { $set: { featured: true } }
    )
    
    console.log('Updated leagues result:', result)
    
    // Get updated list using direct MongoDB query since we're using _id
    const updatedLeagues = await payload.db.connection.collection('leagues').find(
      { _id: { $in: existingIds } },
      { projection: { _id: 1, name: 1, featured: 1, priority: 1 } }
    ).toArray()
    
    return Response.json({
      success: true,
      message: `Updated ${result.modifiedCount} leagues`,
      debug: {
        requested_ids: numericLeagueIds,
        found_ids: existingIds,
        cleared_existing: clear_existing
      },
      updated_leagues: updatedLeagues.map(league => ({
        id: league._id,
        name: league.name,
        featured: league.featured,
        priority: league.priority || 0
      }))
    })
    
  } catch (error) {
    console.error('Error setting featured leagues:', error)
    return Response.json(
      { success: false, error: 'Failed to set featured leagues', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = await getPayload({ config })
    const body = await request.json()
    
    const { updates } = body
    
    if (!Array.isArray(updates)) {
      return Response.json(
        { success: false, error: 'updates must be an array of {id, featured, priority}' },
        { status: 400 }
      )
    }
    
    const results = []
    
    // Update each league individually
    for (const update of updates) {
      const { id, featured, priority } = update
      
      if (!id) {
        results.push({ id, success: false, error: 'id is required' })
        continue
      }
      
      const updateFields: any = {}
      if (typeof featured === 'boolean') updateFields.featured = featured
      if (typeof priority === 'number') updateFields.priority = priority
      
      if (Object.keys(updateFields).length === 0) {
        results.push({ id, success: false, error: 'No valid fields to update' })
        continue
      }
      
      try {
        const result = await payload.db.connection.collection('leagues').updateOne(
          { _id: id },
          { $set: updateFields }
        )
        
        results.push({
          id,
          success: result.modifiedCount > 0,
          modified: result.modifiedCount > 0,
          updates: updateFields
        })
      } catch (err) {
        results.push({ id, success: false, error: err instanceof Error ? err.message : 'Update failed' })
      }
    }
    
    return Response.json({
      success: true,
      results
    })
    
  } catch (error) {
    console.error('Error updating leagues:', error)
    return Response.json(
      { success: false, error: 'Failed to update leagues' },
      { status: 500 }
    )
  }
}