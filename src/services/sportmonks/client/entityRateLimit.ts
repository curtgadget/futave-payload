import pLimit from 'p-limit'

// Entity types as defined by Sportmonks API
export type SportmonksEntity = 
  | 'leagues'
  | 'teams' 
  | 'players'
  | 'coaches'
  | 'referees'
  | 'fixtures'
  | 'livescores'
  | 'standings'
  | 'topscorers'
  | 'venues'
  | 'rounds'
  | 'stages'
  | 'seasons'
  | 'schedules'
  | 'tv-stations'
  | 'countries'
  | 'continents'
  | 'types'
  | 'states'
  | 'cities'
  | 'regions'

interface RateLimitInfo {
  remaining: number
  resetsAt: number // Unix timestamp
  total: number
  entity: SportmonksEntity
}

interface EntityRateLimit {
  count: number
  windowStart: number
  lastReset: number
}

export class EntityRateLimiter {
  private limits: Map<SportmonksEntity, EntityRateLimit> = new Map()
  private readonly maxRequestsPerHour = 3000
  private readonly windowDuration = 60 * 60 * 1000 // 1 hour in ms
  private concurrencyLimiter = pLimit(10) // Max 10 concurrent requests
  
  constructor() {
    // Initialize all entities with zero counts
    this.resetAllLimits()
  }

  private resetAllLimits() {
    const now = Date.now()
    const entities: SportmonksEntity[] = [
      'leagues', 'teams', 'players', 'coaches', 'referees',
      'fixtures', 'livescores', 'standings', 'topscorers',
      'venues', 'rounds', 'stages', 'seasons', 'schedules',
      'tv-stations', 'countries', 'continents', 'types',
      'states', 'cities', 'regions'
    ]
    
    entities.forEach(entity => {
      this.limits.set(entity, {
        count: 0,
        windowStart: now,
        lastReset: now
      })
    })
  }

  private getEntityFromEndpoint(endpoint: string): SportmonksEntity {
    // Extract entity from endpoint URL
    const match = endpoint.match(/^\/([^/?]+)/)
    if (!match) return 'fixtures' // Default fallback
    
    const path = match[1]
    
    // Map API paths to entities
    const pathToEntity: Record<string, SportmonksEntity> = {
      'fixtures': 'fixtures',
      'livescores': 'livescores',
      'leagues': 'leagues',
      'teams': 'teams',
      'players': 'players',
      'coaches': 'coaches',
      'referees': 'referees',
      'standings': 'standings',
      'topscorers': 'topscorers',
      'venues': 'venues',
      'rounds': 'rounds',
      'stages': 'stages',
      'seasons': 'seasons',
      'schedules': 'schedules',
      'tv-stations': 'tv-stations',
      'countries': 'countries',
      'continents': 'continents',
      'types': 'types',
      'states': 'states',
      'cities': 'cities',
      'regions': 'regions'
    }
    
    return pathToEntity[path] || 'fixtures'
  }

  private checkAndUpdateLimit(entity: SportmonksEntity): { allowed: boolean; waitTime?: number } {
    const now = Date.now()
    const limit = this.limits.get(entity) || { count: 0, windowStart: now, lastReset: now }
    
    // Check if window has expired
    if (now - limit.windowStart >= this.windowDuration) {
      // Reset the window
      limit.count = 0
      limit.windowStart = now
      limit.lastReset = now
    }
    
    // Check if we're at the limit
    if (limit.count >= this.maxRequestsPerHour) {
      // Calculate wait time until window resets
      const waitTime = this.windowDuration - (now - limit.windowStart)
      return { allowed: false, waitTime }
    }
    
    // Increment count and allow request
    limit.count++
    this.limits.set(entity, limit)
    
    return { allowed: true }
  }

  async executeWithEntityLimit<T>(
    endpoint: string,
    fetchFn: () => Promise<T>,
    context: string = 'API request'
  ): Promise<T> {
    const entity = this.getEntityFromEndpoint(endpoint)
    
    return this.concurrencyLimiter(async () => {
      // Check rate limit for this entity
      const { allowed, waitTime } = this.checkAndUpdateLimit(entity)
      
      if (!allowed && waitTime) {
        console.warn(
          `Rate limit reached for entity '${entity}'. ` +
          `Waiting ${Math.ceil(waitTime / 1000)}s before retry. ` +
          `Context: ${context}`
        )
        
        // Wait for the window to reset
        await this.sleep(waitTime)
        
        // Recheck after waiting
        const recheckResult = this.checkAndUpdateLimit(entity)
        if (!recheckResult.allowed) {
          throw new Error(`Rate limit still exceeded for entity '${entity}' after waiting`)
        }
      }
      
      try {
        const result = await fetchFn()
        
        // Log current usage
        const limit = this.limits.get(entity)!
        const remaining = this.maxRequestsPerHour - limit.count
        const resetsIn = Math.ceil((this.windowDuration - (Date.now() - limit.windowStart)) / 1000)
        
        console.log(
          `[${entity}] API call completed. ` +
          `${remaining}/${this.maxRequestsPerHour} calls remaining. ` +
          `Resets in ${resetsIn}s. ` +
          `Context: ${context}`
        )
        
        return result
      } catch (error) {
        // Don't count failed requests against the limit
        const limit = this.limits.get(entity)!
        limit.count = Math.max(0, limit.count - 1)
        this.limits.set(entity, limit)
        
        throw error
      }
    })
  }

  updateFromApiResponse(endpoint: string, rateLimitInfo: RateLimitInfo) {
    const entity = this.getEntityFromEndpoint(endpoint)
    const limit = this.limits.get(entity)!
    
    // Update our tracking based on actual API response
    const apiRemaining = rateLimitInfo.remaining
    const apiUsed = this.maxRequestsPerHour - apiRemaining
    
    // Sync our count with the API's count
    if (apiUsed > limit.count) {
      console.warn(
        `[${entity}] Local count (${limit.count}) differs from API count (${apiUsed}). ` +
        `Syncing to API value.`
      )
      limit.count = apiUsed
    }
    
    // Update reset time if provided
    if (rateLimitInfo.resetsAt) {
      const newWindowStart = rateLimitInfo.resetsAt * 1000 - this.windowDuration
      if (newWindowStart > limit.windowStart) {
        limit.windowStart = newWindowStart
      }
    }
    
    this.limits.set(entity, limit)
  }

  getStatus(): Record<SportmonksEntity, { used: number; remaining: number; resetsIn: number }> {
    const now = Date.now()
    const status: any = {}
    
    this.limits.forEach((limit, entity) => {
      const remaining = Math.max(0, this.maxRequestsPerHour - limit.count)
      const resetsIn = Math.max(0, Math.ceil((this.windowDuration - (now - limit.windowStart)) / 1000))
      
      status[entity] = {
        used: limit.count,
        remaining,
        resetsIn
      }
    })
    
    return status
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Singleton instance
export const entityRateLimiter = new EntityRateLimiter()