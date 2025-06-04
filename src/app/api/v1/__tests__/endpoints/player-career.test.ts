import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals'
import {
  createPlayerRequest,
  executeEndpoint,
  apiTestSetup,
  playerEndpointAssertions,
  mockPlayerDataFetcher,
  mockPlayerData,
  APIResponse,
} from '../../test-helpers/apiTestFramework'

// Import the endpoint after mocks are set up
import playerEndpoint from '../../players'

describe('Player Career API Endpoint', () => {
  beforeEach(() => {
    apiTestSetup.beforeEach()
  })

  afterEach(() => {
    apiTestSetup.afterEach()
  })

  describe('GET /api/v1/player/:id?tab=career', () => {
    it('should return player career data successfully', async () => {
      // Setup mock data
      const playerId = '999'
      mockPlayerDataFetcher.getCareer.mockResolvedValue(mockPlayerData.career)

      const request = createPlayerRequest(playerId, { queryParams: { tab: 'career' } })
      const response = await executeEndpoint(playerEndpoint, request)

      // Verify response structure
      response.expectStatus(200).expectSuccess()
      playerEndpointAssertions.assertCareerResponse(response)

      // Verify specific data
      expect(response.data.id).toBe(playerId)
      expect(response.data.name).toBe('Cristiano Ronaldo')
      expect(response.data.position).toBe('Forward')
      expect(response.data.nationality).toBe('Portugal')
      
      // Verify career items
      expect(response.data.career).toHaveLength(2)
      
      // Verify first career item (current team)
      const currentTeam = response.data.career[0]
      expect(currentTeam.team.name).toBe('Al Nassr')
      expect(currentTeam.league.name).toBe('Saudi Pro League')
      expect(currentTeam.season.name).toBe('2023-24')
      expect(currentTeam.start_date).toBe('2023-01-01')
      expect(currentTeam.end_date).toBeNull()
      expect(currentTeam.goals).toBe(35)
      expect(currentTeam.assists).toBe(11)
      expect(currentTeam.rating).toBe(8.2)
      
      // Verify second career item (previous team)
      const previousTeam = response.data.career[1]
      expect(previousTeam.team.name).toBe('Manchester United')
      expect(previousTeam.league.name).toBe('Premier League')
      expect(previousTeam.season.name).toBe('2022-23')
      expect(previousTeam.start_date).toBe('2022-07-01')
      expect(previousTeam.end_date).toBe('2022-12-31')
      expect(previousTeam.goals).toBe(3)
      expect(previousTeam.assists).toBe(2)
      expect(previousTeam.rating).toBe(6.8)
    })

    it('should handle extensive career history', async () => {
      const playerId = '999'
      
      const extensiveCareerData = {
        ...mockPlayerData.career,
        career: [
          ...mockPlayerData.career.career,
          {
            team: { id: '1', name: 'Real Madrid', logo: 'https://example.com/rm.png' },
            league: { id: '564', name: 'La Liga', logo: 'https://example.com/laliga.png', country: 'Spain' },
            season: { id: '18', name: '2017-18' },
            start_date: '2009-07-01',
            end_date: '2018-06-30',
            appearances: 438,
            starts: 415,
            goals: 450,
            assists: 131,
            minutes_played: 37000,
            rating: 8.9
          },
          {
            team: { id: '85', name: 'Juventus', logo: 'https://example.com/juve.png' },
            league: { id: '384', name: 'Serie A', logo: 'https://example.com/seriea.png', country: 'Italy' },
            season: { id: '19', name: '2018-19' },
            start_date: '2018-07-01',
            end_date: '2021-06-30',
            appearances: 134,
            starts: 130,
            goals: 101,
            assists: 22,
            minutes_played: 11500,
            rating: 8.1
          },
          {
            team: { id: '129', name: 'Sporting CP', logo: 'https://example.com/sporting.png' },
            league: { id: '462', name: 'Primeira Liga', logo: 'https://example.com/liga.png', country: 'Portugal' },
            season: { id: '3', name: '2002-03' },
            start_date: '2002-08-01',
            end_date: '2003-06-30',
            appearances: 31,
            starts: 25,
            goals: 5,
            assists: 6,
            minutes_played: 2200,
            rating: 7.2
          }
        ]
      }

      mockPlayerDataFetcher.getCareer.mockResolvedValue(extensiveCareerData)

      const request = createPlayerRequest(playerId, { queryParams: { tab: 'career' } })
      const response = await executeEndpoint(playerEndpoint, request)

      response.expectStatus(200).expectSuccess()
      expect(response.data.career).toHaveLength(5)
      
      // Verify all teams are present
      const teamNames = response.data.career.map((c: any) => c.team.name)
      expect(teamNames).toContain('Al Nassr')
      expect(teamNames).toContain('Manchester United')
      expect(teamNames).toContain('Real Madrid')
      expect(teamNames).toContain('Juventus')
      expect(teamNames).toContain('Sporting CP')
      
      // Verify career statistics accumulation
      const totalGoals = response.data.career.reduce((sum: number, c: any) => sum + (c.goals || 0), 0)
      expect(totalGoals).toBe(594) // 35 + 3 + 450 + 101 + 5
    })

    it('should handle player with no career history', async () => {
      const playerId = '456'
      
      mockPlayerDataFetcher.getCareer.mockResolvedValue({
        id: playerId,
        name: 'Young Player',
        position: 'Midfielder',
        nationality: 'Test Country',
        career: []
      })

      const request = createPlayerRequest(playerId, { queryParams: { tab: 'career' } })
      const response = await executeEndpoint(playerEndpoint, request)

      response.expectStatus(200).expectSuccess()
      playerEndpointAssertions.assertCareerResponse(response)
      
      expect(response.data.career).toEqual([])
    })

    it('should handle career with loan spells', async () => {
      const playerId = '999'
      
      const careerWithLoans = {
        ...mockPlayerData.career,
        career: [
          {
            team: { id: '50', name: 'Parent Club', logo: 'https://example.com/parent.png' },
            league: { id: '955', name: 'League A', logo: 'https://example.com/leaguea.png', country: 'Country A' },
            season: { id: '20', name: '2023-24' },
            start_date: '2023-07-01',
            end_date: null,
            appearances: 20,
            starts: 18,
            goals: 10,
            assists: 5,
            minutes_played: 1600,
            rating: 7.5
          },
          {
            team: { id: '60', name: 'Loan Club', logo: 'https://example.com/loan.png' },
            league: { id: '956', name: 'League B', logo: 'https://example.com/leagueb.png', country: 'Country B' },
            season: { id: '20', name: '2023-24' }, // Same season, different team (loan)
            start_date: '2024-01-01',
            end_date: '2024-06-30',
            appearances: 15,
            starts: 14,
            goals: 8,
            assists: 3,
            minutes_played: 1200,
            rating: 7.8
          }
        ]
      }

      mockPlayerDataFetcher.getCareer.mockResolvedValue(careerWithLoans)

      const request = createPlayerRequest(playerId, { queryParams: { tab: 'career' } })
      const response = await executeEndpoint(playerEndpoint, request)

      response.expectStatus(200).expectSuccess()
      
      // Verify both entries for the same season
      const season2024 = response.data.career.filter((c: any) => c.season.name === '2023-24')
      expect(season2024).toHaveLength(2)
      expect(season2024[0].team.name).toBe('Parent Club')
      expect(season2024[1].team.name).toBe('Loan Club')
    })

    it('should handle career with partial data', async () => {
      const playerId = '999'
      
      const partialCareerData = {
        id: playerId,
        name: 'Test Player',
        position: 'Defender',
        nationality: 'Test Country',
        career: [{
          team: { id: '50', name: 'Test Team', logo: undefined },
          league: { id: '955', name: 'Test League', logo: undefined, country: undefined },
          season: { id: '20', name: '2023-24' },
          start_date: '2023-07-01',
          end_date: undefined,
          appearances: 10,
          starts: undefined,
          goals: undefined,
          assists: undefined,
          minutes_played: undefined,
          rating: undefined
        }]
      }

      mockPlayerDataFetcher.getCareer.mockResolvedValue(partialCareerData)

      const request = createPlayerRequest(playerId, { queryParams: { tab: 'career' } })
      const response = await executeEndpoint(playerEndpoint, request)

      response.expectStatus(200).expectSuccess()
      
      const careerItem = response.data.career[0]
      expect(careerItem.team.name).toBe('Test Team')
      expect(careerItem.team.logo).toBeUndefined()
      expect(careerItem.league.country).toBeUndefined()
      expect(careerItem.appearances).toBe(10)
      expect(careerItem.starts).toBeUndefined()
      expect(careerItem.goals).toBeUndefined()
      expect(careerItem.assists).toBeUndefined()
      expect(careerItem.minutes_played).toBeUndefined()
      expect(careerItem.rating).toBeUndefined()
    })

    it('should handle career spanning multiple decades', async () => {
      const playerId = '999'
      
      const longCareerData = {
        ...mockPlayerData.career,
        career: [
          {
            team: { id: '1', name: 'Current Team', logo: 'https://example.com/current.png' },
            league: { id: '564', name: 'Top League', logo: 'https://example.com/top.png', country: 'Country' },
            season: { id: '24', name: '2023-24' },
            start_date: '2023-07-01',
            end_date: null,
            appearances: 30,
            starts: 28,
            goals: 5,
            assists: 2,
            minutes_played: 2500,
            rating: 7.0
          },
          {
            team: { id: '2', name: 'Mid Career Team', logo: 'https://example.com/mid.png' },
            league: { id: '565', name: 'Another League', logo: 'https://example.com/another.png', country: 'Another Country' },
            season: { id: '14', name: '2013-14' },
            start_date: '2013-07-01',
            end_date: '2018-06-30',
            appearances: 200,
            starts: 190,
            goals: 80,
            assists: 40,
            minutes_played: 17000,
            rating: 8.0
          },
          {
            team: { id: '3', name: 'First Professional Team', logo: 'https://example.com/first.png' },
            league: { id: '566', name: 'Starting League', logo: 'https://example.com/start.png', country: 'Home Country' },
            season: { id: '04', name: '2003-04' },
            start_date: '2003-07-01',
            end_date: '2013-06-30',
            appearances: 350,
            starts: 300,
            goals: 120,
            assists: 60,
            minutes_played: 27000,
            rating: 7.5
          }
        ]
      }

      mockPlayerDataFetcher.getCareer.mockResolvedValue(longCareerData)

      const request = createPlayerRequest(playerId, { queryParams: { tab: 'career' } })
      const response = await executeEndpoint(playerEndpoint, request)

      response.expectStatus(200).expectSuccess()
      
      // Calculate career totals
      const totalAppearances = response.data.career.reduce((sum: number, c: any) => sum + (c.appearances || 0), 0)
      const totalGoals = response.data.career.reduce((sum: number, c: any) => sum + (c.goals || 0), 0)
      const totalMinutes = response.data.career.reduce((sum: number, c: any) => sum + (c.minutes_played || 0), 0)
      
      expect(totalAppearances).toBe(580) // 30 + 200 + 350
      expect(totalGoals).toBe(205) // 5 + 80 + 120
      expect(totalMinutes).toBe(46500) // 2500 + 17000 + 27000
    })

    it('should handle international career (national team)', async () => {
      const playerId = '999'
      
      const internationalCareerData = {
        ...mockPlayerData.career,
        career: [
          {
            team: { id: '1001', name: 'Portugal', logo: 'https://example.com/portugal.png' },
            league: { id: '1500', name: 'International', logo: 'https://example.com/fifa.png', country: 'International' },
            season: { id: 'intl', name: '2003-2024' },
            start_date: '2003-08-20',
            end_date: null,
            appearances: 205,
            starts: 200,
            goals: 128,
            assists: 45,
            minutes_played: 18000,
            rating: 8.5
          },
          ...mockPlayerData.career.career
        ]
      }

      mockPlayerDataFetcher.getCareer.mockResolvedValue(internationalCareerData)

      const request = createPlayerRequest(playerId, { queryParams: { tab: 'career' } })
      const response = await executeEndpoint(playerEndpoint, request)

      response.expectStatus(200).expectSuccess()
      
      // Find international career
      const internationalCareer = response.data.career.find((c: any) => c.team.name === 'Portugal')
      expect(internationalCareer).toBeDefined()
      expect(internationalCareer.league.name).toBe('International')
      expect(internationalCareer.appearances).toBe(205)
      expect(internationalCareer.goals).toBe(128)
    })
  })
})