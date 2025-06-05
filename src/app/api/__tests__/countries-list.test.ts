import { describe, it, expect, jest, beforeEach } from '@jest/globals'

// Mock the auth module before importing anything else
jest.mock('@/utilities/auth', () => ({
  createAuthMiddleware: () => () => Promise.resolve(null),
}))

// Mock the data fetcher
jest.mock('../v1/services/countryDataFetcher', () => ({
  countryDataFetcher: {
    getCountries: jest.fn(),
  },
}))

// Now import after mocking
import { countryDataFetcher } from '../v1/services/countryDataFetcher'
import getCountriesPage from '../v1/countriesList'

describe('Countries List API', () => {
  const mockCountriesData = {
    countries: [
      {
        id: 32,
        name: 'Spain',
        official_name: 'Kingdom of Spain',
        fifa_name: 'ESP',
        iso2: 'ES',
        iso3: 'ESP',
        continent_id: 1,
        flag_url: 'https://cdn.sportmonks.com/images/countries/png/short/es.png',
        coordinates: {
          latitude: '40.396026611328125',
          longitude: '-3.550692558288574',
        },
        borders: ['PT', 'FR', 'AD'],
      },
      {
        id: 3483,
        name: 'United States',
        official_name: 'United States of America',
        fifa_name: 'USA',
        iso2: 'US',
        iso3: 'USA',
        continent_id: 6,
        flag_url: 'https://cdn.sportmonks.com/images/countries/png/short/us.png',
        coordinates: {
          latitude: '39.44325637817383',
          longitude: '-98.95733642578125',
        },
        borders: ['CAN', 'MEX'],
      },
    ],
    pagination: {
      current_page: 1,
      per_page: 50,
      total: 242,
      total_pages: 5,
      has_next_page: true,
      has_prev_page: false,
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return paginated countries list with default parameters', async () => {
    jest.mocked(countryDataFetcher.getCountries).mockResolvedValue(mockCountriesData)

    const mockRequest = {
      url: 'http://localhost:3000/api/v1/countries',
    } as any

    const response = await getCountriesPage.handler(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockCountriesData)
    expect(countryDataFetcher.getCountries).toHaveBeenCalledWith({
      page: 1,
      limit: 50,
      search: undefined,
      continentId: undefined,
      sort: 'name',
    })
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600, s-maxage=3600')
  })

  it('should handle custom pagination parameters', async () => {
    jest.mocked(countryDataFetcher.getCountries).mockResolvedValue(mockCountriesData)

    const mockRequest = {
      url: 'http://localhost:3000/api/v1/countries?page=2&limit=25',
    } as any

    const response = await getCountriesPage.handler(mockRequest)

    expect(response.status).toBe(200)
    expect(countryDataFetcher.getCountries).toHaveBeenCalledWith({
      page: 2,
      limit: 25,
      search: undefined,
      continentId: undefined,
      sort: 'name',
    })
  })

  it('should handle search parameter', async () => {
    jest.mocked(countryDataFetcher.getCountries).mockResolvedValue(mockCountriesData)

    const mockRequest = {
      url: 'http://localhost:3000/api/v1/countries?search=spain',
    } as any

    const response = await getCountriesPage.handler(mockRequest)

    expect(response.status).toBe(200)
    expect(countryDataFetcher.getCountries).toHaveBeenCalledWith({
      page: 1,
      limit: 50,
      search: 'spain',
      continentId: undefined,
      sort: 'name',
    })
  })

  it('should handle continent filter', async () => {
    jest.mocked(countryDataFetcher.getCountries).mockResolvedValue(mockCountriesData)

    const mockRequest = {
      url: 'http://localhost:3000/api/v1/countries?continent_id=1',
    } as any

    const response = await getCountriesPage.handler(mockRequest)

    expect(response.status).toBe(200)
    expect(countryDataFetcher.getCountries).toHaveBeenCalledWith({
      page: 1,
      limit: 50,
      search: undefined,
      continentId: 1,
      sort: 'name',
    })
  })

  it('should handle sort parameter', async () => {
    jest.mocked(countryDataFetcher.getCountries).mockResolvedValue(mockCountriesData)

    const mockRequest = {
      url: 'http://localhost:3000/api/v1/countries?sort=-name',
    } as any

    const response = await getCountriesPage.handler(mockRequest)

    expect(response.status).toBe(200)
    expect(countryDataFetcher.getCountries).toHaveBeenCalledWith({
      page: 1,
      limit: 50,
      search: undefined,
      continentId: undefined,
      sort: '-name',
    })
  })

  it('should enforce maximum limit of 100', async () => {
    jest.mocked(countryDataFetcher.getCountries).mockResolvedValue(mockCountriesData)

    const mockRequest = {
      url: 'http://localhost:3000/api/v1/countries?limit=200',
    } as any

    const response = await getCountriesPage.handler(mockRequest)

    expect(response.status).toBe(200)
    expect(countryDataFetcher.getCountries).toHaveBeenCalledWith({
      page: 1,
      limit: 100,
      search: undefined,
      continentId: undefined,
      sort: 'name',
    })
  })

  it('should handle errors gracefully', async () => {
    jest.mocked(countryDataFetcher.getCountries).mockRejectedValue(new Error('Database error'))

    const mockRequest = {
      url: 'http://localhost:3000/api/v1/countries',
    } as any

    const response = await getCountriesPage.handler(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({
      error: 'An unexpected error occurred while fetching countries data',
    })
  })

  it('should handle invalid request URL', async () => {
    const mockRequest = {
      url: null,
    } as any

    const response = await getCountriesPage.handler(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'Invalid request URL' })
  })
})