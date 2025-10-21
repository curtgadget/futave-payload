/**
 * League Prioritization Utilities
 * 
 * This module provides utilities for configuring and managing league priorities
 * in the matches listing system. It's designed to work with both manual admin
 * configuration and automatic defaults based on league characteristics.
 */

import type { Payload } from 'payload'

// Default league priorities based on common football league tiers
export const DEFAULT_LEAGUE_PRIORITIES = {
  // Tier 1 - Top European Leagues (100-120 range)
  'Premier League': { priority: 120, tier: 'tier1', featured: true },
  'La Liga': { priority: 115, tier: 'tier1', featured: true },
  'Serie A': { priority: 115, tier: 'tier1', featured: true },
  'Bundesliga': { priority: 115, tier: 'tier1', featured: true },
  'Ligue 1': { priority: 110, tier: 'tier1', featured: true },
  
  // International Competitions (90-105 range)
  'Champions League': { priority: 130, tier: 'tier1', featured: true },
  'Europa League': { priority: 105, tier: 'tier2', featured: true },
  'Europa Conference League': { priority: 100, tier: 'tier2', featured: true },
  'World Cup': { priority: 150, tier: 'tier1', featured: true },
  'European Championship': { priority: 145, tier: 'tier1', featured: true },
  
  // Tier 2 - Major European Leagues (70-90 range)
  'Eredivisie': { priority: 85, tier: 'tier2', featured: false },
  'Primeira Liga': { priority: 85, tier: 'tier2', featured: false },
  'Scottish Premier League': { priority: 80, tier: 'tier2', featured: false },
  'Superliga': { priority: 75, tier: 'tier2', featured: false }, // Danish
  'Premiership': { priority: 75, tier: 'tier2', featured: false }, // Scottish
  
  // Tier 3 - Other competitions (40-70 range)
  'Championship': { priority: 65, tier: 'tier3', featured: false },
  'Premiership Play-Offs': { priority: 60, tier: 'tier3', featured: false },
  
  // Default fallback
  'default': { priority: 0, tier: 'tier4', featured: false }
} as const

// Configuration for testing with limited trial data
export const TRIAL_API_LEAGUE_CONFIG = {
  // Based on the leagues we found in the MongoDB data
  271: { // Superliga (Danish)
    priority: 75,
    tier: 'tier2',
    featured: false
  },
  513: { // Premiership Play-Offs (Scottish)  
    priority: 60,
    tier: 'tier3',
    featured: false
  },
  501: { // Premiership (Scottish)
    priority: 75,
    tier: 'tier2',
    featured: false
  }
} as const

/**
 * Initialize league priorities for existing leagues in the database
 * This function can be called during setup to apply default priorities
 */
export async function initializeLeaguePriorities(payload: Payload): Promise<void> {
  try {
    console.log('Initializing league priorities...')
    
    // Get all leagues that don't have priority set
    const leagues = await payload.find({
      collection: 'leagues',
      where: {
        or: [
          { priority: { equals: null } },
          { priority: { equals: 0 } },
          { tier: { equals: null } }
        ]
      },
      limit: 1000
    })
    
    console.log(`Found ${leagues.docs.length} leagues to update`)
    
    for (const league of leagues.docs) {
      const leagueId = league.id
      const leagueName = league.name
      
      // Check if we have specific config for this league ID (trial API)
      const trialConfig = TRIAL_API_LEAGUE_CONFIG[leagueId as keyof typeof TRIAL_API_LEAGUE_CONFIG]
      
      let config = { priority: 0, tier: 'tier4', featured: false }
      
      if (trialConfig) {
        config = trialConfig
      } else {
        // Try to match by name
        const nameMatch = Object.entries(DEFAULT_LEAGUE_PRIORITIES)
          .find(([name]) => leagueName.toLowerCase().includes(name.toLowerCase()))
        
        if (nameMatch) {
          config = nameMatch[1]
        } else {
          config = DEFAULT_LEAGUE_PRIORITIES.default
        }
      }
      
      // Update the league
      await payload.update({
        collection: 'leagues',
        id: leagueId,
        data: {
          priority: config.priority,
          tier: config.tier as "tier1" | "tier2" | "tier3" | "tier4",
          featured: config.featured
        }
      })
      
      console.log(`Updated league ${leagueName} (${leagueId}): priority=${config.priority}, tier=${config.tier}, featured=${config.featured}`)
    }
    
    console.log('League priorities initialization complete')
    
  } catch (error) {
    console.error('Error initializing league priorities:', error)
    throw error
  }
}

/**
 * Get league priority score for sorting
 * Combines multiple factors into a single sortable score
 */
export function calculateLeaguePriorityScore(league: {
  priority?: number
  tier?: string
  featured?: boolean
}): number {
  const basePriority = league.priority || 0
  
  const tierWeight = (() => {
    switch (league.tier) {
      case 'tier1': return 100
      case 'tier2': return 80
      case 'tier3': return 60
      case 'tier4': return 40
      default: return 20
    }
  })()
  
  const featuredWeight = league.featured ? 200 : 0
  
  return featuredWeight + basePriority + tierWeight
}

/**
 * Helper to determine if a league should be featured in match listings
 */
export function shouldFeatureLeague(league: {
  priority?: number
  tier?: string
  featured?: boolean
}): boolean {
  return (
    league.featured === true ||
    (league.priority && league.priority >= 100) ||
    league.tier === 'tier1'
  )
}

/**
 * Get recommended priority for a league based on its characteristics
 */
export function getRecommendedPriority(league: {
  name: string
  country_id?: number
  league_type?: string
}): { priority: number; tier: string; featured: boolean } {
  const leagueName = league.name.toLowerCase()
  
  // Check for exact matches first
  const exactMatch = Object.entries(DEFAULT_LEAGUE_PRIORITIES)
    .find(([name]) => leagueName.includes(name.toLowerCase()))
  
  if (exactMatch) {
    return exactMatch[1]
  }
  
  // Use heuristics based on league name patterns
  if (leagueName.includes('champions') || leagueName.includes('world cup')) {
    return { priority: 130, tier: 'tier1', featured: true }
  }
  
  if (leagueName.includes('europa') || leagueName.includes('international')) {
    return { priority: 100, tier: 'tier2', featured: true }
  }
  
  if (leagueName.includes('premier') || leagueName.includes('primera')) {
    return { priority: 85, tier: 'tier2', featured: false }
  }
  
  if (leagueName.includes('championship') || leagueName.includes('play')) {
    return { priority: 60, tier: 'tier3', featured: false }
  }
  
  // Default
  return DEFAULT_LEAGUE_PRIORITIES.default
}

export default {
  DEFAULT_LEAGUE_PRIORITIES,
  TRIAL_API_LEAGUE_CONFIG,
  initializeLeaguePriorities,
  calculateLeaguePriorityScore,
  shouldFeatureLeague,
  getRecommendedPriority
}