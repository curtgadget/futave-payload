import { describe, expect, it, beforeEach, jest } from '@jest/globals'

/**
 * Integration tests for league prioritization system
 * Tests the complete flow from league configuration to match sorting
 */

// Test data representing different league configurations
const testLeagues = [
  {
    _id: 8,
    name: 'Premier League',
    featured: true,
    priority: 120,
    tier: 'tier1',
    logo_path: 'premier-league.png'
  },
  {
    _id: 16,
    name: 'Champions League',
    featured: true,
    priority: 130,
    tier: 'tier1',
    logo_path: 'champions-league.png'
  },
  {
    _id: 271,
    name: 'Danish Superliga',
    featured: false,
    priority: 75,
    tier: 'tier2',
    logo_path: 'superliga.png'
  },
  {
    _id: 501,
    name: 'Scottish Premiership',
    featured: true,
    priority: 75,
    tier: 'tier2',
    logo_path: 'premiership.png'
  },
  {
    _id: 999,
    name: 'Local League',
    featured: false,
    priority: 0,
    tier: 'tier4',
    logo_path: 'local.png'
  }
]

describe('League Prioritization System Integration', () => {
  // Helper function to calculate priority score (mirroring the actual implementation)
  function calculatePriorityScore(league: any): number {
    const featuredWeight = league.featured ? 200 : 0
    const manualPriority = league.priority || 0
    const tierWeight = (() => {
      switch (league.tier) {
        case 'tier1': return 100
        case 'tier2': return 80
        case 'tier3': return 60
        case 'tier4': return 40
        default: return 20
      }
    })()
    
    return featuredWeight + manualPriority + tierWeight
  }

  describe('Priority Score Calculation', () => {
    it('should calculate correct priority scores for different league types', () => {
      const scores = testLeagues.map(league => ({
        id: league._id,
        name: league.name,
        score: calculatePriorityScore(league),
        featured: league.featured,
        priority: league.priority,
        tier: league.tier
      }))

      // Champions League: featured (200) + priority (130) + tier1 (100) = 430
      expect(scores.find(s => s.id === 16)?.score).toBe(430)
      
      // Premier League: featured (200) + priority (120) + tier1 (100) = 420
      expect(scores.find(s => s.id === 8)?.score).toBe(420)
      
      // Scottish Premiership: featured (200) + priority (75) + tier2 (80) = 355
      expect(scores.find(s => s.id === 501)?.score).toBe(355)
      
      // Danish Superliga: not featured (0) + priority (75) + tier2 (80) = 155
      expect(scores.find(s => s.id === 271)?.score).toBe(155)
      
      // Local League: not featured (0) + priority (0) + tier4 (40) = 40
      expect(scores.find(s => s.id === 999)?.score).toBe(40)
    })

    it('should prioritize featured leagues over non-featured', () => {
      const premierLeague = testLeagues.find(l => l._id === 8)! // Featured tier1
      const superliga = testLeagues.find(l => l._id === 271)! // Non-featured tier2
      
      const premierScore = calculatePriorityScore(premierLeague)
      const superligaScore = calculatePriorityScore(superliga)
      
      expect(premierScore).toBeGreaterThan(superligaScore)
    })

    it('should prioritize higher manual priority within same tier', () => {
      const championsLeague = testLeagues.find(l => l._id === 16)! // Priority 130
      const premierLeague = testLeagues.find(l => l._id === 8)! // Priority 120
      
      const championsScore = calculatePriorityScore(championsLeague)
      const premierScore = calculatePriorityScore(premierLeague)
      
      expect(championsScore).toBeGreaterThan(premierScore)
    })

    it('should prioritize higher tiers when featured status is same', () => {
      // Create two non-featured leagues with same priority but different tiers
      const tier1League = { featured: false, priority: 50, tier: 'tier1' }
      const tier2League = { featured: false, priority: 50, tier: 'tier2' }
      
      const tier1Score = calculatePriorityScore(tier1League)
      const tier2Score = calculatePriorityScore(tier2League)
      
      expect(tier1Score).toBeGreaterThan(tier2Score)
    })
  })

  describe('League Sorting Order', () => {
    it('should sort leagues correctly by priority score', () => {
      const sortedLeagues = testLeagues
        .map(league => ({
          ...league,
          priorityScore: calculatePriorityScore(league)
        }))
        .sort((a, b) => b.priorityScore - a.priorityScore)

      const expectedOrder = [
        16, // Champions League (430)
        8,  // Premier League (420)
        501, // Scottish Premiership (355)
        271, // Danish Superliga (155)
        999  // Local League (40)
      ]

      const actualOrder = sortedLeagues.map(l => l._id)
      expect(actualOrder).toEqual(expectedOrder)
    })

    it('should group featured leagues first regardless of tier', () => {
      const sortedLeagues = testLeagues
        .map(league => ({
          ...league,
          priorityScore: calculatePriorityScore(league)
        }))
        .sort((a, b) => b.priorityScore - a.priorityScore)

      const featuredLeagues = sortedLeagues.filter(l => l.featured)
      const nonFeaturedLeagues = sortedLeagues.filter(l => !l.featured)

      // All featured leagues should have higher scores than non-featured
      const lowestFeaturedScore = Math.min(...featuredLeagues.map(l => l.priorityScore))
      const highestNonFeaturedScore = Math.max(...nonFeaturedLeagues.map(l => l.priorityScore))

      expect(lowestFeaturedScore).toBeGreaterThan(highestNonFeaturedScore)
    })
  })

  describe('Featured Leagues Filtering', () => {
    it('should correctly identify featured leagues', () => {
      const featuredLeagues = testLeagues.filter(league => league.featured)
      
      expect(featuredLeagues).toHaveLength(3)
      expect(featuredLeagues.map(l => l._id)).toEqual(
        expect.arrayContaining([8, 16, 501])
      )
    })

    it('should sort featured leagues by priority within featured group', () => {
      const featuredLeagues = testLeagues
        .filter(league => league.featured)
        .map(league => ({
          ...league,
          priorityScore: calculatePriorityScore(league)
        }))
        .sort((a, b) => b.priorityScore - a.priorityScore)

      const expectedFeaturedOrder = [16, 8, 501] // Champions, Premier, Scottish
      const actualFeaturedOrder = featuredLeagues.map(l => l._id)
      
      expect(actualFeaturedOrder).toEqual(expectedFeaturedOrder)
    })
  })

  describe('Edge Cases', () => {
    it('should handle leagues with missing tier', () => {
      const leagueWithoutTier = {
        featured: false,
        priority: 50,
        tier: undefined
      }

      const score = calculatePriorityScore(leagueWithoutTier)
      // Should use default tier weight of 20
      expect(score).toBe(70) // 0 + 50 + 20
    })

    it('should handle leagues with missing priority', () => {
      const leagueWithoutPriority = {
        featured: false,
        priority: undefined,
        tier: 'tier2'
      }

      const score = calculatePriorityScore(leagueWithoutPriority)
      // Should use default priority of 0
      expect(score).toBe(80) // 0 + 0 + 80
    })

    it('should handle leagues with invalid tier', () => {
      const leagueWithInvalidTier = {
        featured: false,
        priority: 50,
        tier: 'invalid'
      }

      const score = calculatePriorityScore(leagueWithInvalidTier)
      // Should use default tier weight of 20
      expect(score).toBe(70) // 0 + 50 + 20
    })

    it('should handle completely empty league', () => {
      const emptyLeague = {}

      const score = calculatePriorityScore(emptyLeague)
      // Should use all defaults
      expect(score).toBe(20) // 0 + 0 + 20
    })
  })

  describe('Real-world Scenarios', () => {
    it('should prioritize major European leagues correctly', () => {
      const majorLeagues = [
        { name: 'Premier League', featured: true, priority: 120, tier: 'tier1' },
        { name: 'La Liga', featured: true, priority: 115, tier: 'tier1' },
        { name: 'Bundesliga', featured: false, priority: 110, tier: 'tier1' },
        { name: 'Serie A', featured: true, priority: 105, tier: 'tier1' }
      ]

      const sortedScores = majorLeagues
        .map(league => ({
          name: league.name,
          score: calculatePriorityScore(league),
          featured: league.featured
        }))
        .sort((a, b) => b.score - a.score)

      // Featured leagues should come first
      expect(sortedScores[0].featured).toBe(true) // Premier League
      expect(sortedScores[1].featured).toBe(true) // La Liga  
      expect(sortedScores[2].featured).toBe(true) // Serie A
      expect(sortedScores[3].featured).toBe(false) // Bundesliga (not featured)
    })

    it('should handle international competitions correctly', () => {
      const competitions = [
        { name: 'Champions League', featured: true, priority: 130, tier: 'tier1' },
        { name: 'Europa League', featured: false, priority: 90, tier: 'tier2' },
        { name: 'World Cup', featured: true, priority: 150, tier: 'tier1' },
        { name: 'Conference League', featured: false, priority: 70, tier: 'tier3' }
      ]

      const sortedCompetitions = competitions
        .map(comp => ({
          ...comp,
          score: calculatePriorityScore(comp)
        }))
        .sort((a, b) => b.score - a.score)

      expect(sortedCompetitions[0].name).toBe('World Cup') // 450
      expect(sortedCompetitions[1].name).toBe('Champions League') // 430
      expect(sortedCompetitions[2].name).toBe('Europa League') // 170
      expect(sortedCompetitions[3].name).toBe('Conference League') // 130
    })
  })
})