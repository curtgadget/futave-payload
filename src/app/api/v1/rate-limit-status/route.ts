import { NextResponse } from 'next/server'
import { entityRateLimiter } from '@/services/sportmonks/client/entityRateLimit'

export async function GET() {
  try {
    const status = entityRateLimiter.getStatus()
    
    // Calculate summary statistics
    const totalUsed = Object.values(status).reduce((sum, entity) => sum + entity.used, 0)
    const totalRemaining = Object.values(status).reduce((sum, entity) => sum + entity.remaining, 0)
    const maxUsed = Math.max(...Object.values(status).map(entity => entity.used))
    const minRemaining = Math.min(...Object.values(status).map(entity => entity.remaining))
    
    // Find entities at risk (< 100 calls remaining)
    const entitiesAtRisk = Object.entries(status)
      .filter(([_, data]) => data.remaining < 100)
      .map(([entity, data]) => ({ entity, ...data }))
    
    // Find most used entities
    const mostUsedEntities = Object.entries(status)
      .sort(([_, a], [__, b]) => b.used - a.used)
      .slice(0, 5)
      .map(([entity, data]) => ({ entity, ...data }))
    
    const response = {
      timestamp: new Date().toISOString(),
      summary: {
        totalUsed,
        totalRemaining: totalRemaining,
        maxUsedByEntity: maxUsed,
        minRemainingByEntity: minRemaining,
        entitiesAtRisk: entitiesAtRisk.length,
        healthStatus: entitiesAtRisk.length === 0 ? 'good' : 
                     entitiesAtRisk.length < 3 ? 'warning' : 'critical'
      },
      entities: status,
      insights: {
        entitiesAtRisk,
        mostUsedEntities,
        recommendations: generateRecommendations(status, entitiesAtRisk)
      }
    }
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('Failed to get rate limit status:', error)
    return NextResponse.json(
      { error: 'Failed to get rate limit status' },
      { status: 500 }
    )
  }
}

function generateRecommendations(
  status: any, 
  entitiesAtRisk: any[]
): string[] {
  const recommendations: string[] = []
  
  if (entitiesAtRisk.length > 0) {
    recommendations.push(
      `⚠️ ${entitiesAtRisk.length} entities are at risk (< 100 calls remaining). ` +
      `Consider postponing non-critical syncs for: ${entitiesAtRisk.map(e => e.entity).join(', ')}`
    )
  }
  
  const highUsageEntities = Object.entries(status)
    .filter(([_, data]) => (data as any).used > 2500)
    .map(([entity]) => entity)
    
  if (highUsageEntities.length > 0) {
    recommendations.push(
      `📊 High usage detected for: ${highUsageEntities.join(', ')}. ` +
      `Monitor these entities closely to avoid hitting limits.`
    )
  }
  
  const shortResetTimes = Object.entries(status)
    .filter(([_, data]) => (data as any).resetsIn < 300) // Less than 5 minutes
    .map(([entity, data]) => `${entity} (${(data as any).resetsIn}s)`)
    
  if (shortResetTimes.length > 0) {
    recommendations.push(
      `⏰ Some entities reset soon: ${shortResetTimes.join(', ')}. ` +
      `Consider timing your next sync operations accordingly.`
    )
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ All rate limits are healthy. Safe to proceed with sync operations.')
  }
  
  return recommendations
}