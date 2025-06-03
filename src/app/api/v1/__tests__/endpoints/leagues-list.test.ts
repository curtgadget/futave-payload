import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals'
import {
  createLeagueRequest,
  executeEndpoint,
  apiTestSetup,
  leagueEndpointAssertions,
  mockLeagueListDataFetcher,
  mockLeagueData,
} from '../../test-helpers/apiTestFramework'

// Import the endpoint after mocks are set up
import leaguesListEndpoint from '../../leaguesList'

describe('Leagues List API Endpoint', () => {
  beforeEach(() => {
    apiTestSetup.beforeEach()
  })

  afterEach(() => {
    apiTestSetup.afterEach()
  })

  describe('GET /api/v1/league', () => {
    it('should have correct endpoint configuration', () => {
      expect(leaguesListEndpoint.path).toBe('/v1/league')
      expect(leaguesListEndpoint.method).toBe('get')
      expect(typeof leaguesListEndpoint.handler).toBe('function')
    })

    it('should return leagues list data successfully with default parameters', async () => {
      const mockLeaguesListData = {
        data: [
          {
            id: '8',
            name: 'Premier League',
            logo: 'https://example.com/premier-league-logo.png',
            country: {
              id: '1',
              name: 'England',
              flag: 'https://example.com/england-flag.png'
            },
            current_season: {
              id: '20',
              name: '2023-24'
            }
          },
          {
            id: '11',
            name: 'La Liga',
            logo: 'https://example.com/la-liga-logo.png',
            country: {
              id: '2',
              name: 'Spain',
              flag: 'https://example.com/spain-flag.png'
            },
            current_season: {
              id: '20',
              name: '2023-24'
            }
          },
          {
            id: '5',
            name: 'Bundesliga',
            logo: 'https://example.com/bundesliga-logo.png',
            country: {
              id: '3',
              name: 'Germany',
              flag: 'https://example.com/germany-flag.png'
            },
            current_season: {
              id: '20',
              name: '2023-24'
            }
          }
        ],
        meta: {
          pagination: {
            page: 1,
            limit: 50,
            totalItems: 3,
            totalPages: 1
          }
        }
      }

      mockLeagueListDataFetcher.getLeagues.mockResolvedValue(mockLeaguesListData)

      const request = createLeagueRequest('', '') // Empty strings for leagues list
      const response = await executeEndpoint(leaguesListEndpoint, request)

      // Verify response structure
      response.expectStatus(200).expectSuccess()
      leagueEndpointAssertions.assertLeaguesListResponse(response)

      // Verify specific data
      expect(response.data.data).toHaveLength(3)
      expect(response.data.meta.pagination.page).toBe(1)
      expect(response.data.meta.pagination.limit).toBe(50)
      expect(response.data.meta.pagination.totalItems).toBe(3)
      expect(response.data.meta.pagination.totalPages).toBe(1)

      // Verify league data
      const premierLeague = response.data.data[0]
      expect(premierLeague.id).toBe('8')
      expect(premierLeague.name).toBe('Premier League')
      expect(premierLeague.logo).toBe('https://example.com/premier-league-logo.png')
      expect(premierLeague.country.name).toBe('England')
      expect(premierLeague.current_season.name).toBe('2023-24')

      // Verify fetcher was called with correct parameters
      expect(mockLeagueListDataFetcher.getLeagues).toHaveBeenCalledWith({
        page: 1,
        limit: 50,
        countryId: undefined,
        search: undefined,
        season: undefined
      })
    })

    it('should handle pagination query parameters correctly', async () => {
      const request = createLeagueRequest('', '', {
        queryParams: {
          page: '2',
          limit: '25'
        }
      })

      mockLeagueListDataFetcher.getLeagues.mockResolvedValue({
        data: [],
        meta: {
          pagination: {
            page: 2,
            limit: 25,
            totalItems: 0,
            totalPages: 0
          }
        }
      })

      const response = await executeEndpoint(leaguesListEndpoint, request)

      response.expectStatus(200).expectSuccess()

      // Verify fetcher was called with parsed parameters
      expect(mockLeagueListDataFetcher.getLeagues).toHaveBeenCalledWith({
        page: 2,
        limit: 25,
        countryId: undefined,
        search: undefined,
        season: undefined
      })
    })

    it('should apply maximum limit constraint', async () => {
      const request = createLeagueRequest('', '', {
        queryParams: {
          limit: '150' // Above maximum of 100
        }
      })

      mockLeagueListDataFetcher.getLeagues.mockResolvedValue({
        data: [],
        meta: {
          pagination: {
            page: 1,
            limit: 100, // Should be capped at 100
            totalItems: 0,
            totalPages: 0
          }
        }
      })

      await executeEndpoint(leaguesListEndpoint, request)

      // Verify limit was capped at 100
      expect(mockLeagueListDataFetcher.getLeagues).toHaveBeenCalledWith({
        page: 1,
        limit: 100, // Capped at maximum
        countryId: undefined,
        search: undefined,
        season: undefined
      })
    })

    it('should handle filter parameters correctly', async () => {
      const request = createLeagueRequest('', '', {
        queryParams: {
          country_id: '1',
          search: 'Premier',
          season: '2023-24'
        }
      })

      mockLeagueListDataFetcher.getLeagues.mockResolvedValue({
        data: [
          {
            id: '8',
            name: 'Premier League',
            logo: 'https://example.com/premier-league-logo.png',
            country: {
              id: '1',
              name: 'England',
              flag: 'https://example.com/england-flag.png'
            },
            current_season: {
              id: '20',
              name: '2023-24'
            }
          }
        ],
        meta: {
          pagination: {
            page: 1,
            limit: 50,
            totalItems: 1,
            totalPages: 1
          }
        }
      })

      const response = await executeEndpoint(leaguesListEndpoint, request)

      response.expectStatus(200).expectSuccess()

      // Verify fetcher was called with filter parameters
      expect(mockLeagueListDataFetcher.getLeagues).toHaveBeenCalledWith({
        page: 1,
        limit: 50,
        countryId: '1',
        search: 'Premier',
        season: '2023-24'
      })

      // Verify filtered results
      expect(response.data.data).toHaveLength(1)
      expect(response.data.data[0].name).toBe('Premier League')
      expect(response.data.data[0].country.id).toBe('1')
    })

    it('should handle alternative country_id parameter name (countryId)', async () => {
      const request = createLeagueRequest('', '', {
        queryParams: {
          countryId: '2' // Alternative parameter name
        }
      })

      mockLeagueListDataFetcher.getLeagues.mockResolvedValue({
        data: [],
        meta: {
          pagination: {
            page: 1,
            limit: 50,
            totalItems: 0,
            totalPages: 0
          }
        }
      })

      await executeEndpoint(leaguesListEndpoint, request)

      // Verify countryId parameter is mapped correctly
      expect(mockLeagueListDataFetcher.getLeagues).toHaveBeenCalledWith({
        page: 1,
        limit: 50,
        countryId: '2',
        search: undefined,
        season: undefined
      })
    })

    it('should prefer country_id over countryId when both are provided', async () => {
      const request = createLeagueRequest('', '', {
        queryParams: {
          country_id: '1',
          countryId: '2' // Should be ignored in favor of country_id
        }
      })

      mockLeagueListDataFetcher.getLeagues.mockResolvedValue({
        data: [],
        meta: {
          pagination: {
            page: 1,
            limit: 50,
            totalItems: 0,
            totalPages: 0
          }
        }
      })

      await executeEndpoint(leaguesListEndpoint, request)

      // Verify country_id takes precedence
      expect(mockLeagueListDataFetcher.getLeagues).toHaveBeenCalledWith({
        page: 1,
        limit: 50,
        countryId: '1', // Should use country_id value
        search: undefined,
        season: undefined
      })
    })

    it('should handle general data fetcher errors gracefully', async () => {
      mockLeagueListDataFetcher.getLeagues.mockRejectedValue(new Error('Database connection failed'))
      
      const request = createLeagueRequest('', '')
      const response = await executeEndpoint(leaguesListEndpoint, request)

      response.expectStatus(500).expectError('An unexpected error occurred while fetching leagues data')
    })

    it('should handle invalid URL format', async () => {
      const request = {
        url: null,
        method: 'GET',
        headers: new Headers(),
        payload: null,
        user: null,
        locale: 'en',
        fallbackLocale: 'en',
        t: jest.fn(),
        i18n: {} as any,
        context: {},
        responseType: 'json',
      } as any

      const response = await executeEndpoint(leaguesListEndpoint, request)
      response.expectStatus(400).expectError('Invalid request URL')
    })

    it('should handle empty leagues data', async () => {
      mockLeagueListDataFetcher.getLeagues.mockResolvedValue({
        data: [],
        meta: {
          pagination: {
            page: 1,
            limit: 50,
            totalItems: 0,
            totalPages: 0
          }
        }
      })

      const request = createLeagueRequest('', '')
      const response = await executeEndpoint(leaguesListEndpoint, request)

      response.expectStatus(200).expectSuccess()
      leagueEndpointAssertions.assertLeaguesListResponse(response)
      
      expect(response.data.data).toEqual([])
      expect(response.data.meta.pagination.totalItems).toBe(0)
      expect(response.data.meta.pagination.totalPages).toBe(0)
    })

    it('should handle pagination parameters correctly', async () => {
      const testCases = [
        { page: '0', limit: '0', expectedPage: 0, expectedLimit: 0 },
        { page: 'invalid', limit: 'invalid', expectedPage: NaN, expectedLimit: NaN },
        { page: '5', limit: '75', expectedPage: 5, expectedLimit: 75 }
      ]

      for (const testCase of testCases) {
        jest.clearAllMocks()
        
        const request = createLeagueRequest('', '', {
          queryParams: {
            page: testCase.page,
            limit: testCase.limit
          }
        })

        mockLeagueListDataFetcher.getLeagues.mockResolvedValue({
          data: [],
          meta: {
            pagination: {
              page: testCase.expectedPage,
              limit: testCase.expectedLimit,
              totalItems: 0,
              totalPages: 0
            }
          }
        })

        await executeEndpoint(leaguesListEndpoint, request)

        expect(mockLeagueListDataFetcher.getLeagues).toHaveBeenCalledWith({
          page: testCase.expectedPage,
          limit: testCase.expectedLimit,
          countryId: undefined,
          search: undefined,
          season: undefined
        })
      }
    })

    it('should return leagues with complete information', async () => {
      const mockCompleteLeaguesData = {
        data: [
          {
            id: '8',
            name: 'Premier League',
            logo: 'https://example.com/premier-league-logo.png',
            country: {
              id: '1',
              name: 'England',
              flag: 'https://example.com/england-flag.png'
            },
            current_season: {
              id: '20',
              name: '2023-24'
            }
          },
          {
            id: '11',
            name: 'La Liga',
            logo: 'https://example.com/la-liga-logo.png',
            country: {
              id: '2',
              name: 'Spain',
              flag: 'https://example.com/spain-flag.png'
            },
            current_season: {
              id: '20',
              name: '2023-24'
            }
          },
          {
            id: '15',
            name: 'UEFA Champions League',
            logo: 'https://example.com/ucl-logo.png',
            country: undefined, // International competition
            current_season: {
              id: '20',
              name: '2023-24'
            }
          }
        ],
        meta: {
          pagination: {
            page: 1,
            limit: 50,
            totalItems: 3,
            totalPages: 1
          }
        }
      }

      mockLeagueListDataFetcher.getLeagues.mockResolvedValue(mockCompleteLeaguesData)

      const request = createLeagueRequest('', '')
      const response = await executeEndpoint(leaguesListEndpoint, request)

      response.expectStatus(200).expectSuccess()
      leagueEndpointAssertions.assertLeaguesListResponse(response)

      // Verify all leagues are present with complete data
      expect(response.data.data).toHaveLength(3)
      
      // Check each league has required fields
      response.data.data.forEach((league: any) => {
        expect(league).toHaveProperty('id')
        expect(league).toHaveProperty('name')
        expect(league).toHaveProperty('current_season')
        expect(typeof league.id).toBe('string')
        expect(typeof league.name).toBe('string')
      })

      // Verify specific league data
      const premierLeague = response.data.data.find((league: any) => league.name === 'Premier League')
      expect(premierLeague.country.name).toBe('England')
      expect(premierLeague.current_season.name).toBe('2023-24')

      const laLiga = response.data.data.find((league: any) => league.name === 'La Liga')
      expect(laLiga.country.name).toBe('Spain')

      const ucl = response.data.data.find((league: any) => league.name === 'UEFA Champions League')
      expect(ucl.country).toBeUndefined() // International competition
    })

    it('should handle search functionality', async () => {
      const searchTerm = 'Champions'
      
      const mockSearchResults = {
        data: [
          {
            id: '15',
            name: 'UEFA Champions League',
            logo: 'https://example.com/ucl-logo.png',
            country: undefined,
            current_season: {
              id: '20',
              name: '2023-24'
            }
          }
        ],
        meta: {
          pagination: {
            page: 1,
            limit: 50,
            totalItems: 1,
            totalPages: 1
          }
        }
      }

      mockLeagueListDataFetcher.getLeagues.mockResolvedValue(mockSearchResults)

      const request = createLeagueRequest('', '', {
        queryParams: { search: searchTerm }
      })
      const response = await executeEndpoint(leaguesListEndpoint, request)

      response.expectStatus(200).expectSuccess()
      leagueEndpointAssertions.assertLeaguesListResponse(response)

      // Verify search results
      expect(response.data.data).toHaveLength(1)
      expect(response.data.data[0].name).toContain('Champions')
      
      // Verify fetcher was called with search parameter
      expect(mockLeagueListDataFetcher.getLeagues).toHaveBeenCalledWith({
        page: 1,
        limit: 50,
        countryId: undefined,
        search: searchTerm,
        season: undefined
      })
    })

    it('should handle country filtering', async () => {
      const countryId = '1' // England
      
      const mockCountryFilterResults = {
        data: [
          {
            id: '8',
            name: 'Premier League',
            logo: 'https://example.com/premier-league-logo.png',
            country: {
              id: '1',
              name: 'England',
              flag: 'https://example.com/england-flag.png'
            },
            current_season: {
              id: '20',
              name: '2023-24'
            }
          },
          {
            id: '9',
            name: 'Championship',
            logo: 'https://example.com/championship-logo.png',
            country: {
              id: '1',
              name: 'England',
              flag: 'https://example.com/england-flag.png'
            },
            current_season: {
              id: '20',
              name: '2023-24'
            }
          }
        ],
        meta: {
          pagination: {
            page: 1,
            limit: 50,
            totalItems: 2,
            totalPages: 1
          }
        }
      }

      mockLeagueListDataFetcher.getLeagues.mockResolvedValue(mockCountryFilterResults)

      const request = createLeagueRequest('', '', {
        queryParams: { country_id: countryId }
      })
      const response = await executeEndpoint(leaguesListEndpoint, request)

      response.expectStatus(200).expectSuccess()
      leagueEndpointAssertions.assertLeaguesListResponse(response)

      // Verify country filter results
      expect(response.data.data).toHaveLength(2)
      response.data.data.forEach((league: any) => {
        expect(league.country.id).toBe('1')
        expect(league.country.name).toBe('England')
      })
      
      // Verify fetcher was called with country filter
      expect(mockLeagueListDataFetcher.getLeagues).toHaveBeenCalledWith({
        page: 1,
        limit: 50,
        countryId: countryId,
        search: undefined,
        season: undefined
      })
    })
  })
})